from typing import List, Optional
from app.simulator.algorithms.base import BaseScheduler, ProcessState

class FCFSScheduler(BaseScheduler):
    name = "First Come First Served"
    description = "Non-preemptive scheduler. Selects the process that arrived earliest in the system."

    def select_next(self, ready_queue: List[ProcessState], current_time: float) -> Optional[ProcessState]:
        if not ready_queue:
            return None
        # Sort by arrival_time; secondary sorting by pid to ensure stability
        return min(ready_queue, key=lambda p: (p.arrival_time, p.pid))
