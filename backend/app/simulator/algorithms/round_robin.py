from typing import List, Optional
from app.simulator.algorithms.base import BaseScheduler, ProcessState

class RoundRobinScheduler(BaseScheduler):
    name = "Round Robin"
    description = "Preemptive Round Robin scheduling. Assigns a fixed time quantum to each process in a circular FIFO queue."

    def select_next(self, ready_queue: List[ProcessState], current_time: float) -> Optional[ProcessState]:
        if not ready_queue:
            return None
        # Select the process that has been waiting the longest in the ready queue (FIFO).
        # We sort by last_ready_time (which is set when entering the ready queue).
        # If last_ready_time is identical or None, tie-break with arrival_time and pid.
        return min(
            ready_queue,
            key=lambda p: (
                p.last_ready_time if p.last_ready_time is not None else p.arrival_time,
                p.pid
            )
        )
