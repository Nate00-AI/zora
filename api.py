from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from openai import OpenAI
from dotenv import load_dotenv
import os
import io
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import chromadb
import pypdf
import tiktoken

load_dotenv()

# ── OpenAI client ────────────────────────────────────────────────────────────
client = OpenAI(
    organization=os.environ["OPENAI_ORG_ID"],
    project=os.environ["OPENAI_PROJECT"],
    api_key=os.environ["OPENAI_API_KEY"],
)

# ── ChromaDB ─────────────────────────────────────────────────────────────────
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection("zora_rag")

# ── Document metadata store ───────────────────────────────────────────────────
DOCS_FILE = Path("./rag_documents.json")

def load_documents() -> list[dict]:
    if DOCS_FILE.exists():
        try:
            return json.loads(DOCS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return []
    return []

def save_documents(docs: list[dict]) -> None:
    DOCS_FILE.write_text(json.dumps(docs, indent=2, ensure_ascii=False), encoding="utf-8")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Zora API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_methods=["POST", "GET", "DELETE", "PUT"],
    allow_headers=["Content-Type"],
)

# ── Request / Response schemas ────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

ALLOWED_MODELS = {"gpt-3.5-turbo", "gpt-4o-mini", "gpt-4o"}

ALLOWED_MODES = {"chat", "ask"}

class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []
    include_rag: bool = False
    temperature: float = 0.7
    model: str = "gpt-3.5-turbo"
    mode: str = "chat"  # "chat" enables calendar tools; "ask" is read-only

    @field_validator("message")
    @classmethod
    def message_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Message must be at least 2 characters.")
        return v.strip()

    @field_validator("temperature")
    @classmethod
    def temperature_range(cls, v: float) -> float:
        if not (0.0 <= v <= 2.0):
            raise ValueError("Temperature must be between 0.0 and 2.0.")
        return round(v, 2)

    @field_validator("model")
    @classmethod
    def model_allowed(cls, v: str) -> str:
        if v not in ALLOWED_MODELS:
            raise ValueError(f"Model must be one of: {', '.join(sorted(ALLOWED_MODELS))}")
        return v

    @field_validator("mode")
    @classmethod
    def mode_allowed(cls, v: str) -> str:
        if v not in ALLOWED_MODES:
            raise ValueError("Mode must be 'chat' or 'ask'.")
        return v

class ChatResponse(BaseModel):
    content: str
    sources: list[str] = []
    prompt_tokens: int = 0
    completion_tokens: int = 0
    calendar_actions: list[dict] = []

class DocumentMeta(BaseModel):
    doc_id: str
    file_name: str
    uploaded_at: str
    chunk_count: int

class UploadResponse(BaseModel):
    doc_id: str
    file_name: str
    chunk_count: int

class DocumentsResponse(BaseModel):
    documents: list[DocumentMeta]

# ── RAG helpers ───────────────────────────────────────────────────────────────
CHUNK_TOKENS   = 250
OVERLAP_TOKENS = 30
EMBED_MODEL    = "text-embedding-3-small"

def chunk_text(text: str) -> list[str]:
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    chunks: list[str] = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_TOKENS, len(tokens))
        chunks.append(enc.decode(tokens[start:end]))
        if end == len(tokens):
            break
        start += CHUNK_TOKENS - OVERLAP_TOKENS
    return chunks

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in (".txt", ".md"):
        return file_bytes.decode("utf-8", errors="replace")
    if ext == ".pdf":
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    raise ValueError(f"Unsupported file type: {ext}")

def embed_texts(texts: list[str]) -> list[list[float]]:
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [item.embedding for item in resp.data]

# ── POST /api/rag/documents ───────────────────────────────────────────────────
@app.post("/api/rag/documents", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".txt", ".md", ".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: .txt .md .pdf",
        )

    raw = await file.read()
    try:
        text = extract_text(raw, file.filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Text extraction failed: {str(e)}")

    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=422, detail="Document produced no text chunks.")

    try:
        embeddings = embed_texts(chunks)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding error: {str(e)}")

    doc_id = str(uuid.uuid4())
    ids    = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metas  = [{"doc_id": doc_id, "file_name": file.filename} for _ in chunks]

    collection.upsert(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metas)

    docs = load_documents()
    docs.append({
        "doc_id":      doc_id,
        "file_name":   file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "chunk_count": len(chunks),
    })
    save_documents(docs)

    return UploadResponse(doc_id=doc_id, file_name=file.filename, chunk_count=len(chunks))

# ── GET /api/rag/documents ────────────────────────────────────────────────────
@app.get("/api/rag/documents", response_model=DocumentsResponse)
def list_documents():
    return DocumentsResponse(documents=load_documents())

# ── DELETE /api/rag/documents/{doc_id} ───────────────────────────────────────
@app.delete("/api/rag/documents/{doc_id}")
def delete_document(doc_id: str):
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
    docs = [d for d in load_documents() if d["doc_id"] != doc_id]
    save_documents(docs)
    return {"ok": True}

# ── Calendar helpers ─────────────────────────────────────────────────────────
CALENDAR_FILE = Path("./calendar_events.json")

def load_calendar() -> list[dict]:
    if CALENDAR_FILE.exists():
        try:
            return json.loads(CALENDAR_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return []
    return []

def save_calendar(events: list[dict]) -> None:
    CALENDAR_FILE.write_text(json.dumps(events, indent=2, ensure_ascii=False), encoding="utf-8")

class CreateEventRequest(BaseModel):
    title: str
    date: str               # YYYY-MM-DD
    time: str               # HH:MM
    description: str = ""
    reminder_minutes: int = 0

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty.")
        return v.strip()

class CalendarEventModel(BaseModel):
    id: str
    title: str
    date: str
    time: str
    description: str = ""
    reminder_minutes: int = 0
    created_at: str

class CalendarEventsResponse(BaseModel):
    events: list[CalendarEventModel]

# ── GET /api/calendar/events ──────────────────────────────────────────────────
@app.get("/api/calendar/events", response_model=CalendarEventsResponse)
def get_calendar_events():
    return CalendarEventsResponse(events=load_calendar())

# ── POST /api/calendar/events ─────────────────────────────────────────────────
@app.post("/api/calendar/events", response_model=CalendarEventModel)
def create_calendar_event(req: CreateEventRequest):
    event = {
        "id":               str(uuid.uuid4()),
        "title":            req.title,
        "date":             req.date,
        "time":             req.time,
        "description":      req.description,
        "reminder_minutes": req.reminder_minutes,
        "created_at":       datetime.now(timezone.utc).isoformat(),
    }
    events = load_calendar()
    events.append(event)
    save_calendar(events)
    return event

# ── DELETE /api/calendar/events/{event_id} ────────────────────────────────────
@app.delete("/api/calendar/events/{event_id}")
def delete_calendar_event(event_id: str):
    events = [e for e in load_calendar() if e["id"] != event_id]
    save_calendar(events)
    return {"ok": True}

# ── Calendar tools for function calling ─────────────────────────────────────
CALENDAR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_calendar_event",
            "description": "Add a meeting or event to the user's calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title":            {"type": "string",  "description": "Event title"},
                    "date":             {"type": "string",  "description": "Date in YYYY-MM-DD format"},
                    "time":             {"type": "string",  "description": "Time in HH:MM 24-hour format"},
                    "description":      {"type": "string",  "description": "Optional details or agenda"},
                    "reminder_minutes": {"type": "integer", "description": "Minutes before event to remind (0 = none)"},
                },
                "required": ["title", "date", "time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_calendar_event",
            "description": "Remove a calendar event by its id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "event_id": {"type": "string", "description": "The id of the event to delete"},
                },
                "required": ["event_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_calendar_events",
            "description": "List all calendar events so you can find an event to delete or reference by title/date.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

# ── POST /api/chat ────────────────────────────────────────────────────────────
RAG_SIMILARITY_THRESHOLD = 1.5   # squared L2 distance; ≈ cosine_sim > 0.25 (filters truly irrelevant chunks)
RAG_CONTEXT_TOKEN_BUDGET = 1500  # max tokens injected as RAG context
HISTORY_LIMIT_DEFAULT   = 10
HISTORY_LIMIT_RAG        = 4    # fewer history turns when RAG adds context

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    history_limit = HISTORY_LIMIT_RAG if req.include_rag else HISTORY_LIMIT_DEFAULT
    messages = [m.model_dump() for m in req.history] + [{"role": "user", "content": req.message}]
    messages = messages[-history_limit:]
    sources: list[str] = []

    # Build the base system message (always present)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    base_system = (
        f"Today's date is {today_str}. "
        "You are Zora, a helpful AI assistant. "
        "You can manage the user's calendar using the available tools."
    )

    if req.include_rag and collection.count() > 0:
        try:
            q_embed = embed_texts([req.message])[0]
            results = collection.query(
                query_embeddings=[q_embed],
                n_results=min(5, collection.count()),
                include=["documents", "metadatas", "distances"],
            )
            raw_chunks    = results["documents"][0] if results["documents"] else []
            raw_metadatas = results["metadatas"][0]  if results["metadatas"]  else []
            raw_distances = results["distances"][0]  if results["distances"]  else []

            print(f"[RAG] query='{req.message[:60]}' distances={[round(d,4) for d in raw_distances]} threshold={RAG_SIMILARITY_THRESHOLD}")

            # Filter out chunks that exceed the similarity threshold (too dissimilar)
            relevant = [
                (chunk, meta)
                for chunk, meta, dist in zip(raw_chunks, raw_metadatas, raw_distances)
                if dist <= RAG_SIMILARITY_THRESHOLD
            ]

            if relevant:
                # Cap context to token budget
                enc = tiktoken.get_encoding("cl100k_base")
                kept: list[str] = []
                kept_metas: list[dict] = []
                total_tokens = 0
                for chunk, meta in relevant:
                    t = len(enc.encode(chunk))
                    if total_tokens + t > RAG_CONTEXT_TOKEN_BUDGET:
                        break
                    kept.append(chunk)
                    kept_metas.append(meta)
                    total_tokens += t

                if kept:
                    context_text = "\n\n".join(kept)
                    # Merge RAG context into the single system message so the model
                    # treats it as primary instruction rather than a secondary message.
                    base_system += (
                        "\n\nYou have been provided with relevant excerpts from the user's "
                        "knowledge base. Use them to answer accurately. Do not mention that "
                        "you were given context unless the user asks.\n\n"
                        f"Knowledge base context:\n{context_text}"
                    )
                    sources = list({m["file_name"] for m in kept_metas if "file_name" in m})
        except Exception as e:
            print(f"[RAG] Error during retrieval: {e}")

    messages = [{"role": "system", "content": base_system}] + messages

    calendar_actions: list[dict] = []
    prompt_tokens = 0
    completion_tokens = 0

    # Build kwargs shared by all completions calls; only attach tools in chat mode
    create_kwargs: dict = {"model": req.model, "temperature": req.temperature}
    if req.mode == "chat":
        create_kwargs["tools"] = CALENDAR_TOOLS
        create_kwargs["tool_choice"] = "auto"

    try:
        response = client.chat.completions.create(messages=messages, **create_kwargs)

        # Tool-use loop — only reachable in chat mode (ask mode never returns tool_calls)
        while response.choices[0].finish_reason == "tool_calls":
            tool_calls = response.choices[0].message.tool_calls
            messages.append(response.choices[0].message)
            if response.usage:
                prompt_tokens     += response.usage.prompt_tokens
                completion_tokens += response.usage.completion_tokens

            for tc in tool_calls:
                args = json.loads(tc.function.arguments)
                if tc.function.name == "add_calendar_event":
                    event_req = CreateEventRequest(**args)
                    new_event = create_calendar_event(event_req)
                    result = json.dumps({"ok": True, "event_id": new_event["id"]})
                    calendar_actions.append({"action": "added", "title": args.get("title")})
                elif tc.function.name == "delete_calendar_event":
                    delete_calendar_event(args["event_id"])
                    result = json.dumps({"ok": True})
                    calendar_actions.append({"action": "deleted", "event_id": args["event_id"]})
                elif tc.function.name == "list_calendar_events":
                    result = json.dumps({"events": load_calendar()})
                else:
                    result = json.dumps({"error": "unknown tool"})

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

            response = client.chat.completions.create(messages=messages, **create_kwargs)

        if response.usage:
            prompt_tokens     += response.usage.prompt_tokens
            completion_tokens += response.usage.completion_tokens

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {str(e)}")

    content = response.choices[0].message.content or ""
    return ChatResponse(
        content=content.strip(),
        sources=sources,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        calendar_actions=calendar_actions,
    )


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}
