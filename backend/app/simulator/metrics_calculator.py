from typing import Dict, List, Any
import numpy as np
from app.simulator.algorithms.base import ProcessState
from app.models.metrics import AlgorithmMetrics, ProcessMetric, AggregateMetrics

class MetricsCalculator:
    @staticmethod
    def calculate(
        processes: Dict[int, ProcessState], 
        total_time: float, 
        total_overhead: float
    ) -> AlgorithmMetrics:
        # Fallback for total_time if 0 to prevent division by zero
        sim_duration = max(total_time, 0.001)
        
        process_metrics = []
        waiting_times = []
        turnaround_times = []
        response_times = []
        
        total_busy_time = 0.0
        
        for pid, p in processes.items():
            # Total run time (sum of run segments)
            run_time = sum(end - start for start, end in p.run_segments)
            total_busy_time += run_time
            
            # Total IO time
            io_time = sum(end - start for start, end in p.io_segments)
            
            # Completion time
            comp_time = p.completion_time if p.completion_time is not None else sim_duration
            
            # Turnaround time
            turnaround = comp_time - p.arrival_time
            turnaround = max(turnaround, 0.0)
            
            # Waiting time (turnaround time - run time - io time)
            # Alternatively, sum wait segments
            wait = sum(end - start for start, end in p.wait_segments)
            # Ensure it is at least 0
            wait = max(wait, 0.0)
            
            # Response time (first run - arrival)
            resp = (p.first_run_time - p.arrival_time) if p.first_run_time is not None else turnaround
            resp = max(resp, 0.0)
            
            # CPU utilization share for this process (%)
            cpu_share = (run_time / sim_duration) * 100.0 if sim_duration > 0 else 0.0
            
            waiting_times.append(wait)
            turnaround_times.append(turnaround)
            response_times.append(resp)
            
            process_metrics.append(ProcessMetric(
                pid=p.pid,
                name=p.name,
                waiting_time=round(wait, 2),
                turnaround_time=round(turnaround, 2),
                response_time=round(resp, 2),
                completion_time=round(comp_time, 2),
                cpu_utilization_share=round(cpu_share, 2),
                context_switches=p.context_switches
            ))
            
        # Aggregate calculations
        num_processes = len(processes)
        avg_wait = np.mean(waiting_times) if num_processes > 0 else 0.0
        avg_turnaround = np.mean(turnaround_times) if num_processes > 0 else 0.0
        avg_response = np.mean(response_times) if num_processes > 0 else 0.0
        
        completed_count = sum(1 for p in processes.values() if p.completion_time is not None)
        throughput = completed_count / sim_duration if sim_duration > 0 else 0.0
        
        cpu_util = (total_busy_time / sim_duration) * 100.0 if sim_duration > 0 else 0.0
        cpu_util = min(cpu_util, 100.0)
        idle_time = max(sim_duration - total_busy_time - total_overhead, 0.0)
        
        max_wait = max(waiting_times) if waiting_times else 0.0
        min_wait = min(waiting_times) if waiting_times else 0.0
        p99_wait = np.percentile(waiting_times, 99) if waiting_times else 0.0
        
        aggregate = AggregateMetrics(
            avg_waiting_time=round(float(avg_wait), 2),
            avg_turnaround_time=round(float(avg_turnaround), 2),
            avg_response_time=round(float(avg_response), 2),
            throughput=round(float(throughput), 4),
            cpu_utilization=round(float(cpu_util), 2),
            idle_time=round(float(idle_time), 2),
            max_waiting_time=round(float(max_wait), 2),
            min_waiting_time=round(float(min_wait), 2),
            p99_waiting_time=round(float(p99_wait), 2),
            context_switch_overhead=round(total_overhead, 2)
        )
        
        return AlgorithmMetrics(
            processes=process_metrics,
            aggregate=aggregate
        )
