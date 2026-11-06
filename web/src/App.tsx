import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import DocumentsPage from "./pages/DocumentsPage";
import InspectorPage from "./pages/InspectorPage";
import AskPage from "./pages/AskPage";

// Tiny hash router: "#/ask" opens search, "#/inspect/<id>" the Inspector, anything else the Documents view
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
  const asking = hash === "#/ask";

  const navLink = (href: string, label: string, active: boolean) => (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-cream/15 text-cream" : "text-cream/70 hover:text-cream"
      }`}
    >
      {label}
    </a>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-forest text-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2.5">
          <a href="#/" className="flex items-center gap-2.5 hover:opacity-90" aria-label="AUI Assistant home">
            <GraduationCap size={22} strokeWidth={1.75} />
            <span className="font-semibold tracking-tight">AUI Assistant</span>
          </a>
          <nav className="ml-auto flex items-center gap-1">
            {navLink("#/ask", "Ask", asking)}
            {navLink("#/", "Knowledge base", !asking)}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {inspectId ? <InspectorPage id={inspectId} /> : asking ? <AskPage /> : <DocumentsPage />}
      </main>
    </div>
  );
}

export default App;
