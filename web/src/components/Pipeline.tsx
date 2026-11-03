import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

export type PipelineStep = {
  icon: ReactNode;
  title: string;
  text: string;
  result?: string;
  status?: "ok" | "warn";
};

// The ingestion steps: a compact row (general explanation), a flow of big results
// for one document, or a vertical timeline with each step's result and explanation
export function Pipeline(props: { steps: PipelineStep[]; layout: "row" | "flow" | "timeline" }) {
  if (props.layout === "flow") {
    return (
      <ol className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-stretch lg:gap-0">
        {props.steps.map((step, i) => (
          <li key={step.title} className="flex items-center lg:flex-1">
            <div className="h-full w-full rounded-xl bg-white p-4">
              <div className="flex items-center gap-2 text-forest">
                {step.icon}
                {step.status === "warn" && <AlertTriangle size={14} className="text-gold" aria-label="Needs attention" />}
              </div>
              <div className="mt-3 text-xl font-semibold tracking-tight tabular-nums">{step.result}</div>
              <div className="mt-0.5 text-sm font-medium">{step.title}</div>
              <p className="mt-1 text-xs text-muted">{step.text}</p>
            </div>
            {i < props.steps.length - 1 && (
              <ArrowRight size={16} className="mx-1 hidden shrink-0 text-muted lg:block" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    );
  }

  if (props.layout === "row") {
    return (
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {props.steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-light text-forest">
              {step.icon}
            </div>
            <div>
              <div className="text-sm font-semibold">
                <span className="text-muted">{i + 1}.</span> {step.title}
              </div>
              <p className="mt-0.5 text-sm text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol>
      {props.steps.map((step, i) => {
        const last = i === props.steps.length - 1;
        return (
          <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span className="absolute left-[17px] top-10 bottom-1 w-px bg-line" aria-hidden />}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-light text-forest">
              {step.icon}
            </div>
            <div className="min-w-0 flex-1 pt-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold">{step.title}</span>
                {step.result && <span className="text-sm tabular-nums">{step.result}</span>}
                {step.status === "ok" && <CheckCircle2 size={15} className="text-forest" aria-label="OK" />}
                {step.status === "warn" && <AlertTriangle size={15} className="text-gold" aria-label="Needs attention" />}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted">{step.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
