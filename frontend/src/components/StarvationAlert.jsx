import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';

const ALGO_STARVATION_EXPLANATIONS = {
  fcfs: "FCFS does not cause starvation since every process is eventually scheduled in arrival order. However, it can cause high average latency (Convoy Effect).",
  rr: "Round Robin does not cause starvation. Its preemptive cyclic structure guarantees that every process receives a CPU time slice (quantum) periodically.",
  sjf: "Shortest Job First is highly prone to starvation. If short bursts are continuously queued, longer bursts are deferred indefinitely, causing severe starvation.",
  sjf_preemptive: "Shortest Remaining Time First (SRTF) suffers from severe starvation. Long processes are repeatedly preempted or bypassed by shorter processes arriving dynamically.",
  priority: "Basic Priority Scheduling is highly prone to starvation. High-priority jobs block low-priority jobs. If VIP jobs continue arriving, low-priority tasks never run.",
  priority_aging: "Priority with Aging mitigates starvation by boosting priority over time. If starvation occurred here, the aging rate is too low for the arrival rate.",
  mlfq: "MLFQ uses a periodic priority boost (every 50ms) to prevent starvation. If starvation occurred, the boost interval might be too long relative to the quantum sizes.",
  lottery: "Lottery Scheduling is probabilistic. Lower ticket counts have lower CPU shares. Severe starvation is rare but statistically possible over short timelines."
};

export default function StarvationAlert({ simulationResult, algorithm }) {
  const [expanded, setExpanded] = useState(false);

  if (!simulationResult || !simulationResult.starvation) return null;

  const { starved, at_risk, starvation_events } = simulationResult.starvation;
  const hasStarvation = starved.length > 0 || at_risk.length > 0;

  if (!hasStarvation) {
    return (
      <div className="bg-success/5 border border-success/20 rounded-2xl p-4 flex items-center space-x-3 text-success">
        <CheckCircle className="w-5 h-5 shrink-0" />
        <span className="font-mono text-xs">
          Scheduler Health: 100% operational. Zero starvation events or at-risk queues detected.
        </span>
      </div>
    );
  }

  const explanation = ALGO_STARVATION_EXPLANATIONS[algorithm] || "The active algorithm did not prevent starvation for this workload.";

  return (
    <div className="flex flex-col space-y-3">
      {/* Banner */}
      <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg animate-pulseRed">
        <div className="flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="font-mono text-xs">
            <h4 className="font-heading text-sm font-bold text-textPrimary uppercase tracking-wider">
              Scheduling Starvation Warned!
            </h4>
            
            <div className="mt-1 flex flex-wrap gap-2 items-center">
              {starved.length > 0 && (
                <span className="text-danger">
                  Starved: <span className="bg-danger/15 px-2 py-0.5 rounded font-bold">{starved.map(pid => `P${pid}`).join(', ')}</span>
                </span>
              )}
              {at_risk.length > 0 && (
                <span className="text-warning">
                  At Risk: <span className="bg-warning/15 px-2 py-0.5 rounded font-bold">{at_risk.map(pid => `P${pid}`).join(', ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-1 bg-danger/10 hover:bg-danger/20 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold text-textPrimary self-end sm:self-center transition-colors"
        >
          <span>Why is this happening?</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Explanation Details */}
      {expanded && (
        <div className="bg-surface/90 border border-border/80 rounded-2xl p-5 text-xs font-mono flex flex-col space-y-3 shadow-inner">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-textSecondary uppercase font-bold text-[9px]">Root Cause Analysis:</span>
              <p className="text-textPrimary leading-relaxed">{explanation}</p>
            </div>
          </div>
          
          {starvation_events.length > 0 && (
            <div className="border-t border-border pt-3 mt-1">
              <span className="text-textSecondary uppercase font-bold text-[9px] block mb-2">
                Concurring Long-Wait Starvation Events:
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-2">
                {starvation_events.map((evt, idx) => (
                  <div key={`starve-evt-${idx}`} className="bg-background/80 px-3 py-1.5 rounded-lg border border-border/40 text-[10px] flex justify-between items-center">
                    <span className="text-textPrimary font-semibold">Process P{evt.pid}</span>
                    <span className="text-textSecondary">
                      waited from <span className="text-textPrimary">{evt.wait_start}ms</span> to <span className="text-textPrimary">{evt.wait_end}ms</span> (duration: <span className="text-danger font-bold">{evt.duration}ms</span>)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
