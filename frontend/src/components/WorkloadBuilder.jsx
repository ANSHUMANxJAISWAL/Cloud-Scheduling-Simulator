import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { simulationApi } from '../api/simulationApi';
import { 
  Plus, Trash2, Sparkles, FolderOpen, Save, 
  ChevronDown, ChevronUp, AlertCircle, FileJson
} from 'lucide-react';

export default function WorkloadBuilder() {
  const { 
    processes, 
    setProcesses, 
    updateProcess, 
    addProcess, 
    removeProcess, 
    generateWorkload, 
    isLoading 
  } = useSimulationStore();

  const [presets, setPresets] = useState([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState("");
  const [genPreset, setGenPreset] = useState("cpu_bound");
  const [genCount, setGenCount] = useState(5);
  const [genSeed, setGenSeed] = useState(42);
  const [expandedPids, setExpandedPids] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  
  const fileInputRef = useRef(null);

  // Fetch presets from backend on mount
  useEffect(() => {
    async function loadPresets() {
      try {
        const list = await simulationApi.getPresets();
        setPresets(list);
      } catch (err) {
        // Failover fallback in case backend is not running yet
        setPresets([
          {
            name: "Classic OS Textbook",
            description: "A standard set of CPU-bound processes",
            processes: [
              { pid: 1, name: "P1", arrival_time: 0.0, burst_time: 24.0, priority: 3, tickets: 10, io_bursts: [] },
              { pid: 2, name: "P2", arrival_time: 1.0, burst_time: 3.0, priority: 1, tickets: 30, io_bursts: [] },
              { pid: 3, name: "P3", arrival_time: 2.0, burst_time: 4.0, priority: 2, tickets: 20, io_bursts: [] }
            ]
          }
        ]);
      }
    }
    loadPresets();
  }, []);

  const handlePresetChange = (e) => {
    const idx = e.target.value;
    setSelectedPresetIndex(idx);
    if (idx !== "" && presets[idx]) {
      // Create a deep copy to prevent mutating presets
      const copy = JSON.parse(JSON.stringify(presets[idx].processes));
      setProcesses(copy);
    }
  };

  const handleGenerate = async () => {
    await generateWorkload(genPreset, genCount, genSeed);
  };

  const toggleExpand = (pid) => {
    setExpandedPids(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  const handleCellChange = (pid, field, value) => {
    const proc = processes.find(p => p.pid === pid);
    if (!proc) return;

    let parsedVal = value;
    if (field === 'arrival_time' || field === 'burst_time') {
      parsedVal = value === '' ? '' : parseFloat(value);
    } else if (field === 'priority' || field === 'tickets') {
      parsedVal = value === '' ? '' : parseInt(value, 10);
    }

    // Validation checks
    const errors = { ...validationErrors };
    const errorKey = `${pid}-${field}`;

    if (field === 'arrival_time' && (parsedVal < 0 || isNaN(parsedVal))) {
      errors[errorKey] = "Arrival must be >= 0";
    } else if (field === 'burst_time' && (parsedVal <= 0 || isNaN(parsedVal))) {
      errors[errorKey] = "Burst must be > 0";
    } else if (field === 'priority' && (parsedVal < 1 || parsedVal > 10 || isNaN(parsedVal))) {
      errors[errorKey] = "Priority 1-10";
    } else if (field === 'tickets' && (parsedVal < 1 || isNaN(parsedVal))) {
      errors[errorKey] = "Tickets >= 1";
    } else {
      delete errors[errorKey];
    }

    setValidationErrors(errors);

    const updated = { ...proc, [field]: parsedVal };
    updateProcess(updated);
  };

  // IO burst updates
  const addIOBurst = (pid) => {
    const proc = processes.find(p => p.pid === pid);
    if (!proc) return;

    const newIO = { start_offset: 1.0, duration: 5.0 };
    const updated = {
      ...proc,
      io_bursts: [...(proc.io_bursts || []), newIO]
    };
    updateProcess(updated);
  };

  const removeIOBurst = (pid, idx) => {
    const proc = processes.find(p => p.pid === pid);
    if (!proc) return;

    const nextIOs = [...(proc.io_bursts || [])];
    nextIOs.splice(idx, 1);
    const updated = { ...proc, io_bursts: nextIOs };
    updateProcess(updated);
  };

  const handleIOBurstChange = (pid, idx, field, value) => {
    const proc = processes.find(p => p.pid === pid);
    if (!proc) return;

    const nextIOs = [...(proc.io_bursts || [])];
    const parsedVal = value === '' ? '' : parseFloat(value);
    nextIOs[idx] = { ...nextIOs[idx], [field]: parsedVal };

    const updated = { ...proc, io_bursts: nextIOs };
    updateProcess(updated);
  };

  // JSON Import / Export
  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nebula_workload_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          setProcesses(parsed);
        } else {
          alert("Invalid workload format. Must be an array of processes.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  return (
    <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-6">
      
      {/* Header and Import/Export panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-300">
            Workload Registry Builder
          </h3>
          <p className="text-xs text-textSecondary font-mono mt-1">
            Construct target workload processes, configure IO interrupts, or download templates.
          </p>
        </div>
        
        <div className="flex space-x-2 bg-surface/50 border border-border p-1 rounded-xl">
          <button
            onClick={exportJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono hover:bg-border text-textPrimary transition-all"
            title="Export JSON template"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono hover:bg-border text-textPrimary transition-all"
            title="Import workload JSON"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={importJSON}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Preset Loading Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface/40 p-4 rounded-xl border border-border/80">
        <div>
          <label className="block text-xs font-mono font-semibold text-textSecondary mb-2">
            Load Pre-Configured Text Book Preset
          </label>
          <select
            value={selectedPresetIndex}
            onChange={handlePresetChange}
            className="w-full bg-surface border border-border text-xs rounded-xl p-2.5 font-mono text-textPrimary focus:outline-none focus:border-accent"
          >
            <option value="">-- Select Preset --</option>
            {presets.map((p, idx) => (
              <option key={`preset-opt-${idx}`} value={idx}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Workload Generation parameters */}
        <div>
          <label className="block text-xs font-mono font-semibold text-textSecondary mb-2">
            Synthetic Workload Generator
          </label>
          <div className="flex space-x-2">
            <select
              value={genPreset}
              onChange={(e) => setGenPreset(e.target.value)}
              className="bg-surface border border-border text-xs rounded-xl p-2.5 font-mono text-textPrimary focus:outline-none focus:border-accent flex-1"
            >
              <option value="cpu_bound">CPU Bound</option>
              <option value="io_bound">I/O Bound</option>
              <option value="mixed">Mixed Workload</option>
              <option value="bursty">Bursty Traffic</option>
              <option value="adversarial">Adversarial SJF</option>
            </select>
            
            <input
              type="number"
              min="1"
              max="20"
              value={genCount}
              onChange={(e) => setGenCount(parseInt(e.target.value) || 5)}
              className="w-14 bg-surface border border-border text-xs rounded-xl p-2.5 font-mono text-textPrimary text-center"
              title="Number of processes"
            />
            
            <button
              onClick={handleGenerate}
              className="bg-accent hover:bg-accent/90 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Process Editing Table */}
      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-surface text-textSecondary border-b border-border select-none">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 w-12 text-center">PID</th>
              <th className="px-4 py-3">Process Name</th>
              <th className="px-4 py-3 w-28">Arrival Time (ms)</th>
              <th className="px-4 py-3 w-28">Burst Time (ms)</th>
              <th className="px-4 py-3 w-20 text-center">Priority</th>
              <th className="px-4 py-3 w-20 text-center">Tickets</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {processes.map((p) => {
              const isExpanded = !!expandedPids[p.pid];
              return (
                <React.Fragment key={`edit-row-${p.pid}`}>
                  <tr className="hover:bg-surface/30 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(p.pid)}
                        className="p-1 hover:bg-border rounded text-textSecondary hover:text-textPrimary"
                        title="Edit I/O Bursts"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                    
                    <td className="px-4 py-3 text-center font-bold text-textSecondary">
                      {p.pid}
                    </td>
                    
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleCellChange(p.pid, 'name', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-accent/40 w-full focus:outline-none py-1"
                      />
                    </td>
                    
                    <td className="px-4 py-3 relative">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={p.arrival_time}
                        onChange={(e) => handleCellChange(p.pid, 'arrival_time', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-accent/40 w-full focus:outline-none py-1"
                      />
                      {validationErrors[`${p.pid}-arrival_time`] && (
                        <span className="absolute bottom-0.5 right-2 text-[9px] text-danger flex items-center space-x-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </td>
                    
                    <td className="px-4 py-3 relative">
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={p.burst_time}
                        onChange={(e) => handleCellChange(p.pid, 'burst_time', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-accent/40 w-full focus:outline-none py-1"
                      />
                      {validationErrors[`${p.pid}-burst_time`] && (
                        <span className="absolute bottom-0.5 right-2 text-[9px] text-danger flex items-center space-x-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </td>
                    
                    <td className="px-4 py-3 relative text-center">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={p.priority}
                        onChange={(e) => handleCellChange(p.pid, 'priority', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-accent/40 w-12 focus:outline-none py-1 text-center"
                      />
                      {validationErrors[`${p.pid}-priority`] && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] text-danger flex items-center space-x-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={p.tickets}
                        onChange={(e) => handleCellChange(p.pid, 'tickets', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-accent/40 w-12 focus:outline-none py-1 text-center"
                      />
                    </td>
                    
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeProcess(p.pid)}
                        className="p-1 hover:bg-danger/20 rounded text-textSecondary hover:text-danger transition-colors"
                        title="Delete process"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded I/O Bursts Row */}
                  {isExpanded && (
                    <tr className="bg-surface/10">
                      <td colSpan="8" className="p-4 border-l-2 border-warning/50">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-warning font-mono">
                              I/O Interruption Bursts for {p.name}
                            </span>
                            <button
                              onClick={() => addIOBurst(p.pid)}
                              className="flex items-center space-x-1 bg-warning/10 hover:bg-warning/20 border border-warning/20 px-2.5 py-1 rounded-lg text-warning text-[10px] font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add I/O Block</span>
                            </button>
                          </div>

                          {(p.io_bursts || []).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {p.io_bursts.map((io, ioIdx) => (
                                <div 
                                  key={`io-card-${p.pid}-${ioIdx}`}
                                  className="bg-surface border border-border p-3 rounded-xl flex items-center justify-between space-x-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-textSecondary">START OFFSET</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={io.start_offset}
                                        onChange={(e) => handleIOBurstChange(p.pid, ioIdx, 'start_offset', e.target.value)}
                                        className="bg-transparent border-b border-border text-xs w-16 focus:outline-none py-0.5"
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-textSecondary">DURATION</span>
                                      <input
                                        type="number"
                                        min="0.1"
                                        step="0.5"
                                        value={io.duration}
                                        onChange={(e) => handleIOBurstChange(p.pid, ioIdx, 'duration', e.target.value)}
                                        className="bg-transparent border-b border-border text-xs w-16 focus:outline-none py-0.5"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeIOBurst(p.pid, ioIdx)}
                                    className="p-1 hover:bg-danger/20 rounded text-textSecondary hover:text-danger"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-textSecondary italic text-[11px]">
                              No I/O interruptions configured. Process runs CPU-only until completion.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Row add action button */}
      <button
        onClick={() => addProcess({})}
        className="w-full border border-dashed border-border hover:border-accent hover:bg-accent/5 p-3 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold text-textSecondary hover:text-accent transition-all duration-300"
      >
        <Plus className="w-4 h-4" />
        <span>Add New Process Row</span>
      </button>
    </div>
  );
}
