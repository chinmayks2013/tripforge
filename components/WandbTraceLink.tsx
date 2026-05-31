"use client";

import { ExternalLink } from "lucide-react";

const TRACE_URL = "https://wandb.ai/chinmayks2013/tripforge/weave";

export default function WandbTraceLink() {
  return (
    <a
      href={TRACE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
    >
      <ExternalLink className="w-3 h-3" />
      View AI traces in W&B Weave
    </a>
  );
}
