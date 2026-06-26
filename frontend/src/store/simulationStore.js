import { create } from 'zustand';
import { simulationApi } from '../api/simulationApi';

const DEFAULT_PROCESSES = [
  { pid: 1, name: "P1", arrival_time: 0.0, burst_time: 10.0, priority: 3, tickets: 10, io_bursts: [] },
  { pid: 2, name: "P2", arrival_time: 2.0, burst_time: 5.0, priority: 1, tickets: 20, io_bursts: [] },
  { pid: 3, name: "P3", arrival_time: 4.0, burst_time: 8.0, priority: 2, tickets: 15, io_bursts: [] }
];

export const useSimulationStore = create((set, get) => ({
  processes: DEFAULT_PROCESSES,
  algorithmConfig: {
    algorithm: "fcfs",
    time_quantum: 2.0,
    aging_rate: 0.5,
    mlfq_queues: 3,
    mlfq_quantums: [2.0, 4.0, 8.0],
    context_switch_overhead: 0.1,
    max_time: 1000.0,
  },
  simulationResult: null,
  comparisonResult: null,
  
  replayState: {
    currentTime: 0.0,
    isPlaying: false,
    speed: 1.0, // 0.5x, 1x, 2x, 5x
    eventIndex: 0,
  },
  
  isLoading: false,
  error: null,
  
  // Workload builder actions
  setProcesses: (processes) => set({ processes, simulationResult: null }),
  
  updateProcess: (updated) => set((state) => {
    const next = state.processes.map(p => p.pid === updated.pid ? updated : p);
    return { processes: next, simulationResult: null };
  }),
  
  addProcess: (proc) => set((state) => {
    const nextId = state.processes.length > 0 ? Math.max(...state.processes.map(p => p.pid)) + 1 : 1;
    const newProc = {
      pid: nextId,
      name: proc.name || `P${nextId}`,
      arrival_time: proc.arrival_time ?? 0.0,
      burst_time: proc.burst_time ?? 10.0,
      priority: proc.priority ?? 5,
      tickets: proc.tickets ?? 10,
      io_bursts: proc.io_bursts || [],
    };
    return { processes: [...state.processes, newProc], simulationResult: null };
  }),
  
  removeProcess: (pid) => set((state) => ({
    processes: state.processes.filter(p => p.pid !== pid),
    simulationResult: null
  })),
  
  updateAlgorithmConfig: (config) => set((state) => ({
    algorithmConfig: { ...state.algorithmConfig, ...config },
    simulationResult: null
  })),
  
  // API actions
  runSimulation: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = {
        processes: get().processes,
        ...get().algorithmConfig
      };
      const result = await simulationApi.simulate(config);
      set({ 
        simulationResult: result, 
        isLoading: false,
        replayState: {
          currentTime: 0.0,
          isPlaying: false,
          speed: 1.0,
          eventIndex: 0
        }
      });
    } catch (err) {
      set({ error: err.response?.data?.detail || "Simulation run failed", isLoading: false });
    }
  },
  
  runComparison: async (selectedAlgos) => {
    set({ isLoading: true, error: null });
    try {
      const { time_quantum, aging_rate } = get().algorithmConfig;
      const result = await simulationApi.compare(
        get().processes,
        selectedAlgos,
        time_quantum,
        aging_rate
      );
      set({ comparisonResult: result, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.detail || "Comparison failed", isLoading: false });
    }
  },
  
  generateWorkload: async (preset, numProcesses, seed) => {
    set({ isLoading: true, error: null });
    try {
      const procs = await simulationApi.generateWorkload(preset, numProcesses, seed);
      set({ processes: procs, simulationResult: null, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.detail || "Workload generation failed", isLoading: false });
    }
  },
  
  // Replay actions
  setReplayTime: (time) => set((state) => {
    if (!state.simulationResult) return {};
    
    // Find correct eventIndex based on time
    const trace = state.simulationResult.trace;
    let index = 0;
    while (index < trace.length && trace[index].timestamp <= time) {
      index++;
    }
    
    return {
      replayState: {
        ...state.replayState,
        currentTime: time,
        eventIndex: Math.max(0, index - 1)
      }
    };
  }),
  
  playReplay: () => set((state) => ({
    replayState: { ...state.replayState, isPlaying: true }
  })),
  
  pauseReplay: () => set((state) => ({
    replayState: { ...state.replayState, isPlaying: false }
  })),
  
  stepForward: () => set((state) => {
    if (!state.simulationResult) return {};
    const trace = state.simulationResult.trace;
    const { eventIndex } = state.replayState;
    if (eventIndex < trace.length - 1) {
      const nextIndex = eventIndex + 1;
      return {
        replayState: {
          ...state.replayState,
          eventIndex: nextIndex,
          currentTime: trace[nextIndex].timestamp
        }
      };
    }
    return {};
  }),
  
  stepBack: () => set((state) => {
    if (!state.simulationResult) return {};
    const trace = state.simulationResult.trace;
    const { eventIndex } = state.replayState;
    if (eventIndex > 0) {
      const prevIndex = eventIndex - 1;
      return {
        replayState: {
          ...state.replayState,
          eventIndex: prevIndex,
          currentTime: trace[prevIndex].timestamp
        }
      };
    }
    return {};
  }),
  
  resetReplay: () => set((state) => ({
    replayState: {
      ...state.replayState,
      currentTime: 0.0,
      isPlaying: false,
      eventIndex: 0
    }
  }))
}));
