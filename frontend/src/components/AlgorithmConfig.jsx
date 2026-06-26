import React from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { Info, HelpCircle, Settings, HelpCircle as HelpIcon } from 'lucide-react';

const ALGO_INFO = {
  fcfs: {
    name: "First Come First Served (FCFS)",
    timeComplexity: "O(N)",
    spaceComplexity: "O(N)",
    bestCase: "Batch operations with uniform length tasks.",
    weakness: "Convoy Effect: Short processes get stuck behind a single large process, leading to high latency."
  },
  rr: {
    name: "Round Robin (RR)",
    timeComplexity: "O(N)",
    spaceComplexity: "O(N)",
    bestCase: "Interactive multi-user systems requiring fast response times.",
    weakness: "High context switch overhead if the time quantum is configured too low."
  },
  sjf: {
    name: "Shortest Job First (Non-Preemptive)",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    bestCase: "Minimizing average wait times when CPU burst times are known.",
    weakness: "Starvation: Long processes wait indefinitely if short jobs continuously arrive."
  },
  sjf_preemptive: {
    name: "Shortest Remaining Time First (SRTF)",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    bestCase: "Minimizing average wait times with dynamic arrival rates.",
    weakness: "Frequent preemption triggers CPU overhead; causes severe starvation of long-running tasks."
  },
  priority: {
    name: "Priority Scheduling (Basic)",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    bestCase: "Real-time systems scheduling critical hardware interrupts.",
    weakness: "Starvation: Low priority tasks may never receive CPU time."
  },
  priority_aging: {
    name: "Priority Scheduling with Aging",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    bestCase: "Priority-based workloads requiring starvation mitigation.",
    weakness: "Requires tuning of aging rate parameters to prevent queue inflation."
  },
  mlfq: {
    name: "Multilevel Feedback Queue (MLFQ)",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    bestCase: "General purpose operating systems (e.g., Windows, macOS).",
    weakness: "Complex configuration parameters; potential vulnerability to game-the-scheduler attacks."
  },
  lottery: {
    name: "Lottery Proportional Scheduling",
    timeComplexity: "O(N)",
    spaceComplexity: "O(N)",
    bestCase: "Multimedia streaming workloads demanding proportional shares.",
    weakness: "Lacks hard real-time guarantees; behavior is probabilistic."
  }
};

export default function AlgorithmConfig() {
  const { algorithmConfig, updateAlgorithmConfig } = useSimulationStore();
  const { 
    algorithm, time_quantum, aging_rate, mlfq_queues, 
    mlfq_quantums, context_switch_overhead, max_time 
  } = algorithmConfig;

  // Resolve active algorithm detail template
  const currentDetails = ALGO_INFO[algorithm] || ALGO_INFO.fcfs;

  const handleAlgoSelect = (e) => {
    const selected = e.target.value;
    
    // Auto-adjust mapped modes
    if (selected === "sjf") {
      updateAlgorithmConfig({ algorithm: "sjf" });
    } else if (selected === "sjf_preemptive") {
      updateAlgorithmConfig({ algorithm: "sjf_preemptive" });
    } else if (selected === "priority") {
      updateAlgorithmConfig({ algorithm: "priority" });
    } else if (selected === "priority_aging") {
      updateAlgorithmConfig({ algorithm: "priority_aging" });
    } else {
      updateAlgorithmConfig({ algorithm: selected });
    }
  };

  const handleQuantumChange = (idx, val) => {
    const nextQ = [...mlfq_quantums];
    nextQ[idx] = parseFloat(val) || 2.0;
    updateAlgorithmConfig({ mlfq_quantums: nextQ });
  };

  const handleQueueLevelChange = (val) => {
    const levels = parseInt(val) || 3;
    const nextQ = [...mlfq_quantums];
    // pad or trim
    if (nextQ.length < levels) {
      for (let i = nextQ.length; i < levels; i++) {
        nextQ.push(2.0 * Math.pow(2, i));
      }
    }
    updateAlgorithmConfig({ 
      mlfq_queues: levels, 
      mlfq_quantums: nextQ.slice(0, levels) 
    });
  };

  // Maps dropdown select to general algorithms
  const getAlgoGroup = () => {
    if (algorithm === "sjf_preemptive") return "sjf_preemptive";
    if (algorithm === "priority_aging") return "priority_aging";
    return algorithm;
  };

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Parameter Panel */}
      <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-5">
        <div className="flex items-center space-x-2 border-b border-border pb-3">
          <Settings className="w-5 h-5 text-accent" />
          <h3 className="font-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-300">
            Scheduler Properties
          </h3>
        </div>

        {/* Algo dropdown selection */}
        <div>
          <label className="block text-xs font-mono font-semibold text-textSecondary mb-2">
            Select Scheduling Algorithm
          </label>
          <select
            value={getAlgoGroup()}
            onChange={handleAlgoSelect}
            className="w-full bg-surface border border-border text-xs rounded-xl p-2.5 font-mono text-textPrimary focus:outline-none focus:border-accent"
          >
            <option value="fcfs">First Come First Served (FCFS)</option>
            <option value="rr">Round Robin (RR)</option>
            <option value="sjf">Shortest Job First (Non-Preemptive)</option>
            <option value="sjf_preemptive">Shortest Remaining Time First (Preemptive)</option>
            <option value="priority">Priority Scheduling (Non-Preemptive)</option>
            <option value="priority_aging">Priority Scheduling (Aging Preemptive)</option>
            <option value="mlfq">Multilevel Feedback Queue (MLFQ)</option>
            <option value="lottery">Lottery Scheduling</option>
          </select>
        </div>

        {/* Context Switch config */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-textSecondary mb-1.5">
              Switch Overhead (ms)
            </label>
            <input
              type="number"
              min="0"
              step="0.05"
              value={context_switch_overhead}
              onChange={(e) => updateAlgorithmConfig({ context_switch_overhead: parseFloat(e.target.value) || 0.0 })}
              className="w-full bg-surface border border-border text-xs rounded-xl p-2 font-mono text-textPrimary text-center"
            />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold text-textSecondary mb-1.5">
              Sim Cutoff (ms)
            </label>
            <input
              type="number"
              min="10"
              step="10"
              value={max_time}
              onChange={(e) => updateAlgorithmConfig({ max_time: parseFloat(e.target.value) || 1000.0 })}
              className="w-full bg-surface border border-border text-xs rounded-xl p-2 font-mono text-textPrimary text-center"
            />
          </div>
        </div>

        {/* Algorithm Specific Options */}
        <div className="border-t border-border pt-4 mt-2">
          {algorithm === "rr" && (
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-textSecondary">Time Quantum</span>
                <span className="text-accent font-bold">{time_quantum} ms</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={time_quantum}
                onChange={(e) => updateAlgorithmConfig({ time_quantum: parseFloat(e.target.value) })}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          )}

          {algorithm === "priority_aging" && (
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-textSecondary">Aging Boost Rate</span>
                  <span className="text-accent font-bold">{aging_rate} / 5ms</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={aging_rate}
                  onChange={(e) => updateAlgorithmConfig({ aging_rate: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
              <p className="text-[10px] text-textSecondary font-mono italic leading-relaxed">
                Aging periodically increases priority of waiting tasks, avoiding starvation.
              </p>
            </div>
          )}

          {algorithm === "mlfq" && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-semibold text-textSecondary">
                  Queue Levels
                </label>
                <select
                  value={mlfq_queues}
                  onChange={(e) => handleQueueLevelChange(e.target.value)}
                  className="bg-surface border border-border text-xs rounded-lg p-1.5 font-mono text-textPrimary focus:outline-none"
                >
                  {[2, 3, 4, 5].map(lv => (
                    <option key={`lv-${lv}`} value={lv}>{lv} Levels</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-textSecondary uppercase">
                  Quantum Configuration per Level
                </span>
                
                {Array.from({ length: mlfq_queues }).map((_, idx) => (
                  <div key={`mlfq-q-${idx}`} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-textSecondary">Q{idx} (Priority Level {idx}):</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={mlfq_quantums[idx] || 2.0}
                        onChange={(e) => handleQuantumChange(idx, e.target.value)}
                        className="bg-surface border border-border rounded-lg p-1 w-16 text-center text-textPrimary"
                      />
                      <span>ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {algorithm === "lottery" && (
            <div className="flex flex-col space-y-1 bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3">
              <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1">
                <HelpCircle className="w-4 h-4" />
                <span>Ticket Scheduling Active</span>
              </span>
              <p className="text-[10px] text-textSecondary font-mono leading-relaxed mt-1">
                Tickets for each process can be edited directly in the process rows. Schedulers pick a winning ticket randomly at context switches.
              </p>
            </div>
          )}

          {algorithm === "fcfs" && (
            <p className="text-[10px] text-textSecondary font-mono italic leading-relaxed">
              FCFS is simple, non-preemptive, and schedules processes strictly in order of arrival. No customization options.
            </p>
          )}

          {algorithm === "sjf" && (
            <p className="text-[10px] text-textSecondary font-mono italic leading-relaxed">
              Non-preemptive SJF picks the shortest job and runs it to completion without interruption.
            </p>
          )}

          {algorithm === "priority" && (
            <p className="text-[10px] text-textSecondary font-mono italic leading-relaxed">
              Basic Priority is non-preemptive. High priority tasks block lower ones, presenting a high risk of starvation.
            </p>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-4">
        <div className="flex items-center space-x-2 text-textSecondary font-semibold">
          <Info className="w-4 h-4 text-accent" />
          <h4 className="font-heading text-sm text-textPrimary">Algorithm Info Card</h4>
        </div>
        
        <div className="font-mono text-xs flex flex-col space-y-3">
          <div>
            <span className="text-textSecondary uppercase font-bold text-[9px] block">Algorithm:</span>
            <span className="text-textPrimary font-semibold text-sm">{currentDetails.name}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2.5">
            <div>
              <span className="text-textSecondary uppercase font-bold text-[9px] block">Time Complexity:</span>
              <span className="text-textPrimary font-semibold">{currentDetails.timeComplexity}</span>
            </div>
            <div>
              <span className="text-textSecondary uppercase font-bold text-[9px] block">Space Complexity:</span>
              <span className="text-textPrimary font-semibold">{currentDetails.spaceComplexity}</span>
            </div>
          </div>
          
          <div className="border-t border-border/40 pt-2.5">
            <span className="text-textSecondary uppercase font-bold text-[9px] block">Best Use Case:</span>
            <span className="text-textPrimary leading-relaxed">{currentDetails.bestCase}</span>
          </div>

          <div className="border-t border-border/40 pt-2.5 bg-danger/5 border border-danger/10 p-2.5 rounded-xl">
            <span className="text-danger uppercase font-bold text-[9px] block">Weaknesses:</span>
            <span className="text-textPrimary leading-relaxed">{currentDetails.weakness}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
