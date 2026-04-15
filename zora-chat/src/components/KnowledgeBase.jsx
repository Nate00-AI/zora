'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Upload, Trash2, FileText, BookOpen } from 'lucide-react';

export default function KnowledgeBase({ onBack, ragDocuments, setRagDocuments }) {
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const inputRef = useRef(null);

  async function uploadFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'md', 'pdf'].includes(ext)) {
      setUploadError(`Unsupported file type ".${ext}". Please upload .txt, .md, or .pdf.`);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('http://localhost:8000/api/rag/documents', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Upload failed (${res.status})`);
      }
      const uploaded = await res.json();
      setRagDocuments((prev) => [
        ...prev,
        {
          doc_id:      uploaded.doc_id,
          file_name:   uploaded.file_name,
          chunk_count: uploaded.chunk_count,
          uploaded_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleFileInput(e) {
    uploadFile(e.target.files?.[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files?.[0]);
  }

  async function handleDelete(docId) {
    try {
      await fetch(`http://localhost:8000/api/rag/documents/${docId}`, { method: 'DELETE' });
      setRagDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Back to chat"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            Knowledge Base
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Upload documents for Zora to reference in chat
          </p>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 max-w-2xl space-y-6">

        {/* ── Drop zone ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl flex flex-col items-center justify-center gap-3 py-10 px-6 cursor-pointer transition-colors"
          style={{
            border:     `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            background: dragOver ? 'var(--bg-sidebar-hover)' : 'var(--bg-sidebar)',
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{ background: 'var(--bg-sidebar-hover)' }}
          >
            <Upload size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {uploading ? 'Uploading…' : 'Click or drag & drop to upload'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Supports .txt, .md, .pdf
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.pdf"
            className="hidden"
            onChange={handleFileInput}
            disabled={uploading}
          />
        </div>

        {uploadError && (
          <p
            className="text-sm px-4 py-3 rounded-xl"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {uploadError}
          </p>
        )}

        {/* ── Document list ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Uploaded Documents
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--bg-sidebar)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {ragDocuments?.length ?? 0}
            </span>
          </div>

          {ragDocuments && ragDocuments.length > 0 ? (
            <ul className="space-y-2">
              {ragDocuments.map((doc) => (
                <li
                  key={doc.doc_id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                    style={{ background: 'var(--bg-sidebar-hover)' }}
                  >
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {doc.file_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''} · {new Date(doc.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.doc_id)}
                    aria-label={`Delete ${doc.file_name}`}
                    className="p-2 rounded-lg transition-colors shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl"
              style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
            >
              <BookOpen size={32} style={{ color: 'var(--text-muted)' }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  No documents yet
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Upload files above to build your knowledge base
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
