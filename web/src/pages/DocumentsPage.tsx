import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// The shape of one item from GET /api/documents
type DocumentRow = {
  id: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
  chunkCount: number;
};

function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);


  const loadDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documents`);
      setDocs(await res.json());
      setError("");
    } catch {
      setError("Failed to reach API");
    }
  };


  const handleUpload = async () => {
    if (!file) return;
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
      setFile(null);
      await loadDocuments();
    } catch {
      setError("Failed to reach API");
    } finally {
      setUploading(false);
    }
  };


  // Load the list once, when the page opens
  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">AUI Assistant · Documents</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}
        <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded shadow">
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>


        <table className="w-full bg-white rounded shadow text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Filename</th>
              <th className="p-3">Size</th>
              <th className="p-3">Chunks</th>
              <th className="p-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id} className="border-b last:border-0">
                <td className="p-3">{doc.filename}</td>
                <td className="p-3">{Math.round(doc.sizeBytes / 1024)} KB</td>
                <td className="p-3">{doc.chunkCount}</td>
                <td className="p-3">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {docs.length === 0 && !error && (
              <tr>
                <td className="p-3 text-gray-400" colSpan={4}>No documents yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DocumentsPage;
