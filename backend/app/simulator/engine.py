from typing import List, Dict, Any, Optional, Tuple
from app.models.process import SimulationConfig, Process, IOBurst
from app.simulator.event_queue import EventQueue
from app.simulator.algorithms.base import ProcessState, IOBurstState
from app.simulator.algorithms import (
    FCFSScheduler,
    RoundRobinScheduler,
    SJFScheduler,
    PriorityScheduler,
    MLFQScheduler,
    LotteryScheduler
)
import numpy as np

class SimulationEngine:
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.event_queue = EventQueue()
        self.trace = []
        
        # Initialize internal ProcessState list
        self.processes: Dict[int, ProcessState] = {}
        for p in config.processes:
            io_burst_states = [
                IOBurstState(start_offset=io.start_offset, duration=io.duration)
                for io in (p.io_bursts or [])
            ]
            # Ensure io bursts are sorted by start_offset
            io_burst_states.sort(key=lambda x: x.start_offset)
            
            self.processes[p.pid] = ProcessState(
                pid=p.pid,
                name=p.name,
                arrival_time=p.arrival_time,
                burst_time=p.burst_time,
                priority=p.priority,
                tickets=p.tickets,
                io_bursts=io_burst_states
            )
            
        # Select active scheduler
        self.scheduler = self._get_scheduler()
        
        self.ready_queue: List[ProcessState] = []
        self.io_queue: List[ProcessState] = []
        self.running_process: Optional[ProcessState] = None
        self.run_start_time: float = 0.0
        self.current_time: float = 0.0
        self.total_overhead_time: float = 0.0
        self.cpu_busy_until: float = 0.0

    def _get_scheduler(self):
        algo = self.config.algorithm
        if algo == "fcfs":
            return FCFSScheduler()
        elif algo == "rr":
            return RoundRobinScheduler()
        elif algo == "sjf":
            return SJFScheduler(preemptive=False)
        elif algo == "sjf_preemptive":
            return SJFScheduler(preemptive=True)
        elif algo == "priority":
            return PriorityScheduler()
        elif algo == "priority_aging":
            return PriorityScheduler()
        elif algo == "mlfq":
            return MLFQScheduler(
                num_queues=self.config.mlfq_queues,
                quantums=self.config.mlfq_quantums
            )
        elif algo == "lottery":
            # Using simulation_speed or another deterministic source for seeding
            return LotteryScheduler(seed=42)
        else:
            return FCFSScheduler()

    def _log_trace(self, event_type: str, pid: Optional[int], message: str):
        ready_pids = [p.pid for p in self.ready_queue]
        io_pids = [p.pid for p in self.io_queue]
        running_pid = self.running_process.pid if self.running_process else None
        
        self.trace.append({
            "timestamp": round(self.current_time, 4),
            "event_type": event_type,
            "pid": pid,
            "message": message,
            "running_pid": running_pid,
            "ready_queue": ready_pids,
            "io_queue": io_pids
        })

    def _preempt_running_process(self):
        """Preempt the currently running process and return it to the ready queue."""
        if not self.running_process:
            return
        
        p = self.running_process
        duration = self.current_time - self.run_start_time
        if duration > 0:
            p.remaining_burst -= duration
            p.run_segments.append((self.run_start_time, self.current_time))
            
        p.context_switches += 1
        p.last_ready_time = self.current_time
        self.ready_queue.append(p)
        
        # Cancel any scheduled CPU events for this process
        self.event_queue.remove_by_pid_and_type(p.pid, "PROCESS_COMPLETE")
        self.event_queue.remove_by_pid_and_type(p.pid, "IO_START")
        self.event_queue.remove_by_pid_and_type(p.pid, "QUANTUM_EXPIRE")
        
        self.scheduler.on_preempt(p, self.current_time)
        self.running_process = None

    def _schedule_next_process(self):
        """Determine which process should run next and schedule its PROCESS_START."""
        if not self.ready_queue:
            return
        
        selected = self.scheduler.select_next(self.ready_queue, self.current_time)
        if not selected:
            return
        
        # Handle context switch overhead if switching between different processes
        if self.running_process and self.running_process.pid != selected.pid:
            # Preempt old process
            old_p = self.running_process
            self._preempt_running_process()
            
            # Apply context switch overhead
            overhead = self.config.context_switch_overhead
            self.total_overhead_time += overhead
            switch_done_time = self.current_time + overhead
            
            self._log_trace(
                "CONTEXT_SWITCH", 
                selected.pid, 
                f"Context switch: swapping CPU from P{old_p.pid} to P{selected.pid} (overhead {overhead}ms)"
            )
            
            # Lock the CPU for the overhead duration
            self.cpu_busy_until = switch_done_time
            
            # Remove from ready queue immediately to prevent double scheduling
            self.ready_queue.remove(selected)
            
            # Schedule PROCESS_START at completion of context switch
            self.event_queue.push(switch_done_time, "PROCESS_START", selected.pid)
            
        elif not self.running_process:
            # Transition from idle: we don't count context switch overhead or we do if preferred.
            # Standard: start immediately without context switch overhead (CPU was idle)
            self.ready_queue.remove(selected)
            self.event_queue.push(self.current_time, "PROCESS_START", selected.pid)

    def run(self) -> Tuple[List[Dict[str, Any]], Dict[int, ProcessState], float]:
        # Reset tracing
        self.trace.clear()
        self.event_queue.clear()
        self.current_time = 0.0
        self.total_overhead_time = 0.0
        self.cpu_busy_until = 0.0
        
        # Schedule process arrivals
        for p in self.processes.values():
            self.event_queue.push(p.arrival_time, "PROCESS_ARRIVE", p.pid)
            
        # Schedule periodic aging ticks if priority aging is active
        if self.config.algorithm == "priority_aging":
            self.event_queue.push(5.0, "AGING_TICK")
            
        # Schedule periodic MLFQ priority boost ticks if MLFQ is active
        if self.config.algorithm == "mlfq":
            self.event_queue.push(50.0, "MLFQ_BOOST_TICK")

        # Main Event Loop
        while not self.event_queue.is_empty() and self.current_time < self.config.max_time:
            event_time, event_type, pid, metadata = self.event_queue.pop()
            
            # Advance time
            self.current_time = event_time
            
            if event_type == "PROCESS_ARRIVE":
                p = self.processes[pid]
                p.last_ready_time = self.current_time
                self.ready_queue.append(p)
                self._log_trace("PROCESS_ARRIVE", pid, f"Process {p.name} arrived at time {self.current_time}")
                
                # If CPU is idle, start scheduling
                if not self.running_process and self.current_time >= self.cpu_busy_until:
                    self._schedule_next_process()
                # If algorithm is preemptive (e.g. SRTF or MLFQ), check if we need to preempt
                elif self.running_process and self.config.algorithm in ["sjf_preemptive", "priority", "priority_aging"]:
                    # Check if the arrived process is better than the running process
                    candidates = self.ready_queue + [self.running_process]
                    best = self.scheduler.select_next(candidates, self.current_time)
                    if best and best.pid != self.running_process.pid:
                        # Preempt and switch
                        self._schedule_next_process()
                        
            elif event_type == "PROCESS_START":
                # Ensure the CPU isn't locked by context switch
                if self.current_time < self.cpu_busy_until:
                    # Postpone start if CPU is busy (this shouldn't happen with correct scheduling)
                    self.event_queue.push(self.cpu_busy_until, "PROCESS_START", pid)
                    continue
                    
                p = self.processes[pid]
                self.running_process = p
                self.run_start_time = self.current_time
                
                if p.first_run_time is None:
                    p.first_run_time = self.current_time
                    
                # Calculate wait segment
                wait_start = p.last_ready_time if p.last_ready_time is not None else p.arrival_time
                if self.current_time > wait_start:
                    p.wait_segments.append((wait_start, self.current_time))
                    
                self._log_trace("PROCESS_START", pid, f"Process {p.name} started running on CPU")
                
                # Determine when the next event for this running process will occur.
                # 1. Check completion
                finish_time = self.current_time + p.remaining_burst
                
                # 2. Check next I/O burst
                io_trigger_time = None
                cumulative_run_so_far = p.burst_time - p.remaining_burst
                
                next_io = None
                for io in p.io_bursts:
                    if not io.completed and io.start_offset >= cumulative_run_so_far:
                        next_io = io
                        break
                
                if next_io:
                    offset_remaining = next_io.start_offset - cumulative_run_so_far
                    io_trigger_time = self.current_time + offset_remaining
                    
                # 3. Check quantum expiration
                quantum_expire_time = None
                if self.config.algorithm == "rr":
                    quantum_expire_time = self.current_time + self.config.time_quantum
                elif self.config.algorithm == "mlfq":
                    level = p.current_queue_level
                    quantum = self.scheduler.quantums[level]
                    quantum_expire_time = self.current_time + quantum
                    
                # Determine earliest event
                earliest_time = finish_time
                next_event = "PROCESS_COMPLETE"
                
                if io_trigger_time is not None and io_trigger_time < earliest_time:
                    earliest_time = io_trigger_time
                    next_event = "IO_START"
                    
                if quantum_expire_time is not None and quantum_expire_time < earliest_time:
                    earliest_time = quantum_expire_time
                    next_event = "QUANTUM_EXPIRE"
                    
                # Schedule the event
                self.event_queue.push(earliest_time, next_event, p.pid)
                
            elif event_type == "PROCESS_COMPLETE":
                # Verify that this process is actually the one running
                if self.running_process and self.running_process.pid == pid:
                    p = self.running_process
                    duration = self.current_time - self.run_start_time
                    if duration > 0:
                        p.remaining_burst -= duration
                        p.run_segments.append((self.run_start_time, self.current_time))
                    
                    p.completion_time = self.current_time
                    self._log_trace("PROCESS_COMPLETE", pid, f"Process {p.name} completed execution")
                    self.running_process = None
                    
                    # Schedule next process
                    self._schedule_next_process()
                    
            elif event_type == "QUANTUM_EXPIRE":
                # Verify that this process is still running
                if self.running_process and self.running_process.pid == pid:
                    p = self.running_process
                    self._log_trace("QUANTUM_EXPIRE", pid, f"Time quantum expired for Process {p.name}")
                    
                    # Preempt the running process
                    # In MLFQ, demote level
                    if self.config.algorithm == "mlfq":
                        old_level = p.current_queue_level
                        p.current_queue_level = min(self.config.mlfq_queues - 1, p.current_queue_level + 1)
                        if p.current_queue_level != old_level:
                            self._log_trace(
                                "MLFQ_DEMOTE", 
                                pid, 
                                f"Process {p.name} demoted to queue level {p.current_queue_level} due to full quantum utilization"
                            )
                            
                    self._preempt_running_process()
                    self._schedule_next_process()
                    
            elif event_type == "IO_START":
                # Verify process is running
                if self.running_process and self.running_process.pid == pid:
                    p = self.running_process
                    duration = self.current_time - self.run_start_time
                    if duration > 0:
                        p.remaining_burst -= duration
                        p.run_segments.append((self.run_start_time, self.current_time))
                    
                    # Find and mark the current IO burst as completed
                    cumulative_run_so_far = p.burst_time - p.remaining_burst
                    active_io = None
                    for io in p.io_bursts:
                        if not io.completed and abs(io.start_offset - (cumulative_run_so_far - duration)) <= 0.01:
                            active_io = io
                            io.completed = True
                            break
                    
                    # Fallback to mark first uncompleted if offset math had floating point deviation
                    if not active_io:
                        for io in p.io_bursts:
                            if not io.completed:
                                active_io = io
                                io.completed = True
                                break
                                
                    io_duration = active_io.duration if active_io else 2.0
                    io_finish_time = self.current_time + io_duration
                    
                    self._log_trace(
                        "IO_START", 
                        pid, 
                        f"Process {p.name} initiated I/O operation for duration {io_duration}ms"
                    )
                    
                    self.io_queue.append(p)
                    self.running_process = None
                    
                    # Record segment start for IO
                    p.io_segments.append((self.current_time, io_finish_time))
                    
                    # Schedule IO complete
                    self.event_queue.push(io_finish_time, "IO_COMPLETE", p.pid)
                    
                    # Schedule next process
                    self._schedule_next_process()
                    
            elif event_type == "IO_COMPLETE":
                p = self.processes[pid]
                if p in self.io_queue:
                    self.io_queue.remove(p)
                
                p.last_ready_time = self.current_time
                self.ready_queue.append(p)
                self._log_trace("IO_COMPLETE", pid, f"Process {p.name} finished I/O operation and returned to ready queue")
                
                # Check for preemptions
                if not self.running_process and self.current_time >= self.cpu_busy_until:
                    self._schedule_next_process()
                elif self.running_process and self.config.algorithm in ["sjf_preemptive", "priority", "priority_aging"]:
                    candidates = self.ready_queue + [self.running_process]
                    best = self.scheduler.select_next(candidates, self.current_time)
                    if best and best.pid != self.running_process.pid:
                        self._schedule_next_process()
                        
            elif event_type == "AGING_TICK":
                if self.config.algorithm == "priority_aging" and self.ready_queue:
                    aged_pids = []
                    for p in self.ready_queue:
                        old_prio = p.priority
                        p.priority = max(1, p.priority - int(self.config.aging_rate) if self.config.aging_rate >= 1.0 else (p.priority - 1 if np.random.rand() < self.config.aging_rate else p.priority))
                        # Or simpler:
                        # p.priority = max(1, p.priority - 1) since lower number is higher priority.
                        # Let's do linear subtraction:
                        p.priority = max(1, round(p.priority - self.config.aging_rate, 2))
                        if p.priority < old_prio:
                            aged_pids.append(f"P{p.pid}({old_prio}->{p.priority})")
                            
                    if aged_pids:
                        self._log_trace(
                            "AGING_BOOST", 
                            None, 
                            f"Priority aging boost: {', '.join(aged_pids)}"
                        )
                # Reschedule next aging tick
                self.event_queue.push(self.current_time + 5.0, "AGING_TICK")
                
            elif event_type == "MLFQ_BOOST_TICK":
                # Boost all waiting processes back to queue 0
                boosted_pids = []
                for p in self.ready_queue:
                    if p.current_queue_level > 0:
                        p.current_queue_level = 0
                        boosted_pids.append(f"P{p.pid}")
                for p in self.io_queue:
                    if p.current_queue_level > 0:
                        p.current_queue_level = 0
                        boosted_pids.append(f"P{p.pid} (IO)")
                if self.running_process and self.running_process.current_queue_level > 0:
                    self.running_process.current_queue_level = 0
                    boosted_pids.append(f"P{self.running_process.pid} (running)")
                    
                    # Reschedule quantum expire based on queue 0 quantum
                    self.event_queue.remove_by_pid_and_type(self.running_process.pid, "QUANTUM_EXPIRE")
                    q0_quantum = self.scheduler.quantums[0]
                    self.event_queue.push(self.current_time + q0_quantum, "QUANTUM_EXPIRE", self.running_process.pid)
                    
                if boosted_pids:
                    self._log_trace(
                        "MLFQ_BOOST", 
                        None, 
                        f"Priority boost: reset all processes to queue level 0: {', '.join(boosted_pids)}"
                    )
                # Reschedule next boost tick
                self.event_queue.push(self.current_time + 50.0, "MLFQ_BOOST_TICK")
                
        # Final cleanup for remaining running process if any at cutoff time
        if self.running_process:
            p = self.running_process
            p.run_segments.append((self.run_start_time, self.current_time))
            p.remaining_burst = max(0.0, p.remaining_burst - (self.current_time - self.run_start_time))
            if p.remaining_burst == 0.0:
                p.completion_time = self.current_time
                
        return self.trace, self.processes, self.total_overhead_time
