import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import DocumentsPage from "./pages/DocumentsPage";
import InspectorPage from "./pages/InspectorPage";

// Tiny hash router: "#/inspect/<id>" opens the Inspector, anything else the Documents view
function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function App() {
  const hash = useHash();
  const inspectId = hash.startsWith("#/inspect/") ? hash.slice("#/inspect/".length) : null;

  return (
    <div className="min-h-screen">
      <header className="bg-forest text-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2.5">
          <a href="#/" className="flex items-center gap-2.5 hover:opacity-90" aria-label="AUI Assistant home">
            <GraduationCap size={22} strokeWidth={1.75} />
            <span className="font-semibold tracking-tight">AUI Assistant</span>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {inspectId ? <InspectorPage id={inspectId} /> : <DocumentsPage />}
      </main>
    </div>
  );
}

export default App;
