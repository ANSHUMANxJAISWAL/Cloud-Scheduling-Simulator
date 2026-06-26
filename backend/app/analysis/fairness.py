from typing import Dict, List
import numpy as np
from app.simulator.algorithms.base import ProcessState
from app.models.metrics import FairnessReport

class FairnessCalculator:
    @staticmethod
    def calculate(processes: Dict[int, ProcessState]) -> FairnessReport:
        if not processes:
            return FairnessReport(jains_index=1.0, cv_waiting=0.0)
            
        n = len(processes)
        
        # xi = CPU time allocated to process i
        cpu_allocations = []
        waiting_times = []
        
        for p in processes.values():
            run_time = sum(end - start for start, end in p.run_segments)
            cpu_allocations.append(run_time)
            
            wait_time = sum(end - start for start, end in p.wait_segments)
            waiting_times.append(wait_time)
            
        # Jain's Fairness Index: J = (sum(xi))^2 / (n * sum(xi^2))
        sum_x = sum(cpu_allocations)
        sum_x_sq = sum(x ** 2 for x in cpu_allocations)
        
        if sum_x_sq > 0:
            jains_index = (sum_x ** 2) / (n * sum_x_sq)
        else:
            jains_index = 1.0  # If all got 0, it's technically equal, hence fair
            
        # Coefficient of variation of waiting times: CV = std_dev / mean
        mean_wait = np.mean(waiting_times)
        std_wait = np.std(waiting_times)
        
        if mean_wait > 0:
            cv_waiting = std_wait / mean_wait
        else:
            cv_waiting = 0.0
            
        return FairnessReport(
            jains_index=round(float(jains_index), 4),
            cv_waiting=round(float(cv_waiting), 4)
        )
