from typing import List, Optional
from app.simulator.algorithms.base import BaseScheduler, ProcessState

class PriorityScheduler(BaseScheduler):
    name = "Priority Scheduling"
    description = "Schedules the process with the highest priority (lowest priority number: 1 = highest, 10 = lowest). Aging boosts priority over time to prevent starvation."

    def select_next(self, ready_queue: List[ProcessState], current_time: float) -> Optional[ProcessState]:
        if not ready_queue:
            return None
        # Select lowest priority number.
        # Tie-break with arrival time and pid.
        return min(ready_queue, key=lambda p: (p.priority, p.arrival_time, p.pid))
