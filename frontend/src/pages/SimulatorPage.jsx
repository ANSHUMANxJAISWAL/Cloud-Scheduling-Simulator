import React from 'react';
import { useSimulationStore } from '../store/simulationStore';
import WorkloadBuilder from '../components/WorkloadBuilder';
import AlgorithmConfig from '../components/AlgorithmConfig';
import GanttChart from '../components/GanttChart';
import TimelineReplay from '../components/TimelineReplay';
import MetricsTable from '../components/MetricsTable';
import StarvationAlert from '../components/StarvationAlert';
import FairnessGauge from '../components/FairnessGauge';
import { Play, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function SimulatorPage() {
  const { 
    simulationResult, 
    algorithmConfig, 
    replayState, 
    runSimulation, 
    isLoading, 
    error 
  } = useSimulationStore();

  const handleRun = async () => {
    await runSimulation();
  };

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6 gap-4">
        <div>
          <h2 className="font-heading text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-accent to-teal-400">
            Scheduling Simulation Sandbox
          </h2>
          <p className="text-sm text-textSecondary font-mono mt-1">
            Run individual scheduling heuristics on customizable process queues and watch execution timing segment playbacks.
          </p>
        </div>
        
        {/* Action Button */}
        <button
          onClick={handleRun}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-accent to-indigo-600 hover:from-accent/90 hover:to-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl transition-all hover:shadow-accent/20 hover:shadow-2xl scale-100 hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5 fill-white" />
          )}
          <span>EXECUTE SIMULATION</span>
        </button>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 flex items-center space-x-3 text-danger animate-bounce">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-mono text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Configurations: 5 Cols */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <WorkloadBuilder />
          <AlgorithmConfig />
        </div>

        {/* Right Performance Dashboard: 7 Cols */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {simulationResult ? (
            <div className="flex flex-col space-y-6 animate-fadeUp">
              {/* Gantt & Replay */}
              <GanttChart 
                simulationResult={simulationResult} 
                currentTime={replayState.currentTime} 
              />
              
              <TimelineReplay />
              
              {/* Starvation Alerts */}
              <StarvationAlert 
                simulationResult={simulationResult} 
                algorithm={algorithmConfig.algorithm} 
              />

              {/* Metrics side-by-side: Table + Fairness */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <MetricsTable simulationResult={simulationResult} />
                </div>
                <div className="md:col-span-1">
                  <FairnessGauge fairnessReport={simulationResult.fairness} />
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-2xl bg-surface/20 p-12 text-center flex flex-col items-center justify-center space-y-4 h-[400px]">
              <Sparkles className="w-12 h-12 text-accent/40 animate-pulse" />
              <div className="max-w-sm">
                <h3 className="font-heading text-lg font-bold text-textPrimary">Sandbox Ready</h3>
                <p className="text-xs text-textSecondary font-mono mt-1 leading-relaxed">
                  Customize the workload processes and choose a scheduler configuration on the left. Click **EXECUTE SIMULATION** to load execution timelines.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
