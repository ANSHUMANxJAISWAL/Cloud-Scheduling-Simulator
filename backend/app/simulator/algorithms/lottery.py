import random
from typing import List, Optional
from app.simulator.algorithms.base import BaseScheduler, ProcessState

class LotteryScheduler(BaseScheduler):
    name = "Lottery Scheduling"
    description = "A randomized scheduler that allocates tickets to processes and selects a winner by drawing a ticket at random."

    def __init__(self, seed: Optional[int] = None):
        self.seed = seed
        # Localized random generator to prevent global state contamination
        self.rng = random.Random(seed)

    def select_next(self, ready_queue: List[ProcessState], current_time: float) -> Optional[ProcessState]:
        if not ready_queue:
            return None
        
        # Sum tickets of all processes in the ready queue
        total_tickets = sum(p.tickets for p in ready_queue)
        if total_tickets == 0:
            return ready_queue[0]
        
        # Draw a winning ticket (1-based range)
        winning_ticket = self.rng.randint(1, total_tickets)
        
        # Find the process that owns the winning ticket range
        current_sum = 0
        for process in ready_queue:
            current_sum += process.tickets
            if winning_ticket <= current_sum:
                process.win_count += 1
                return process
        
        return ready_queue[-1]
