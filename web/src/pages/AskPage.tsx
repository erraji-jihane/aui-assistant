import { useState, type FormEvent, type KeyboardEvent } from "react";
import { AlertCircle, ArrowRight, Binary, ChevronDown, Hash, Loader2, Scissors, Search } from "lucide-react";
import { API_URL, type SearchResponse, type SearchResult } from "../lib/api";
import { VectorStrip } from "../components/charts";
import { Pipeline, type PipelineStep } from "../components/Pipeline";

const EXAMPLES = ["How do I pay my tuition fees?", "Can I have a car on campus?", "What happens if I cheat on an exam?"];

function processingSteps(data: SearchResponse): PipelineStep[] {
  const { processing: p, results } = data;
  return [
    {
      icon: <Hash size={18} />,
      title: "Tokens counted",
      result: `${p.tokens} of ${p.maxTokens}`,
      text: "The model reads a limited number of tokens at a time",
    },
    {
      icon: <Scissors size={18} />,
      title: "Chunking",
      result: p.chunked ? `${p.parts} parts` : "Not needed",
      text: p.chunked ? "Too long for the model, so it was split" : "It fits, so it stays in one piece",
    },
    {
      icon: <Binary size={18} />,
      title: p.chunked ? "Vectors" : "Vector",
      result: `${p.parts} × ${p.dims}`,
      text: `${p.dims} numbers that capture the meaning`,
    },
    {
      icon: <Search size={18} />,
      title: "Closest passages",
      result: `${results.length} of ${p.indexed}`,
      text: `Compared with every passage in ${p.tookMs} ms`,
    },
  ];
}

function ResultCard(props: { result: SearchResult; rank: number }) {
  const { result } = props;
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl bg-white p-5">
      <div className="flex items-center gap-3 text-sm">
        <span className="tabular-nums text-muted">{props.rank}</span>
        <span className="min-w-0 flex-1 truncate font-medium" title={result.filename}>
          {result.filename}
        </span>
        <span className="shrink-0 rounded-md bg-forest-light px-2 py-0.5 text-xs tabular-nums text-forest" title="Cosine similarity, from 0 (unrelated) to 1 (identical)">
          {result.score.toFixed(2)}
        </span>
      </div>
      <p className={`mt-3 break-words text-sm leading-relaxed ${open ? "" : "line-clamp-3"}`}>{result.content}</p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-muted hover:text-forest"
        >
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          {open ? "Show less" : "Show all"}
        </button>
        <a href={`#/inspect/${result.documentId}`} className="inline-flex items-center gap-1 text-forest hover:underline">
          Passage #{result.chunkIndex}
          <ArrowRight size={14} />
        </a>
      </div>
    </li>
  );
}

function AskPage() {
  const [text, setText] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async (query: string) => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Search failed");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Failed to reach API");
      setData(null);
    } finally {
      setSearching(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(text);
  };

  // Enter searches, Shift+Enter starts a new line
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runSearch(text);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ask</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Search the official AUI documents by meaning, not by exact words. You get the passages closest to your question.
          Written answers come next.
        </p>
      </div>

      <form onSubmit={onSubmit} className="rounded-xl bg-white p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          maxLength={5000}
          placeholder="Write your question"
          aria-label="Your question"
          className="w-full resize-y bg-transparent text-sm leading-relaxed placeholder:text-muted/70 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-muted">{text.length.toLocaleString()} / 5,000</span>
          <button
            type="submit"
            disabled={!text.trim() || searching}
            className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-50"
          >
            {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>
      </form>

      {!data && !error && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setText(example);
                runSearch(example);
              }}
              className="rounded-lg bg-white px-3 py-1.5 text-sm text-muted hover:bg-forest-light hover:text-forest"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {data && (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted">What happened to your text</h2>
            <Pipeline layout="flow" steps={processingSteps(data)} />
          </section>

          <section className="rounded-xl bg-white p-5">
            <div className="mb-2 text-sm font-medium">
              {data.processing.chunked ? "The vector of its first part" : "Its vector"}
            </div>
            <VectorStrip
              values={data.processing.embedding}
              maxAbs={data.processing.embedding.reduce((max, v) => Math.max(max, Math.abs(v)), 0.01)}
              label={`Vector of your text, ${data.processing.dims} numbers`}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted">Closest passages</h2>
            {data.results.length > 0 ? (
              <ol className="space-y-3">
                {data.results.map((result, i) => (
                  <ResultCard key={result.chunkId} result={result} rank={i + 1} />
                ))}
              </ol>
            ) : (
              <p className="rounded-xl bg-white p-6 text-center text-sm text-muted">
                Nothing to search yet. Upload a document first.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AskPage;
