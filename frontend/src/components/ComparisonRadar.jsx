import React from 'react';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend 
} from 'recharts';

const ALGO_COLORS = {
  fcfs: "#3b82f6",          // blue
  rr: "#10b981",            // green
  sjf: "#f59e0b",           // yellow
  sjf_preemptive: "#ef4444",// red
  priority: "#8b5cf6",      // purple
  priority_aging: "#ec4899",// pink
  mlfq: "#14b8a6",          // teal
  lottery: "#6366f1"        // indigo
};

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

export default function ComparisonRadar({ comparisonResult }) {
  if (!comparisonResult || !comparisonResult.results) {
    return (
      <div className="h-96 flex items-center justify-center border border-dashed border-border rounded-2xl bg-surface/50 text-textSecondary font-mono text-sm">
        No comparison data. Select algorithms and click Compare.
      </div>
    );
  }

  const { results } = comparisonResult;
  const algos = Object.keys(results);

  if (algos.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center border border-dashed border-border rounded-2xl bg-surface/50 text-textSecondary font-mono text-sm">
        No algorithms selected for comparison.
      </div>
    );
  }

  // Helper to extract metric values
  const getValues = (extractor) => algos.map(a => extractor(results[a]));

  const extractors = {
    throughput: (res) => res.metrics.aggregate.throughput,
    avgWait: (res) => res.metrics.aggregate.avg_waiting_time,
    cpuUtil: (res) => res.metrics.aggregate.cpu_utilization,
    fairness: (res) => res.fairness.jains_index,
    responseTime: (res) => res.metrics.aggregate.avg_response_time,
    overhead: (res) => res.metrics.aggregate.context_switch_overhead
  };

  // Min-max helper to normalize values to [0, 1] range
  const normalize = (val, values, inverted = false) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return 1.0;
    
    if (inverted) {
      return (max - val) / (max - min);
    } else {
      return (val - min) / (max - min);
    }
  };

  // Prepare radar axes data
  const axes = [
    { name: 'Throughput', key: 'throughput', inverted: false },
    { name: 'Avg Wait (Inv)', key: 'avgWait', inverted: true },
    { name: 'CPU Util', key: 'cpuUtil', inverted: false },
    { name: 'Fairness (Jain)', key: 'fairness', inverted: false },
    { name: 'Response (Inv)', key: 'responseTime', inverted: true },
    { name: 'Overhead (Inv)', key: 'overhead', inverted: true }
  ];

  const radarData = axes.map(axis => {
    const rawValues = getValues(extractors[axis.key]);
    const row = { subject: axis.name };
    
    algos.forEach(algo => {
      const rawVal = extractors[axis.key](results[algo]);
      row[algo] = normalize(rawVal, rawValues, axis.inverted);
    });
    
    return row;
  });

  return (
    <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col h-full justify-between">
      <div>
        <h3 className="font-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-300">
          Multi-Dimensional Comparison
        </h3>
        <p className="text-xs text-textSecondary font-mono mt-1">
          Normalized metrics radar. Larger area represents superior performance.
        </p>
      </div>

      <div className="h-80 w-full mt-4 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#1f2937" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 1]} 
              tick={{ fill: '#4b5563', fontSize: 8 }} 
            />
            
            {algos.map(algo => (
              <Radar
                key={`radar-${algo}`}
                name={ALGO_LABELS[algo] || algo}
                dataKey={algo}
                stroke={ALGO_COLORS[algo] || "#9ca3af"}
                fill={ALGO_COLORS[algo] || "#9ca3af"}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
            
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#9ca3af' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
