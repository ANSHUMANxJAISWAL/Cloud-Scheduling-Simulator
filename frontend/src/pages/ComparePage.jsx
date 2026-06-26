import React, { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import WorkloadBuilder from '../components/WorkloadBuilder';
import ComparisonRadar from '../components/ComparisonRadar';
import GanttChart from '../components/GanttChart';
import { 
  BarChart2, Loader2, AlertCircle, ChevronDown, 
  ChevronUp, Sparkles, Medal, Award, TrendingUp 
} from 'lucide-react';

const ALGO_LABELS = {
  fcfs: "FCFS",
  rr: "Round Robin",
  sjf: "SJF (Non-Preempt)",
  sjf_preemptive: "SRTF (Preempt SJF)",
  priority: "Priority (Basic)",
  priority_aging: "Priority (Aging)",
  mlfq: "MLFQ",
  lottery: "Lottery"
};

export default function ComparePage() {
  const { 
    processes, 
    comparisonResult, 
    runComparison, 
    isLoading, 
    error 
  } = useSimulationStore();

  const [selectedAlgos, setSelectedAlgos] = useState({
    fcfs: true,
    rr: true,
    sjf: true,
    sjf_preemptive: true,
    priority: true,
    priority_aging: true,
    mlfq: true,
    lottery: true
  });

  const [expandedAlgos, setExpandedAlgos] = useState({});

  const handleCheckboxChange = (algo) => {
    setSelectedAlgos(prev => ({
      ...prev,
      [algo]: !prev[algo]
    }));
  };

  const handleCompare = async () => {
    const algosToCompare = Object.keys(selectedAlgos).filter(k => selectedAlgos[k]);
    if (algosToCompare.length === 0) {
      alert("Please select at least one algorithm to compare.");
      return;
    }
    await runComparison(algosToCompare);
  };

  const toggleAlgoExpand = (algo) => {
    setExpandedAlgos(prev => ({
      ...prev,
      [algo]: !prev[algo]
    }));
  };

  const hasResult = comparisonResult && comparisonResult.results;

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6 gap-4">
        <div>
          <h2 className="font-heading text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-400">
            Scheduling Comparison Workspace
          </h2>
          <p className="text-sm text-textSecondary font-mono mt-1">
            Execute all scheduling algorithms concurrently against the identical process workload and compare rankings.
          </p>
        </div>
        
        <button
          onClick={handleCompare}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-accent to-indigo-600 hover:from-accent/90 hover:to-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <BarChart2 className="w-5 h-5" />
          )}
          <span>COMPARE ALL</span>
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 flex items-center space-x-3 text-danger animate-bounce">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-mono text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* Shared Workload Builder */}
      <WorkloadBuilder />

      {/* Algorithm Selection Checkboxes */}
      <div className="glassmorphism rounded-2xl p-5 border border-border flex flex-col space-y-3">
        <h4 className="text-xs font-mono font-bold text-textSecondary uppercase tracking-widest">
          Select Target Algorithms to Analyze
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.keys(selectedAlgos).map((algo) => (
            <label 
              key={`check-${algo}`}
              className={`flex items-center space-x-2.5 p-3 rounded-xl border border-border cursor-pointer select-none font-mono text-xs transition-all ${
                selectedAlgos[algo] 
                  ? 'bg-accent/10 border-accent/40 text-accent font-semibold' 
                  : 'bg-surface/50 text-textSecondary hover:bg-border/20'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedAlgos[algo]}
                onChange={() => handleCheckboxChange(algo)}
                className="rounded border-border text-accent focus:ring-accent w-4 h-4"
              />
              <span>{ALGO_LABELS[algo]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Results Workspace */}
      {hasResult ? (
        <div className="flex flex-col space-y-8 animate-fadeUp">
          
          {/* Top Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Radar Comparison Chart: 5 Cols */}
            <div className="lg:col-span-5">
              <ComparisonRadar comparisonResult={comparisonResult} />
            </div>

            {/* Evaluation summaries: 7 Cols */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Highlight best algorithm */}
              <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col md:flex-row gap-5 items-center bg-gradient-to-r from-accent/5 to-indigo-950/20">
                <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20 text-accent shrink-0">
                  <Award className="w-10 h-10 animate-bounce" />
                </div>
                
                <div className="font-mono text-xs flex-1 space-y-1">
                  <h3 className="font-heading text-sm font-bold text-textPrimary uppercase tracking-wider">
                    Best Heuristics For Workload
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-surface/60 p-2.5 rounded-xl border border-border flex items-center justify-between">
                      <span className="text-textSecondary">Avg Latency (Wait):</span>
                      <span className="text-success font-bold font-heading">{ALGO_LABELS[comparisonResult.comparison.best_for.avg_wait]}</span>
                    </div>
                    <div className="bg-surface/60 p-2.5 rounded-xl border border-border flex items-center justify-between">
                      <span className="text-textSecondary">Response Time:</span>
                      <span className="text-success font-bold font-heading">{ALGO_LABELS[comparisonResult.comparison.best_for.response_time]}</span>
                    </div>
                    <div className="bg-surface/60 p-2.5 rounded-xl border border-border flex items-center justify-between">
                      <span className="text-textSecondary">Throughput Rate:</span>
                      <span className="text-success font-bold font-heading">{ALGO_LABELS[comparisonResult.comparison.best_for.throughput]}</span>
                    </div>
                    <div className="bg-surface/60 p-2.5 rounded-xl border border-border flex items-center justify-between">
                      <span className="text-textSecondary">Time Share Fairness:</span>
                      <span className="text-success font-bold font-heading">{ALGO_LABELS[comparisonResult.comparison.best_for.fairness]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tradeoff Summary */}
              <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-3">
                <h4 className="text-xs font-mono font-bold text-textSecondary uppercase tracking-widest flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span>Analytical Tradeoff Summary</span>
                </h4>
                <p className="text-xs font-mono text-textPrimary leading-relaxed">
                  {comparisonResult.comparison.tradeoff_summary}
                </p>
              </div>

              {/* Summary Metrics Matrix Table */}
              <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-3">
                <h4 className="text-xs font-mono font-bold text-textSecondary uppercase tracking-widest">
                  Aggregate Metrics Comparison Matrix
                </h4>
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left border-collapse text-[10px] font-mono">
                    <thead className="bg-surface text-textSecondary border-b border-border font-bold">
                      <tr>
                        <th className="px-3 py-2">Algorithm</th>
                        <th className="px-3 py-2 text-center">Avg Wait (ms)</th>
                        <th className="px-3 py-2 text-center">Avg Resp (ms)</th>
                        <th className="px-3 py-2 text-center">Throughput</th>
                        <th className="px-3 py-2 text-center">CPU Util %</th>
                        <th className="px-3 py-2 text-center">Fairness (Jain)</th>
                        <th className="px-3 py-2 text-center">Overhead (ms)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {Object.keys(comparisonResult.results).map(algo => {
                        const metrics = comparisonResult.results[algo].metrics.aggregate;
                        const fairness = comparisonResult.results[algo].fairness;
                        return (
                          <tr key={`matrix-row-${algo}`} className="hover:bg-surface/30">
                            <td className="px-3 py-2 font-bold text-textPrimary">{ALGO_LABELS[algo]}</td>
                            <td className="px-3 py-2 text-center text-accent">{metrics.avg_waiting_time}</td>
                            <td className="px-3 py-2 text-center">{metrics.avg_response_time}</td>
                            <td className="px-3 py-2 text-center">{metrics.throughput.toFixed(3)}</td>
                            <td className="px-3 py-2 text-center">{metrics.cpu_utilization}%</td>
                            <td className="px-3 py-2 text-center font-bold">{fairness.jains_index}</td>
                            <td className="px-3 py-2 text-center text-danger">{metrics.context_switch_overhead}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* Expandable Per-Algorithm Gantt Timelines */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-heading text-xl font-bold text-textPrimary uppercase tracking-wide border-b border-border/60 pb-3">
              Per-Scheduler Execution Timelines
            </h3>

            {Object.keys(comparisonResult.results).map((algo) => {
              const isExpanded = !!expandedAlgos[algo];
              const result = comparisonResult.results[algo];
              return (
                <div 
                  key={`compare-gantt-${algo}`}
                  className="glassmorphism rounded-2xl border border-border overflow-hidden"
                >
                  {/* Collapsible header */}
                  <button
                    onClick={() => toggleAlgoExpand(algo)}
                    className="w-full flex items-center justify-between p-4 bg-surface hover:bg-border/40 font-mono text-xs transition-colors text-left"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-heading font-bold text-textPrimary text-sm">
                        {ALGO_LABELS[algo]} Schedule
                      </span>
                      <span className="text-textSecondary">|</span>
                      <span>Avg Wait: <strong className="text-accent">{result.metrics.aggregate.avg_waiting_time}ms</strong></span>
                      <span className="text-textSecondary">|</span>
                      <span>Fairness: <strong className="text-accent">{result.fairness.jains_index}</strong></span>
                      <span className="text-textSecondary">|</span>
                      <span>Switches: <strong className="text-danger">{result.metrics.aggregate.context_switch_overhead}ms</strong></span>
                    </div>

                    <div className="text-textSecondary hover:text-textPrimary">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Expanded Gantt Chart */}
                  {isExpanded && (
                    <div className="p-5 border-t border-border bg-background/50">
                      {/* Set currentTime to maxTime so the Gantt chart renders fully completed segments */}
                      <GanttChart 
                        simulationResult={result} 
                        currentTime={1000.0} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="border border-dashed border-border rounded-2xl bg-surface/20 p-12 text-center flex flex-col items-center justify-center space-y-4 h-[400px]">
          <Sparkles className="w-12 h-12 text-accent/40 animate-pulse" />
          <div className="max-w-sm">
            <h3 className="font-heading text-lg font-bold text-textPrimary">Comparison Hub Idle</h3>
            <p className="text-xs text-textSecondary font-mono mt-1 leading-relaxed">
              Verify the workload processes in the registry above, check the algorithms you wish to study, and click **COMPARE ALL** to inspect results.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
