from typing import Dict, List, Any
from app.simulator.algorithms.base import ProcessState
from app.models.metrics import StarvationReport, StarvationEvent

class StarvationDetector:
    @staticmethod
    def detect(processes: Dict[int, ProcessState], avg_waiting_time: float) -> StarvationReport:
        # Prevent division by zero or comparison with zero wait time
        avg_wait = max(avg_waiting_time, 1.0)
        
        starved = []
        at_risk = []
        starvation_events = []
        max_starvation_gap = 0.0
        
        for pid, p in processes.items():
            # Total waiting time for this process
            wait_time = sum(end - start for start, end in p.wait_segments)
            
            if wait_time > 3.0 * avg_wait:
                starved.append(pid)
            elif wait_time > 2.0 * avg_wait:
                at_risk.append(pid)
            
            # Find individual wait segments that caused long gaps
            for start, end in p.wait_segments:
                gap = end - start
                max_starvation_gap = max(max_starvation_gap, gap)
                
                # If a process had a single wait segment longer than 2x avg wait time, flag it
                if gap > 2.0 * avg_wait:
                    starvation_events.append(StarvationEvent(
                        pid=pid,
                        wait_start=round(start, 2),
                        wait_end=round(end, 2),
                        duration=round(gap, 2)
                    ))
                    
        return StarvationReport(
            starved=starved,
            at_risk=at_risk,
            max_starvation_gap=round(max_starvation_gap, 2),
            starvation_events=starvation_events
        )
