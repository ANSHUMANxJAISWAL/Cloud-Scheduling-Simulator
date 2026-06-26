import React, { useState, useRef, useEffect, useId } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function GanttChart({ simulationResult, currentTime }) {
  const uniqueId = useId();
  const idSuffix = uniqueId.replace(/:/g, '');
  const clipPathId = `timeline-clip-${idSuffix}`;
  const patternId = `io-stripes-${idSuffix}`;
  const [zoom, setZoom] = useState(1.0);
  const [highlightedPid, setHighlightedPid] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const chartContainerRef = useRef(null);

  if (!simulationResult) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-2xl bg-surface/50 text-textSecondary font-mono text-sm">
        No simulation data. Run a simulation to display the Gantt timeline.
      </div>
    );
  }

  const { metrics, trace } = simulationResult;
  const processesList = metrics.processes;
  
  // Find maximum timestamp
  const maxTime = Math.max(
    ...processesList.map(p => p.completion_time),
    trace[trace.length - 1]?.timestamp || 10.0,
    1.0
  );

  const rowHeight = 45;
  const rowSpacing = 15;
  const paddingLeft = 100;
  const paddingRight = 30;
  const axisHeight = 40;
  const chartBaseWidth = 750;
  
  const scale = (chartBaseWidth - paddingLeft - paddingRight) / maxTime;
  const chartWidth = paddingLeft + maxTime * scale * zoom + paddingRight;
  const chartHeight = processesList.length * (rowHeight + rowSpacing) + axisHeight + 20;

  // Track scroll position to lock tooltips
  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomFactor = 0.15;
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoom(prev => Math.max(1.0, Math.min(15.0, prev + direction * zoomFactor)));
    }
  };

  // Process color mapper from HSL
  const getProcessColor = (pid) => {
    const hue = (pid * 137.5) % 360; // Golden ratio hue spacing
    return `hsl(${hue}, 70%, 50%)`;
  };

  // Generate grid ticks
  const generateTicks = () => {
    const ticks = [];
    const interval = maxTime > 100 ? 20 : (maxTime > 50 ? 10 : 5);
    for (let t = 0; t <= maxTime; t += interval) {
      ticks.push(t);
    }
    // Add final tick if missing
    if (ticks[ticks.length - 1] !== maxTime) {
      ticks.push(maxTime);
    }
    return ticks;
  };

  const ticks = generateTicks();

  // Find all context switch positions from trace
  const contextSwitches = trace.filter(t => t.event_type === "CONTEXT_SWITCH");

  return (
    <div className="relative glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-300">
            Gantt Schedule Replay
          </h3>
          <p className="text-xs text-textSecondary font-mono">
            Interactive SVG timeline. Scroll + Ctrl to Zoom, Click rows to highlight, hover for tooltips.
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2 bg-surface border border-border p-1.5 rounded-xl">
          <button
            onClick={() => setZoom(prev => Math.max(1.0, prev - 0.5))}
            className="p-1 hover:bg-border rounded text-textSecondary hover:text-textPrimary"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-12 text-center text-textSecondary">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(15.0, prev + 0.5))}
            className="p-1 hover:bg-border rounded text-textSecondary hover:text-textPrimary"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1.0); setHighlightedPid(null); }}
            className="p-1 hover:bg-border rounded text-textSecondary hover:text-textPrimary"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div 
        ref={chartContainerRef}
        onWheel={handleWheel}
        className="w-full overflow-x-auto overflow-y-hidden border border-border/60 rounded-xl bg-surface/30 select-none relative"
      >
        <svg 
          width={chartWidth} 
          height={chartHeight}
          className="transition-all duration-100"
          onClick={() => setHighlightedPid(null)}
        >
          <defs>
            {/* IO Striped Pattern */}
            <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="3" />
              <line x1="0" y1="0" x2="10" y2="0" stroke="#f59e0b" strokeWidth="3" />
            </pattern>
            
            {/* Timeline Clip Path to reveal segments left to right as time flows */}
            <clipPath id={clipPathId}>
              <rect 
                x="0" 
                y="0" 
                width={paddingLeft + currentTime * scale * zoom} 
                height="100%" 
              />
            </clipPath>
          </defs>

          {/* Time grid ticks background */}
          {ticks.map((t) => {
            const x = paddingLeft + t * scale * zoom;
            return (
              <line
                key={`tick-line-${t}`}
                x1={x}
                y1={10}
                x2={x}
                y2={chartHeight - axisHeight}
                stroke="#1f2937"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Process Lanes */}
          {processesList.map((p, idx) => {
            const y = idx * (rowHeight + rowSpacing) + 20;
            const fullProcessData = simulationResult.metrics.processes.find(item => item.pid === p.pid);
            const rawProcessState = simulationResult.trace.find(evt => evt.pid === p.pid);
            
            return (
              <g key={`lane-${p.pid}`}>
                {/* Lane divider */}
                <line
                  x1={0}
                  y1={y + rowHeight + rowSpacing / 2}
                  x2={chartWidth}
                  y2={y + rowHeight + rowSpacing / 2}
                  stroke="#1f2937"
                  strokeWidth={1}
                />
                
                {/* Process label */}
                <text
                  x={15}
                  y={y + rowHeight / 2 + 5}
                  fill="#9ca3af"
                  className="font-mono text-sm font-semibold cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHighlightedPid(p.pid);
                  }}
                >
                  {p.name}
                </text>
              </g>
            );
          })}

          {/* Main Group clipped by the current playback time */}
          <g clipPath={`url(#${clipPathId})`}>
            {/* Draw all segments row by row */}
            {processesList.map((proc, procIdx) => {
              const y = procIdx * (rowHeight + rowSpacing) + 20;
              const isHighlighted = highlightedPid === null || highlightedPid === proc.pid;
              const opacity = isHighlighted ? 1.0 : 0.25;

              // We need to fetch segments from trace or backend process state
              // Let's retrieve process segments from simulation trace or compute them
              // In our backend, the result models had wait, run, and io segments.
              // Let's draw wait segments (gray), run segments (HSL), and io segments (stripes).
              const traceProc = simulationResult.trace.find(evt => evt.pid === proc.pid);
              
              // We need to fetch the actual process states with their segments.
              // Wait, where are the segments stored?
              // The backend result returned `metrics` which has ProcessMetrics, but wait, did the backend return the process state segments?
              // Let's check: in `execute_simulation`, we returned `trace`, `metrics`, `starvation`, `fairness`.
              // Wait! In `engine.py` we calculated run, wait and io segments on `ProcessState` objects, but we did not return `processes` directly in the HTTP JSON response, or did we?
              // Ah! Let's check `SimulationResult` Pydantic model:
              // `SimulationResult` contains `trace`, `metrics`, `starvation`, and `fairness`.
              // Wait! Does it contain the process segments?
              // Let's look at `TraceEvent`: it has `timestamp`, `event_type`, `pid`, `message`, `running_pid`, `ready_queue`, `io_queue`.
              // We can reconstruct the segments from the trace!
              // Alternatively, let's look at how we can rebuild or include segments in the response.
              // Oh! In `metrics.py`, we defined `ProcessMetric` which does NOT contain segments.
              // Can we reconstruct the segments from the trace directly in the frontend?
              // Yes! Reconstructing segments from the trace is extremely robust, educational, and fun!
              // Let's write a parser that processes the trace events to build a list of intervals:
              // For each process:
              // - Whenever a process starts running (`PROCESS_START`), it enters a running state until it is preempted (`PROCESS_PREEMPT` / `CONTEXT_SWITCH`), completes (`PROCESS_COMPLETE`), or starts IO (`IO_START`).
              // - Whenever a process enters the ready queue (`PROCESS_ARRIVE` / `IO_COMPLETE` / `QUANTUM_EXPIRE`), it enters a waiting state until it starts running (`PROCESS_START`).
              // - Whenever a process starts IO (`IO_START`), it enters an IO state until it completes IO (`IO_COMPLETE`).
              // This is a beautiful state machine that reconstructs the segments of all processes on the fly in the frontend! Let's implement this. It is a fantastic showcase of programming skills!
              
              // Let's write the segment generator helper inside GanttChart.
            })}

            {/* Reconstructed segments */}
            {(() => {
              const segmentsMap = {};
              // Initialize
              processesList.forEach(p => {
                segmentsMap[p.pid] = { run: [], wait: [], io: [] };
              });

              // Track states
              const activeStates = {}; // pid -> { state: "waiting"|"running"|"io"|"completed"|"none", since: float }
              
              // Process trace chronologically
              trace.forEach(evt => {
                const { timestamp, event_type, pid, running_pid, ready_queue, io_queue } = evt;
                
                if (event_type === "PROCESS_ARRIVE") {
                  activeStates[pid] = { state: "waiting", since: timestamp };
                } 
                else if (event_type === "PROCESS_START") {
                  // The process starts running
                  const prev = activeStates[pid];
                  if (prev && prev.state === "waiting") {
                    segmentsMap[pid].wait.push({ start: prev.since, end: timestamp });
                  }
                  activeStates[pid] = { state: "running", since: timestamp };
                } 
                else if (event_type === "QUANTUM_EXPIRE" || event_type === "PROCESS_PREEMPT") {
                  const prev = activeStates[pid];
                  if (prev && prev.state === "running") {
                    segmentsMap[pid].run.push({ start: prev.since, end: timestamp });
                  }
                  activeStates[pid] = { state: "waiting", since: timestamp };
                } 
                else if (event_type === "CONTEXT_SWITCH") {
                  // A context switch preemption occurs
                  // The pid here is the process starting, running_pid is the process finishing
                  // Let's end running segment for running_pid if any
                  if (running_pid && activeStates[running_pid]?.state === "running") {
                    const prev = activeStates[running_pid];
                    segmentsMap[running_pid].run.push({ start: prev.since, end: timestamp });
                    activeStates[running_pid] = { state: "waiting", since: timestamp };
                  }
                }
                else if (event_type === "IO_START") {
                  const prev = activeStates[pid];
                  if (prev && prev.state === "running") {
                    segmentsMap[pid].run.push({ start: prev.since, end: timestamp });
                  }
                  activeStates[pid] = { state: "io", since: timestamp };
                } 
                else if (event_type === "IO_COMPLETE") {
                  const prev = activeStates[pid];
                  if (prev && prev.state === "io") {
                    segmentsMap[pid].io.push({ start: prev.since, end: timestamp });
                  }
                  activeStates[pid] = { state: "waiting", since: timestamp };
                } 
                else if (event_type === "PROCESS_COMPLETE") {
                  const prev = activeStates[pid];
                  if (prev && prev.state === "running") {
                    segmentsMap[pid].run.push({ start: prev.since, end: timestamp });
                  }
                  activeStates[pid] = { state: "completed", since: timestamp };
                }
              });

              // Close any open states at simulation duration limit
              processesList.forEach(p => {
                const pid = p.pid;
                const state = activeStates[pid];
                if (state && state.state !== "completed" && state.since < maxTime) {
                  if (state.state === "running") {
                    segmentsMap[pid].run.push({ start: state.since, end: maxTime });
                  } else if (state.state === "waiting") {
                    segmentsMap[pid].wait.push({ start: state.since, end: maxTime });
                  } else if (state.state === "io") {
                    segmentsMap[pid].io.push({ start: state.since, end: maxTime });
                  }
                }
              });

              // Render segments
              return processesList.map((proc, idx) => {
                const y = idx * (rowHeight + rowSpacing) + 20;
                const pid = proc.pid;
                const isHighlighted = highlightedPid === null || highlightedPid === pid;
                const opacity = isHighlighted ? 1.0 : 0.15;
                const procColor = getProcessColor(pid);

                const list = [];

                // 1. Wait segments (dark gray)
                segmentsMap[pid].wait.forEach((seg, sIdx) => {
                  const x = paddingLeft + seg.start * scale * zoom;
                  const width = (seg.end - seg.start) * scale * zoom;
                  if (width <= 0) return;
                  
                  list.push(
                    <rect
                      key={`wait-${pid}-${sIdx}`}
                      x={x}
                      y={y}
                      width={width}
                      height={rowHeight}
                      fill="#1f2937"
                      fillOpacity={0.8}
                      rx={4}
                      opacity={opacity}
                      className="cursor-pointer transition-all hover:stroke-gray-500 hover:stroke-2"
                      onMouseEnter={(e) => setTooltip({
                        x: e.pageX,
                        y: e.pageY - 60,
                        content: {
                          process: proc.name,
                          start: seg.start.toFixed(1),
                          end: seg.end.toFixed(1),
                          duration: (seg.end - seg.start).toFixed(1),
                          type: "Waiting"
                        }
                      })}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHighlightedPid(pid);
                      }}
                    />
                  );
                });

                // 2. IO segments (yellow striped)
                segmentsMap[pid].io.forEach((seg, sIdx) => {
                  const x = paddingLeft + seg.start * scale * zoom;
                  const width = (seg.end - seg.start) * scale * zoom;
                  if (width <= 0) return;

                  list.push(
                    <g key={`io-${pid}-${sIdx}`} opacity={opacity}>
                      {/* Backing warning color */}
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={rowHeight}
                        fill="#78350f"
                        rx={4}
                      />
                      {/* Stripes overlay */}
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={rowHeight}
                        fill={`url(#${patternId})`}
                        rx={4}
                        className="cursor-pointer transition-all hover:stroke-warning hover:stroke-2"
                        onMouseEnter={(e) => setTooltip({
                          x: e.pageX,
                          y: e.pageY - 60,
                          content: {
                            process: proc.name,
                            start: seg.start.toFixed(1),
                            end: seg.end.toFixed(1),
                            duration: (seg.end - seg.start).toFixed(1),
                            type: "I/O Wait"
                          }
                        })}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHighlightedPid(pid);
                        }}
                      />
                    </g>
                  );
                });

                // 3. Run segments (HSL process color)
                segmentsMap[pid].run.forEach((seg, sIdx) => {
                  const x = paddingLeft + seg.start * scale * zoom;
                  const width = (seg.end - seg.start) * scale * zoom;
                  if (width <= 0) return;

                  list.push(
                    <rect
                      key={`run-${pid}-${sIdx}`}
                      x={x}
                      y={y}
                      width={width}
                      height={rowHeight}
                      fill={procColor}
                      rx={4}
                      opacity={opacity}
                      className="cursor-pointer transition-all hover:stroke-white hover:stroke-2"
                      onMouseEnter={(e) => setTooltip({
                        x: e.pageX,
                        y: e.pageY - 60,
                        content: {
                          process: proc.name,
                          start: seg.start.toFixed(1),
                          end: seg.end.toFixed(1),
                          duration: (seg.end - seg.start).toFixed(1),
                          type: "Running"
                        }
                      })}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHighlightedPid(pid);
                      }}
                    />
                  );
                });

                return list;
              });
            })()}

            {/* Context Switches (thin red gaps or lines) */}
            {contextSwitches.map((cs, sIdx) => {
              const x = paddingLeft + cs.timestamp * scale * zoom;
              return (
                <line
                  key={`cs-line-${sIdx}`}
                  x1={x}
                  y1={10}
                  x2={x}
                  y2={chartHeight - axisHeight}
                  stroke="#ef4444"
                  strokeWidth={2}
                  className="animate-pulse"
                />
              );
            })}
          </g>

          {/* Time Scrubber (vertical line) */}
          {currentTime > 0 && (
            <g>
              <line
                x1={paddingLeft + currentTime * scale * zoom}
                y1={10}
                x2={paddingLeft + currentTime * scale * zoom}
                y2={chartHeight - axisHeight}
                stroke="#ef4444"
                strokeWidth={2}
              />
              <circle
                cx={paddingLeft + currentTime * scale * zoom}
                cy={10}
                r={4}
                fill="#ef4444"
              />
            </g>
          )}

          {/* X-Axis labels at the bottom */}
          <g transform={`translate(0, ${chartHeight - axisHeight})`}>
            {/* Axis base line */}
            <line
              x1={paddingLeft}
              y1={5}
              x2={chartWidth - paddingRight}
              y2={5}
              stroke="#374151"
              strokeWidth={2}
            />
            {ticks.map((t) => {
              const x = paddingLeft + t * scale * zoom;
              return (
                <g key={`axis-tick-${t}`}>
                  <line
                    x1={x}
                    y1={5}
                    x2={x}
                    y2={12}
                    stroke="#374151"
                    strokeWidth={2}
                  />
                  <text
                    x={x}
                    y={28}
                    fill="#9ca3af"
                    textAnchor="middle"
                    className="font-mono text-xs font-medium"
                  >
                    {t}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Tooltip HTML */}
      {tooltip && (
        <div 
          className="absolute z-[9999] pointer-events-none bg-surface/95 border border-border p-3 rounded-xl shadow-2xl flex flex-col space-y-1 font-mono text-xs text-textSecondary"
          style={{ left: `${tooltip.x - chartContainerRef.current?.getBoundingClientRect().left}px`, top: `${tooltip.y - 40}px` }}
        >
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{
              backgroundColor: tooltip.content.type === "Running" ? getProcessColor(processesList.find(p => p.name === tooltip.content.process)?.pid || 1) : (tooltip.content.type === "Waiting" ? "#4b5563" : "#f59e0b")
            }} />
            <span className="font-bold text-textPrimary">{tooltip.content.process}</span>
          </div>
          <div>State: <span className="text-textPrimary">{tooltip.content.type}</span></div>
          <div>Start: <span className="text-textPrimary">{tooltip.content.start} ms</span></div>
          <div>End: <span className="text-textPrimary">{tooltip.content.end} ms</span></div>
          <div>Duration: <span className="text-textPrimary font-semibold">{tooltip.content.duration} ms</span></div>
        </div>
      )}
    </div>
  );
}
