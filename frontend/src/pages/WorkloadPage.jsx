import React, { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { 
  Sparkles, Layers, ArrowRight, Dices, 
  Cpu, Server, ShieldAlert, Activity 
} from 'lucide-react';

const PRESET_CARDS = [
  {
    key: "classic",
    name: "Classic OS Textbook",
    icon: Cpu,
    description: "Standard OS process list. Demonstrates FCFS convoy effect, SJF minimizing waiting times, and Round Robin quantum slicing.",
    processCount: 3,
    characteristics: "CPU-heavy, close arrivals, mixed lengths",
    processes: [
      { pid: 1, name: "P1", arrival_time: 0.0, burst_time: 24.0, priority: 3, tickets: 10, io_bursts: [] },
      { pid: 2, name: "P2", arrival_time: 1.0, burst_time: 3.0, priority: 1, tickets: 30, io_bursts: [] },
      { pid: 3, name: "P3", arrival_time: 2.0, burst_time: 4.0, priority: 2, tickets: 20, io_bursts: [] }
    ]
  },
  {
    key: "web",
    name: "Web Server Simulation",
    icon: Server,
    description: "Emulates dynamic web request handling with low-compute tasks interrupting for database and disk I/O bursts.",
    processCount: 4,
    characteristics: "Frequent database I/O, short bursts, interactive",
    processes: [
      { pid: 1, name: "HTTP_GET_1", arrival_time: 0.0, burst_time: 4.0, priority: 2, tickets: 15, io_bursts: [{ start_offset: 1.0, duration: 8.0 }] },
      { pid: 2, name: "HTTP_POST", arrival_time: 1.0, burst_time: 6.0, priority: 4, tickets: 10, io_bursts: [{ start_offset: 2.0, duration: 15.0 }] },
      { pid: 3, name: "HTTP_GET_2", arrival_time: 2.0, burst_time: 3.0, priority: 1, tickets: 25, io_bursts: [{ start_offset: 1.0, duration: 5.0 }] },
      { pid: 4, name: "DB_QUERY", arrival_time: 4.0, burst_time: 8.0, priority: 3, tickets: 20, io_bursts: [{ start_offset: 3.0, duration: 20.0 }] }
    ]
  },
  {
    key: "batch",
    name: "Batch Processing",
    icon: Cpu,
    description: "Computational-heavy background worker jobs with zero I/O and large execution times. Ideal for studying maximum throughput metrics.",
    processCount: 3,
    characteristics: "High burst length, compute-heavy, spaced arrivals",
    processes: [
      { pid: 1, name: "Batch_Job_A", arrival_time: 0.0, burst_time: 50.0, priority: 8, tickets: 10, io_bursts: [] },
      { pid: 2, name: "Batch_Job_B", arrival_time: 10.0, burst_time: 80.0, priority: 10, tickets: 10, io_bursts: [] },
      { pid: 3, name: "Batch_Job_C", arrival_time: 15.0, burst_time: 30.0, priority: 5, tickets: 10, io_bursts: [] }
    ]
  },
  {
    key: "realtime",
    name: "Real-Time Tasks",
    icon: Activity,
    description: "Critical telemetry signals and mechanical control loops arriving periodically. Demonstrates preemptive priority interrupt handling.",
    processCount: 3,
    characteristics: "Multi-priority interrupts, strict low latency, zero I/O",
    processes: [
      { pid: 1, name: "RT_Telemetry", arrival_time: 0.0, burst_time: 5.0, priority: 1, tickets: 50, io_bursts: [] },
      { pid: 2, name: "RT_Actuator", arrival_time: 5.0, burst_time: 4.0, priority: 1, tickets: 50, io_bursts: [] },
      { pid: 3, name: "Background_Log", arrival_time: 2.0, burst_time: 30.0, priority: 9, tickets: 5, "io_bursts": [] }
    ]
  },
  {
    key: "starvation",
    name: "Adversarial SJF Starvation",
    icon: ShieldAlert,
    description: "A worst-case workload designed specifically to starves a long-running process with an endless stream of short processes.",
    processCount: 6,
    characteristics: "Starvation testbed, extreme burst sizes, rapid arrivals",
    processes: [
      { pid: 1, name: "Long_Job", arrival_time: 0.0, burst_time: 60.0, priority: 10, tickets: 5, io_bursts: [] },
      { pid: 2, name: "Short_Job_1", arrival_time: 1.0, burst_time: 2.0, priority: 1, tickets: 20, io_bursts: [] },
      { pid: 3, name: "Short_Job_2", arrival_time: 3.0, burst_time: 2.0, priority: 1, tickets: 20, io_bursts: [] },
      { pid: 4, name: "Short_Job_3", arrival_time: 5.0, burst_time: 2.0, priority: 1, tickets: 20, io_bursts: [] },
      { pid: 5, name: "Short_Job_4", arrival_time: 7.0, burst_time: 2.0, priority: 1, tickets: 20, io_bursts: [] },
      { pid: 6, name: "Short_Job_5", arrival_time: 9.0, burst_time: 2.0, priority: 1, tickets: 20, io_bursts: [] }
    ]
  }
];

export default function WorkloadPage({ setActiveTab }) {
  const { setProcesses, generateWorkload } = useSimulationStore();
  const [seed, setSeed] = useState(42);

  const loadPreset = (preset) => {
    // Make deep copy of preset processes
    const copy = JSON.parse(JSON.stringify(preset.processes));
    setProcesses(copy);
    setActiveTab('simulator');
  };

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 1000));
  };

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6 gap-4">
        <div>
          <h2 className="font-heading text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-400">
            Workload Preset Library
          </h2>
          <p className="text-sm text-textSecondary font-mono mt-1">
            Browse and load pre-configured workloads representing classic theoretical scenarios and operating system testbeds.
          </p>
        </div>
        
        {/* Seed controller */}
        <div className="flex items-center space-x-2 bg-surface border border-border px-3.5 py-2 rounded-xl shrink-0 font-mono text-xs text-textSecondary">
          <Dices className="w-4 h-4 text-accent" />
          <span>Generation Seed:</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
            className="w-14 bg-transparent border-b border-border focus:outline-none text-textPrimary text-center font-bold"
          />
          <button 
            onClick={handleRandomSeed}
            className="text-[10px] bg-border/40 hover:bg-border px-1.5 py-0.5 rounded text-textPrimary uppercase transition-colors"
          >
            Rand
          </button>
        </div>
      </div>

      {/* Grid of Preset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRESET_CARDS.map((p) => {
          const IconComponent = p.icon;
          return (
            <div 
              key={`preset-${p.key}`}
              className="glassmorphism rounded-2xl p-6 border border-border flex flex-col justify-between hover:border-accent/50 hover:shadow-accent/5 transition-all duration-300 group cursor-pointer"
              onClick={() => loadPreset(p)}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/20 text-accent group-hover:scale-110 transition-transform">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-textSecondary uppercase bg-surface border border-border px-2 py-0.5 rounded-lg">
                    {p.processCount} processes
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-bold group-hover:text-accent transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-textSecondary font-mono italic">
                    {p.characteristics}
                  </p>
                </div>

                <p className="text-xs font-mono text-textSecondary leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="border-t border-border/60 pt-4 mt-6 flex items-center justify-between text-xs font-mono">
                <span className="text-accent group-hover:underline">Load into Simulator</span>
                <ArrowRight className="w-4 h-4 text-textSecondary group-hover:text-accent group-hover:translate-x-1.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
