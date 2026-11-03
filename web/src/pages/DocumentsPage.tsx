import { useEffect, useRef, useState } from "react";
import { AlertCircle, Binary, Check, FileText, Layers, Loader2, ScanSearch, Scissors, Search, Trash2, Upload, X } from "lucide-react";
import { Pipeline, type PipelineStep } from "../components/Pipeline";
import { API_URL, formatBytes, formatDate, type DocumentRow } from "../lib/api";

const HOW_IT_WORKS: PipelineStep[] = [
  {
    icon: <FileText size={17} />,
    title: "Read",
    text: "The text is pulled out of the PDF.",
  },
  {
    icon: <Scissors size={17} />,
    title: "Split",
    text: "It's split into short, overlapping passages, so answers can point to the exact part.",
  },
  {
    icon: <Binary size={17} />,
    title: "Convert",
    text: "An AI model turns each passage into numbers (a vector) that capture its meaning.",
  },
  {
    icon: <Search size={17} />,
    title: "Search",
    text: "A student's question is converted the same way and matched to the closest passages.",
  },
];

async function fetchDocuments(): Promise<DocumentRow[]> {
  const res = await fetch(`${API_URL}/api/documents`);
  if (!res.ok) throw new Error(`GET /api/documents failed with status ${res.status}`);
  return res.json();
}

function IconButton(props: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const tone =
    props.tone === "danger"
      ? "text-muted hover:text-terracotta hover:bg-terracotta/10"
      : "text-muted hover:text-forest hover:bg-forest-light";
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.label}
      aria-label={props.label}
      className={`p-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 ${tone}`}
    >
      {props.children}
    </button>
  );
}

function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = () =>
    fetchDocuments()
      .then((rows) => {
        setDocs(rows);
        setError("");
      })
      .catch(() => setError("Failed to reach API"))
      .finally(() => setLoaded(true));

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }
      await loadDocuments();
    } catch {
      setError("Failed to reach API");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const deleteDocument = async (id: string) => {
    setConfirmId(null);
    try {
      const res = await fetch(`${API_URL}/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        setError("Delete failed");
        return;
      }
      await loadDocuments();
    } catch {
      setError("Failed to reach API");
    }
  };

  // Load the list once, when the page opens
  useEffect(() => {
    fetchDocuments()
      .then(setDocs)
      .catch(() => setError("Failed to reach API"))
      .finally(() => setLoaded(true));
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !uploading) uploadFile(file);
  };

  const totalPassages = docs.reduce((sum, d) => sum + d.chunkCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The official AUI documents (handbook, catalog, policies) that the assistant searches to answer students'
          questions. It only knows what's uploaded here.
        </p>
      </div>

      <section className="grid grid-cols-3 gap-3">
        {[
          { value: docs.length.toLocaleString(), label: docs.length === 1 ? "Document" : "Documents" },
          { value: totalPassages.toLocaleString(), label: "Searchable passages" },
          { value: "384", label: "Numbers per vector" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white px-4 py-4 sm:px-5">
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted sm:text-sm">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-white p-6">
        <h2 className="mb-5 text-sm font-semibold">What happens when you upload a document</h2>
        <Pipeline layout="row" steps={HOW_IT_WORKS} />
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm text-terracotta">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss"
            title="Dismiss"
            className="ml-auto p-1 rounded hover:bg-terracotta/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
          uploading ? "cursor-wait" : "cursor-pointer"
        } ${dragging ? "border-forest bg-forest-light" : "border-line bg-white hover:border-forest/50"}`}
      >
        {uploading ? (
          <Loader2 size={26} strokeWidth={1.5} className="text-forest animate-spin" />
        ) : (
          <Upload size={26} strokeWidth={1.5} className="text-forest" />
        )}
        <span className="text-sm">
          {uploading ? (
            "Extracting, chunking and embedding…"
          ) : (
            <>
              Add a document: drop a PDF here, or <span className="text-forest font-medium underline underline-offset-2">browse</span>
            </>
          )}
        </span>
        <span className="text-xs text-muted">PDF or TXT · up to 20 MB</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
      </label>

      <ul className="overflow-hidden rounded-xl bg-white divide-y divide-line">
        {docs.map((doc) => (
          <li key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-cream/60">
            <FileText size={18} strokeWidth={1.5} className="text-forest shrink-0" />
            <a
              href={`#/inspect/${doc.id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium hover:text-forest"
              title={doc.filename}
            >
              {doc.filename}
            </a>

            <span
              className="hidden sm:flex items-center gap-1 rounded-md bg-gold-light px-2 py-0.5 text-xs tabular-nums text-ink"
              title={`${doc.chunkCount} passages`}
            >
              <Layers size={12} />
              {doc.chunkCount}
            </span>
            <span className="hidden md:block w-16 text-right text-xs text-muted tabular-nums">
              {formatBytes(doc.sizeBytes)}
            </span>
            <span className="hidden md:block w-24 text-right text-xs text-muted tabular-nums">
              {formatDate(doc.uploadedAt)}
            </span>

            <div className="flex items-center">
              {confirmId === doc.id ? (
                <>
                  <IconButton label="Confirm delete" tone="danger" onClick={() => deleteDocument(doc.id)}>
                    <Check size={16} />
                  </IconButton>
                  <IconButton label="Cancel" onClick={() => setConfirmId(null)}>
                    <X size={16} />
                  </IconButton>
                </>
              ) : (
                <>
                  <IconButton label="Inspect how this document was processed" onClick={() => (window.location.hash = `#/inspect/${doc.id}`)}>
                    <ScanSearch size={16} />
                  </IconButton>
                  <IconButton label="Delete document" tone="danger" onClick={() => setConfirmId(doc.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </>
              )}
            </div>
          </li>
        ))}
        {loaded && docs.length === 0 && !error && (
          <li className="flex flex-col items-center gap-1 px-4 py-10 text-center">
            <FileText size={22} strokeWidth={1.5} className="text-line" />
            <span className="text-sm text-muted">No documents yet. Upload one above.</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default DocumentsPage;
