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
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["Content-Type"],
)

# ── Request / Response schemas ────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []
    include_rag: bool = False

    @field_validator("message")
    @classmethod
    def message_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Message must be at least 2 characters.")
        return v.strip()

class ChatResponse(BaseModel):
    content: str
    sources: list[str] = []

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
CHUNK_TOKENS   = 800
OVERLAP_TOKENS = 100
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

# ── POST /api/chat ────────────────────────────────────────────────────────────
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    messages = [m.model_dump() for m in req.history] + [{"role": "user", "content": req.message}]
    messages = messages[-10:]  # Keep only the last 10 messages
    sources: list[str] = []

    if req.include_rag and collection.count() > 0:
        try:
            q_embed = embed_texts([req.message])[0]
            results = collection.query(
                query_embeddings=[q_embed],
                n_results=min(5, collection.count()),
                include=["documents", "metadatas"],
            )
            chunks    = results["documents"][0] if results["documents"] else []
            metadatas = results["metadatas"][0]  if results["metadatas"]  else []
            if chunks:
                context_text = "\n\n".join(chunks)
                system_msg = {
                    "role":    "system",
                    "content": (
                        "Use the following context to answer the user's question. "
                        "If the context is not relevant, answer from your general knowledge.\n\n"
                        f"{context_text}"
                    ),
                }
                messages = [system_msg] + messages
                sources = list({m["file_name"] for m in metadatas if "file_name" in m})
        except Exception:
            pass  # fall back to normal chat silently

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {str(e)}")

    content = response.choices[0].message.content.strip()
    return ChatResponse(content=content, sources=sources)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}
