from typing import List, Optional
from app.simulator.algorithms.base import BaseScheduler, ProcessState

class SJFScheduler(BaseScheduler):
    name = "Shortest Job First"
    description = "Schedules the process with the shortest burst/remaining time. Supports both preemptive (SRTF) and non-preemptive modes."

    def __init__(self, preemptive: bool = False):
        self.preemptive = preemptive

    def select_next(self, ready_queue: List[ProcessState], current_time: float) -> Optional[ProcessState]:
        if not ready_queue:
            return None
        # Pick the process with the minimum remaining burst time.
        # Tie-break with arrival time and pid.
        return min(ready_queue, key=lambda p: (p.remaining_burst, p.arrival_time, p.pid))
