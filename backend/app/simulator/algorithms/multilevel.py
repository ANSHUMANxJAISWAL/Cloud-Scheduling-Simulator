from typing import List, Optional
from app.simulator.algorithms.base import BaseScheduler, ProcessState

class MLFQScheduler(BaseScheduler):
    name = "Multilevel Feedback Queue"
    description = "Multiple queues with different time quantums. Demotes processes that use their full quantum, and periodically boosts all processes to queue 0."

    def __init__(self, num_queues: int = 3, quantums: List[float] = None):
        self.num_queues = num_queues
        # Use default quantums if none provided, matching num_queues size
        if quantums is None:
            self.quantums = [2.0 * (2 ** i) for i in range(num_queues)]
        else:
            self.quantums = list(quantums)
            if len(self.quantums) < num_queues:
                last_q = self.quantums[-1] if self.quantums else 2.0
                self.quantums.extend([last_q * (2 ** i) for i in range(1, num_queues - len(self.quantums) + 1)])
            self.quantums = self.quantums[:num_queues]

    def select_next(self, ready_queue: List[ProcessState], current_time: float) -> Optional[ProcessState]:
        if not ready_queue:
            return None
        
        # Find the highest priority queue level that has waiting processes.
        # Queue 0 is the highest priority, and queue N-1 is the lowest.
        min_level = min(p.current_queue_level for p in ready_queue)
        
        # Filter processes at this queue level
        candidates = [p for p in ready_queue if p.current_queue_level == min_level]
        
        # Within the same queue, process in FIFO order using last_ready_time
        return min(
            candidates,
            key=lambda p: (
                p.last_ready_time if p.last_ready_time is not None else p.arrival_time,
                p.pid
            )
        )
