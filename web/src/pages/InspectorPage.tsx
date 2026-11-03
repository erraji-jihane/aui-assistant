import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Binary,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  FileUp,
  Loader2,
  RefreshCw,
  Scissors,
  Search,
} from "lucide-react";
import { API_URL, formatBytes, formatDate, type InspectChunk, type InspectReport } from "../lib/api";
import { NeighborBars, SimilarityHeatmap, TokenBars, VectorStrip } from "../components/charts";
import { Pipeline, type PipelineStep } from "../components/Pipeline";

type Tab = "overview" | "passages" | "similarity";

const PAGE_SIZE = 30;

// high: blocks search, shown on top of the page; low: shown next to the chart that explains it
type Issue = {
  severity: "high" | "low";
  title: string;
  detail: string;
  canReprocess?: boolean;
  showPassages?: number;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function findIssues(report: InspectReport): Issue[] {
  const { stats, config } = report;
  const issues: Issue[] = [];

  const missing = stats.chunkCount - stats.embeddedCount;
  if (missing > 0) {
    issues.push({
      severity: "high",
      title: `${plural(missing, "passage has", "passages have")} no vector, so search can't find ${missing === 1 ? "it" : "them"}.`,
      detail: "Converting to vectors failed, or the document was uploaded before that step existed. Re-processing converts every passage again.",
      canReprocess: true,
    });
  }

  if (stats.outdated) {
    issues.push({
      severity: "high",
      title: "Processed with older settings.",
      detail: `Its passages are up to ${stats.maxWords} words with ${stats.avgOverlapWords} words of overlap. The current settings are ${config.chunkSize} and ${config.chunkOverlap}. Re-processing rebuilds it from the saved text, with no new upload.`,
      canReprocess: true,
    });
  }

  if (stats.overLimitCount > 0) {
    const share = stats.overLimitCount / stats.chunkCount;
    issues.push({
      severity: share > 0.1 ? "high" : "low",
      title: `${plural(stats.overLimitCount, "passage is", "passages are")} only partly read.`,
      detail:
        share > 0.1
          ? `That's ${Math.round(share * 100)}% of the document. Make passages shorter (lower CHUNK_SIZE in api/src/services/documentService.ts), then re-process.`
          : "They contain text that's much heavier than it looks, like rows of dots from a table of contents (.......) or tables of numbers. The model reads the start and skips the rest. With so few, and nothing a student would ask about, it's safe to ignore.",
      showPassages: stats.overLimitCount,
    });
  }

  if (stats.emptyCount > 0) {
    issues.push({
      severity: "low",
      title: `${plural(stats.emptyCount, "passage is", "passages are")} empty.`,
      detail: "The PDF probably has blank or scanned pages. Scanned pages are images, so there's no text to read.",
    });
  }

  return issues;
}

function chunkProblem(chunk: InspectChunk) {
  if (!chunk.hasEmbedding) return "No vector";
  if (chunk.wordCount === 0) return "Empty";
  if (chunk.overLimit) return "Partly read";
  return null;
}

function IssueCallout(props: {
  issue: Issue;
  reprocessing: boolean;
  onReprocess: () => void;
  onShowPassages: () => void;
}) {
  const { issue } = props;
  return (
    <div className={`flex gap-3 rounded-xl p-4 ${issue.severity === "high" ? "bg-terracotta/10" : "bg-gold-light/60"}`}>
      <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${issue.severity === "high" ? "text-terracotta" : "text-gold"}`} />
      <div className="space-y-2">
        <p className="text-sm font-semibold">{issue.title}</p>
        <p className="text-sm text-muted">{issue.detail}</p>
        {(issue.showPassages !== undefined || issue.canReprocess) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {issue.showPassages !== undefined && (
              <button
                type="button"
                onClick={props.onShowPassages}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-forest hover:bg-forest-light"
              >
                Show {issue.showPassages === 1 ? "it" : `these ${issue.showPassages}`}
                <ChevronRight size={14} />
              </button>
            )}
            {issue.canReprocess && (
              <button
                type="button"
                onClick={props.onReprocess}
                disabled={props.reprocessing}
                className="inline-flex items-center gap-2 rounded-lg bg-forest px-3 py-1.5 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
              >
                <RefreshCw size={14} className={props.reprocessing ? "animate-spin" : ""} />
                {props.reprocessing ? "Re-processing…" : "Re-process now"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab(props: {
  report: InspectReport;
  lowIssues: ReactNode;
  onSelect: (index: number) => void;
}) {
  const { document: doc, config, stats, chunks } = props.report;
  const allConverted = stats.embeddedCount === stats.chunkCount;
  const fullyRead = stats.chunkCount - stats.overLimitCount;
  const fullyReadPct = stats.chunkCount ? Math.floor((fullyRead / stats.chunkCount) * 100) : 0;

  const steps: PipelineStep[] = [
    {
      icon: <FileUp size={18} />,
      title: "Uploaded",
      result: formatBytes(doc.sizeBytes),
      text: doc.mimeType === "application/pdf" ? "PDF file" : "Text file",
    },
    {
      icon: <FileText size={18} />,
      title: "Text extracted",
      result: `${doc.totalWords.toLocaleString()} words`,
      text: "Pulled out of the PDF",
      status: doc.totalWords > 0 ? "ok" : "warn",
    },
    {
      icon: <Scissors size={18} />,
      title: "Split into passages",
      result: stats.chunkCount.toLocaleString(),
      text: `Up to ${config.chunkSize} words, ${config.chunkOverlap} shared with the previous one`,
      status: stats.outdated ? "warn" : "ok",
    },
    {
      icon: <Binary size={18} />,
      title: "Converted to vectors",
      result: `${stats.embeddedCount.toLocaleString()}`,
      text: `${config.dims} numbers each, capturing meaning`,
      status: allConverted ? "ok" : "warn",
    },
    {
      icon: <Search size={18} />,
      title: "Searchable",
      result: allConverted ? "Yes" : "Partly",
      text: "Questions are matched to the closest passages",
      status: allConverted ? "ok" : "warn",
    },
  ];

  const details: [string, ReactNode][] = [
    ["Passage size", `${config.chunkSize} words (longest: ${stats.maxWords})`],
    ["Overlap", `${config.chunkOverlap} words (measured: ${stats.avgOverlapWords})`],
    ["Words per passage", `avg ${stats.avgWords} · shortest ${stats.minWords}`],
    [
      "Tokens per passage",
      `avg ${stats.avgTokens} · longest ${stats.maxTokensSeen} · limit ${config.maxTokens}${config.tokenCountsExact ? "" : " (estimated)"}`,
    ],
    ["Neighbor similarity", stats.meanSimPrev !== null ? `${stats.meanSimPrev.toFixed(3)} mean cosine` : "—"],
    ["Embedding model", config.model],
    ["Vector size", `${config.dims} dims, L2-normalized`],
    ["Vector storage", `${formatBytes(stats.vectorBytes)} (float64)`],
    ["Text length", `${doc.textChars.toLocaleString()} characters`],
    ["Document ID", <span className="select-all font-mono text-xs">{doc.id}</span>],
  ];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted">How this document was processed</h3>
        <Pipeline steps={steps} layout="flow" />
      </section>

      <section className="rounded-xl bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="font-semibold">Does each passage fit in the model?</h3>
            <p className="mt-1 text-sm text-muted">
              The AI model reads at most {config.maxTokens} tokens (small word pieces, roughly 200 words) per passage. Each bar
              is one passage. Anything above the dashed line gets cut off.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tracking-tight tabular-nums text-forest">{fullyReadPct}%</div>
            <div className="text-xs text-muted tabular-nums">
              fully read ({fullyRead.toLocaleString()} of {stats.chunkCount.toLocaleString()})
            </div>
          </div>
        </div>
        <div className="mt-6">
          <TokenBars
            points={chunks.map((c) => ({ index: c.index, value: c.tokens }))}
            limit={config.maxTokens}
            onSelect={props.onSelect}
          />
        </div>
        {props.lowIssues && <div className="mt-6 space-y-3">{props.lowIssues}</div>}
      </section>

      <details className="group rounded-xl bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium">
          <ChevronRight size={16} className="text-muted transition-transform group-open:rotate-90" />
          Technical details
        </summary>
        <dl className="grid gap-x-8 gap-y-3 px-6 pb-6 text-sm sm:grid-cols-2">
          {details.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 border-b border-line pb-2">
              <dt className="text-muted">{key}</dt>
              <dd className="text-right tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function PassageDetail(props: { chunk: InspectChunk; report: InspectReport; maxAbs: number }) {
  const { chunk, report } = props;
  const { config } = report;
  const words = chunk.content.split(/\s+/).filter(Boolean);
  const overlap = chunk.overlapWords;
  const cutoff = Math.max(overlap, chunk.keptWords);

  const facts = [
    `${chunk.wordCount} words · ${chunk.tokens} tokens${chunk.overLimit ? ` (limit ${config.maxTokens})` : ""}`,
    overlap > 0 ? `First ${overlap} words repeat passage #${chunk.index - 1}` : "First passage",
    chunk.simPrev !== null ? `Similarity to #${chunk.index - 1}: ${chunk.simPrev.toFixed(2)}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4 px-4 pb-5 pt-1 sm:pl-[4.5rem]">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <p className="break-words text-sm leading-relaxed">
        {overlap > 0 && (
          <mark className="rounded bg-gold-light px-0.5 text-ink" title={`Repeated from passage #${chunk.index - 1}`}>
            {words.slice(0, overlap).join(" ")}
          </mark>
        )}{" "}
        {words.slice(overlap, cutoff).join(" ")}{" "}
        {cutoff < words.length && (
          <span className="text-muted line-through decoration-muted/50" title="Not read by the model (past its token limit)">
            {words.slice(cutoff).join(" ")}
          </span>
        )}
      </p>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {overlap > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gold-light" /> repeated from the previous passage
          </span>
        )}
        {cutoff < words.length && (
          <span className="inline-flex items-center gap-1.5">
            <span className="line-through">abc</span> not read by the model
          </span>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-muted">Its vector: the {config.dims} numbers the model turned it into</div>
        <VectorStrip values={chunk.embedding} maxAbs={props.maxAbs} label={`Vector of passage ${chunk.index}`} />
      </div>
    </div>
  );
}

function PassagesTab(props: {
  report: InspectReport;
  openIndex: number | null;
  onToggle: (index: number) => void;
  onlyIssues: boolean;
  setOnlyIssues: (value: boolean) => void;
}) {
  const { chunks, config } = props.report;
  const { onlyIssues, setOnlyIssues } = props;
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const withIssues = chunks.filter((c) => chunkProblem(c) !== null);
  const q = query.trim().toLowerCase();
  const filtered = (onlyIssues ? withIssues : chunks).filter((c) => !q || c.content.toLowerCase().includes(q));
  // Keep the passage opened from a chart visible even if it's past the current page
  const openPos = filtered.findIndex((c) => c.index === props.openIndex);
  const shown = filtered.slice(0, Math.max(visible, openPos + 1));
  // A loop, not Math.max(...values): 352 chunks × 384 numbers is too many arguments for one call
  const maxAbs = chunks.reduce(
    (max, c) => c.embedding.reduce((m, v) => Math.max(m, Math.abs(v)), max),
    0.01
  );

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted">
        Search never returns a whole document. It returns the passages closest to the question, so these are what the
        assistant actually reads. Each is up to {config.chunkSize} words.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-64">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Find text in passages, e.g. tuition"
            className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </label>
        <div className="inline-flex rounded-lg bg-white p-1 text-sm">
          {[
            { label: "All", value: false },
            { label: `Needs attention · ${withIssues.length}`, value: true },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                setOnlyIssues(opt.value);
                setVisible(PAGE_SIZE);
              }}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                onlyIssues === opt.value ? "bg-forest text-cream" : "text-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted tabular-nums">
        {filtered.length.toLocaleString()} {filtered.length === 1 ? "passage" : "passages"}
        {q && ` containing “${query.trim()}”`}
      </p>

      <ul className="divide-y divide-line overflow-hidden rounded-xl bg-white">
        {shown.map((chunk) => {
          const problem = chunkProblem(chunk);
          const isOpen = props.openIndex === chunk.index;
          const preview = chunk.content.split(/\s+/).slice(chunk.overlapWords, chunk.overlapWords + 24).join(" ");
          return (
            <li key={chunk.id} id={`chunk-${chunk.index}`} className="scroll-mt-4">
              <button
                type="button"
                onClick={() => props.onToggle(chunk.index)}
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cream/70 ${isOpen ? "bg-cream/70" : ""}`}
              >
                <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                <span className="w-10 shrink-0 text-sm tabular-nums text-muted">#{chunk.index}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{preview}…</span>
                {problem && (
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-gold-light px-2 py-0.5 text-xs sm:inline-flex">
                    <AlertTriangle size={12} className="text-gold" />
                    {problem}
                  </span>
                )}
                <span className="hidden w-16 shrink-0 text-right text-xs text-muted tabular-nums md:block">
                  {chunk.tokens} tok
                </span>
              </button>
              {isOpen && <PassageDetail chunk={chunk} report={props.report} maxAbs={maxAbs} />}
            </li>
          );
        })}
        {filtered.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No passages match.</li>}
      </ul>

      {shown.length < filtered.length && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setVisible(shown.length + PAGE_SIZE)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-forest hover:bg-forest-light"
          >
            Show more ({(filtered.length - shown.length).toLocaleString()} left)
          </button>
        </div>
      )}
    </div>
  );
}

function SimilarityTab(props: { report: InspectReport; onSelect: (index: number) => void }) {
  const { similarity, chunks } = props.report;
  const points = chunks
    .filter((c) => c.simPrev !== null)
    .map((c) => ({ index: c.index, value: c.simPrev as number }));

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Because every passage is a vector, the computer can measure how close two passages are in meaning, from 0
        (unrelated) to 1 (identical). Search does exactly this with the student's question.
      </p>

      <section className="rounded-xl bg-white p-6">
        <h3 className="font-semibold">Where the topic changes</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Each bar is how similar a passage is to the one before it. Tall bars continue the same topic. A dip usually marks
          a new section. Click a bar to open that passage.
        </p>
        <div className="mt-5">
          {points.length > 0 ? (
            <NeighborBars points={points} onSelect={props.onSelect} />
          ) : (
            <p className="text-sm text-muted">Needs at least two converted passages.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6">
        <h3 className="font-semibold">Every passage compared with every other</h3>
        {similarity ? (
          <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,380px)_1fr]">
            <SimilarityHeatmap indexes={similarity.indexes} values={similarity.values} onSelect={props.onSelect} />
            <div className="space-y-2 text-sm text-muted">
              <p>Each square compares two passages. The darker it is, the more alike their meaning.</p>
              <p>The diagonal is always dark, because a passage is identical to itself.</p>
              <p>Dark squares away from the diagonal are passages about the same topic. Search may return them together.</p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">
            This document has {chunks.length.toLocaleString()} passages, too many for a readable grid (the limit is 60). The
            chart above shows the same idea for neighboring passages.
          </p>
        )}
      </section>
    </div>
  );
}

function InspectorPage(props: { id: string }) {
  const [report, setReport] = useState<InspectReport | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [reprocessing, setReprocessing] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/documents/${props.id}/inspect`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Document not found" : "Failed to load document");
        return res.json();
      })
      .then((data: InspectReport) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Failed to reach API");
      });
    return () => {
      cancelled = true;
    };
  }, [props.id, version]);

  // After jumping to a passage from a chart, scroll it into view
  useEffect(() => {
    if (tab === "passages" && openIndex !== null) {
      window.document.getElementById(`chunk-${openIndex}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tab, openIndex]);

  const reprocess = async () => {
    setReprocessing(true);
    try {
      const res = await fetch(`${API_URL}/api/documents/${props.id}/reprocess`, { method: "POST" });
      if (!res.ok) throw new Error("Re-processing failed");
      setOpenIndex(null);
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message || "Failed to reach API");
    } finally {
      setReprocessing(false);
    }
  };

  const back = (
    <a href="#/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
      <ArrowLeft size={16} /> Documents
    </a>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <div className="flex items-center gap-2 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  const { document: doc, stats } = report;
  const searchable = stats.embeddedCount === stats.chunkCount && stats.chunkCount > 0;
  const issues = findIssues(report);

  const openPassage = (index: number) => {
    setTab("passages");
    setOnlyIssues(false);
    setOpenIndex(index);
  };

  const showIssuePassages = () => {
    setTab("passages");
    setOnlyIssues(true);
    setOpenIndex(null);
  };

  const callout = (issue: Issue, i: number) => (
    <IssueCallout
      key={i}
      issue={issue}
      reprocessing={reprocessing}
      onReprocess={reprocess}
      onShowPassages={showIssuePassages}
    />
  );
  const highIssues = issues.filter((i) => i.severity === "high");
  const lowIssues = issues.filter((i) => i.severity === "low");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "passages", label: `Passages · ${stats.chunkCount.toLocaleString()}` },
    { id: "similarity", label: "Similarity" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {back}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight">{doc.filename}</h1>
            <p className="mt-1 text-sm text-muted">Uploaded {formatDate(doc.uploadedAt)}</p>
          </div>
          {searchable ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-light px-3 py-1 text-sm font-medium text-forest">
              <CheckCircle2 size={15} /> Ready for search
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1 text-sm font-medium text-terracotta">
              <AlertCircle size={15} /> Not fully searchable
            </span>
          )}
        </div>
      </div>

      {highIssues.length > 0 && <div className="space-y-3">{highIssues.map(callout)}</div>}

      <div role="tablist" className="flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === t.id ? "border-forest text-forest" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          report={report}
          lowIssues={lowIssues.length > 0 ? lowIssues.map(callout) : null}
          onSelect={openPassage}
        />
      )}
      {tab === "passages" && (
        <PassagesTab
          report={report}
          openIndex={openIndex}
          onToggle={(i) => setOpenIndex(openIndex === i ? null : i)}
          onlyIssues={onlyIssues}
          setOnlyIssues={setOnlyIssues}
        />
      )}
      {tab === "similarity" && <SimilarityTab report={report} onSelect={openPassage} />}
    </div>
  );
}

export default InspectorPage;
