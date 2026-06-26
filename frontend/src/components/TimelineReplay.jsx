import React, { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { 
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight, 
  Terminal, Eye, User, Clock, ShieldAlert
} from 'lucide-react';

export default function TimelineReplay() {
  const { 
    simulationResult, 
    replayState, 
    setReplayTime, 
    playReplay, 
    pauseReplay, 
    resetReplay, 
    stepForward, 
    stepBack,
    updateAlgorithmConfig
  } = useSimulationStore();

  const { currentTime, isPlaying, speed, eventIndex } = replayState;
  const logContainerRef = useRef(null);

  if (!simulationResult) return null;

  const { trace, metrics } = simulationResult;
  const maxTime = Math.max(
    ...metrics.processes.map(p => p.completion_time),
    trace[trace.length - 1]?.timestamp || 10.0,
    1.0
  );

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;
    
    let lastRealTime = performance.now();
    let frameId;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - lastRealTime;
      lastRealTime = now;

      // Base: 10 simulation units per 1 second of real time at 1x speed
      const unitsPerSec = 10 * speed;
      const nextTime = currentTime + (elapsed / 1000) * unitsPerSec;

      if (nextTime >= maxTime) {
        setReplayTime(maxTime);
        pauseReplay();
      } else {
        setReplayTime(nextTime);
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, currentTime, speed, maxTime, setReplayTime, pauseReplay]);

  // Auto-scroll event log to latest event
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [eventIndex]);

  // Retrieve current event state from trace
  const currentEvent = trace[eventIndex] || {
    running_pid: null,
    ready_queue: [],
    io_queue: [],
    message: "Simulation ready"
  };

  const runningProc = metrics.processes.find(p => p.pid === currentEvent.running_pid);
  const readyProcs = currentEvent.ready_queue.map(id => metrics.processes.find(p => p.pid === id)).filter(Boolean);
  const ioProcs = currentEvent.io_queue.map(id => metrics.processes.find(p => p.pid === id)).filter(Boolean);

  // Filter events that happened at or before currentTime
  const visibleEvents = trace.filter(evt => evt.timestamp <= currentTime);

  return (
    <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-6">
      
      {/* HUD - Live Queue States */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        
        {/* Active Running Process */}
        <div className="bg-surface border border-border p-4 rounded-xl flex flex-col justify-between h-28">
          <div className="flex items-center justify-between text-xs text-textSecondary border-b border-border/60 pb-2">
            <span className="flex items-center space-x-1"><Eye className="w-3.5 h-3.5 text-accent" /> <span>CPU Core</span></span>
            <span className="bg-accent/10 px-2 py-0.5 rounded text-accent font-semibold text-[10px]">RUNNING</span>
          </div>
          {runningProc ? (
            <div className="flex items-center space-x-3 mt-2">
              <div 
                className="w-3.5 h-3.5 rounded-full animate-ping"
                style={{ backgroundColor: `hsl(${(runningProc.pid * 137.5) % 360}, 70%, 55%)` }}
              />
              <div>
                <h4 className="text-sm font-bold text-textPrimary">{runningProc.name}</h4>
                <p className="text-[10px] text-textSecondary">PID: {runningProc.pid} | Wait: {runningProc.waiting_time}ms</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-textSecondary italic text-xs mt-2">
              <Clock className="w-4 h-4 text-textSecondary animate-spin" />
              <span>CPU Core Idle</span>
            </div>
          )}
        </div>

        {/* Ready Queue */}
        <div className="bg-surface border border-border p-4 rounded-xl flex flex-col justify-between h-28 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-textSecondary border-b border-border/60 pb-2">
            <span>READY QUEUE</span>
            <span className="text-[10px] font-semibold text-textSecondary">{readyProcs.length} process(es)</span>
          </div>
          <div className="flex flex-wrap gap-1.5 overflow-y-auto mt-2 py-1 max-h-16">
            {readyProcs.length > 0 ? (
              readyProcs.map(p => (
                <span 
                  key={`ready-badge-${p.pid}`}
                  className="px-2 py-0.5 rounded text-[10px] bg-border border border-border text-textPrimary hover:bg-border/80 cursor-default"
                >
                  {p.name}
                </span>
              ))
            ) : (
              <span className="text-textSecondary italic text-xs">Queue empty</span>
            )}
          </div>
        </div>

        {/* IO Wait Queue */}
        <div className="bg-surface border border-border p-4 rounded-xl flex flex-col justify-between h-28 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-textSecondary border-b border-border/60 pb-2">
            <span>I/O WAIT BLOCK</span>
            <span className="text-[10px] font-semibold text-warning">{ioProcs.length} process(es)</span>
          </div>
          <div className="flex flex-wrap gap-1.5 overflow-y-auto mt-2 py-1 max-h-16">
            {ioProcs.length > 0 ? (
              ioProcs.map(p => (
                <span 
                  key={`io-badge-${p.pid}`}
                  className="px-2 py-0.5 rounded text-[10px] bg-warning/10 border border-warning/20 text-warning hover:bg-warning/20 cursor-default"
                >
                  {p.name}
                </span>
              ))
            ) : (
              <span className="text-textSecondary italic text-xs">No pending I/O</span>
            )}
          </div>
        </div>
      </div>

      {/* Replay Scrubber and Controls */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between text-xs text-textSecondary font-mono">
          <span>Simulation Scrubber</span>
          <span className="text-textPrimary font-semibold text-sm">
            {currentTime.toFixed(2)} ms / {maxTime.toFixed(2)} ms
          </span>
        </div>

        {/* Slider bar */}
        <input
          type="range"
          min="0"
          max={maxTime}
          step="0.05"
          value={currentTime}
          onChange={(e) => setReplayTime(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none"
        />

        {/* Button Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          
          {/* Main playback control block */}
          <div className="flex items-center space-x-1.5 bg-surface border border-border px-2 py-1 rounded-xl">
            <button
              onClick={resetReplay}
              className="p-2 hover:bg-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
              title="Reset Timeline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={stepBack}
              className="p-2 hover:bg-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
              title="Step Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={isPlaying ? pauseReplay : playReplay}
              className="p-3 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-md transition-all scale-100 hover:scale-105"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={stepForward}
              className="p-2 hover:bg-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
              title="Step Forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Speed settings */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-textSecondary font-mono">Speed:</span>
            <div className="bg-surface border border-border p-0.5 rounded-xl flex space-x-0.5 font-mono text-xs">
              {[0.5, 1.0, 2.0, 5.0].map((s) => (
                <button
                  key={`speed-btn-${s}`}
                  onClick={() => useSimulationStore.setState(state => ({
                    replayState: { ...state.replayState, speed: s }
                  }))}
                  className={`px-2 py-1 rounded-md transition-all ${
                    speed === s 
                      ? 'bg-accent text-white shadow'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-border/40'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="flex flex-col space-y-2 border-t border-border pt-4">
        <h4 className="text-xs font-mono font-semibold text-textSecondary flex items-center space-x-1">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <span>Simulation Event Log Console</span>
        </h4>
        
        <div 
          ref={logContainerRef}
          className="h-32 overflow-y-auto bg-black/50 border border-border rounded-xl p-4 font-mono text-[11px] leading-relaxed text-textSecondary flex flex-col space-y-1.5"
        >
          {visibleEvents.length > 0 ? (
            visibleEvents.map((evt, idx) => {
              const isLatest = idx === visibleEvents.length - 1;
              return (
                <div 
                  key={`log-${idx}`}
                  className={`flex items-start space-x-2 transition-colors ${
                    isLatest ? 'text-accent border-l-2 border-accent pl-1.5' : 'text-textSecondary/80'
                  }`}
                >
                  <span className="text-textSecondary min-w-[55px] font-bold">[{evt.timestamp.toFixed(2)}ms]</span>
                  <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-border text-textPrimary shrink-0">
                    {evt.event_type}
                  </span>
                  <span>{evt.message}</span>
                </div>
              );
            })
          ) : (
            <div className="text-textSecondary italic text-[11px] flex items-center space-x-1.5">
              <span>Console awaiting start... Press Play to initiate trace playback.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
