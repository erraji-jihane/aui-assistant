import { useState } from "react";

function App() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("http://localhost:4000/api/health");
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult("Failed to reach API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800">AUI Assistant</h1>
      <p className="text-gray-600">M0 - Health check</p>
      <button
        onClick={checkHealth}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Checking..." : "Check Health"}
      </button>
      {result && (
        <pre className="bg-white p-4 rounded shadow text-sm">{result}</pre>
      )}
    </div>
  );
}

export default App;