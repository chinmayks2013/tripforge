"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Radio } from "lucide-react";
import clsx from "clsx";

const TRACE_URL = "https://wandb.ai/chinmayks2013/tripforge/weave";

export default function WandbTraceLink() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/wandb/status")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.configured)))
      .catch(() => setEnabled(false));
  }, []);

  return (
    <a
      href={TRACE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "inline-flex items-center gap-1.5 text-xs transition-colors",
        enabled ? "text-rook-400/80 hover:text-rook-300" : "text-white/35 hover:text-white/55"
      )}
      title={
        enabled
          ? "Traces are sent after each trip search (W&B Weave)"
          : "Add WANDB_API_KEY to .env.local to enable Weave tracing"
      }
    >
      {enabled ? (
        <Radio className="w-3 h-3 animate-pulse" />
      ) : (
        <ExternalLink className="w-3 h-3" />
      )}
      {enabled ? "Live Weave traces" : "W&B Weave (add API key)"}
    </a>
  );
}
