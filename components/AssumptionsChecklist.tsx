"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Assumption } from "@/lib/types";
import clsx from "clsx";
import { Check, X, Edit3, ChevronDown } from "lucide-react";

interface AssumptionsChecklistProps {
  assumptions: Assumption[];
  onUpdate: (assumptions: Assumption[]) => void;
  isUpdating: boolean;
}

export default function AssumptionsChecklist({
  assumptions,
  onUpdate,
  isUpdating,
}: AssumptionsChecklistProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [expanded, setExpanded] = useState(true);

  const pendingCount = assumptions.filter((a) => a.status === "pending").length;

  const updateAssumption = (
    id: string,
    updates: Partial<Assumption>
  ) => {
    const updated = assumptions.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    );
    onUpdate(updated);
  };

  const handleOptionSelect = (assumption: Assumption, optionValue: string) => {
    updateAssumption(assumption.id, {
      status: "modified",
      userValue: optionValue,
    });
    setEditingId(null);
  };

  const handleCustomSubmit = (assumption: Assumption) => {
    if (customValue.trim()) {
      updateAssumption(assumption.id, {
        status: "modified",
        userValue: customValue.trim(),
      });
      setCustomValue("");
      setEditingId(null);
    }
  };

  const confidenceColor = {
    high: "text-emerald-400 bg-emerald-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    low: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="glass-elevated rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="text-left">
          <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
            Assumptions Checklist
            {pendingCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                {pendingCount} to review
              </span>
            )}
            {isUpdating && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 flex items-center gap-1">
                <span className="w-3 h-3 border border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
                Re-optimizing
              </span>
            )}
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Review what we guessed — confirm, reject, or change any item. Agents
            only use a budget cap if you set one here or in your message.
          </p>
        </div>
        <ChevronDown
          className={clsx(
            "w-5 h-5 text-white/40 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              {assumptions.map((assumption) => (
                <div
                  key={assumption.id}
                  className={clsx(
                    "rounded-xl border p-4 transition-all",
                    assumption.status === "confirmed" && "border-emerald-500/30 bg-emerald-500/5",
                    assumption.status === "rejected" && "border-red-500/20 bg-red-500/5 opacity-60",
                    assumption.status === "modified" && "border-brand-500/30 bg-brand-500/5",
                    assumption.status === "pending" && "border-white/10 bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white/80">
                          {assumption.label}
                        </span>
                        <span
                          className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            confidenceColor[assumption.confidence]
                          )}
                        >
                          {assumption.confidence} confidence
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mt-1">
                        Assumed:{" "}
                        <span className="text-white/90">
                          {assumption.userValue ?? assumption.assumedValue}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          updateAssumption(assumption.id, { status: "confirmed" })
                        }
                        className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-colors"
                        title="Confirm"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          updateAssumption(assumption.id, { status: "rejected" })
                        }
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingId(
                            editingId === assumption.id ? null : assumption.id
                          )
                        }
                        className="p-1.5 rounded-lg hover:bg-brand-500/20 text-white/40 hover:text-brand-400 transition-colors"
                        title="Modify"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {editingId === assumption.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2">
                          {assumption.options.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => handleOptionSelect(assumption, opt.value)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-brand-500/50 hover:bg-brand-500/10 text-white/70 hover:text-white transition-all"
                            >
                              {opt.label}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              /* show custom input */
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-white/50"
                          >
                            Other...
                          </button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            placeholder="Enter custom value..."
                            className="flex-1 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-brand-500/50"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCustomSubmit(assumption);
                            }}
                          />
                          <button
                            onClick={() => handleCustomSubmit(assumption)}
                            className="text-xs px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
