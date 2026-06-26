import heapq
from typing import List, Tuple, Any, Optional

class EventQueue:
    def __init__(self):
        self._queue = []
        self._counter = 0  # Unique tie breaker for stability

    def push(self, time: float, event_type: str, pid: Optional[int] = None, metadata: Optional[dict] = None):
        """Push an event into the min-heap."""
        heapq.heappush(self._queue, (time, self._counter, event_type, pid, metadata or {}))
        self._counter += 1

    def pop(self) -> Tuple[float, str, Optional[int], dict]:
        """Pop the earliest event from the min-heap."""
        time, _, event_type, pid, metadata = heapq.heappop(self._queue)
        return time, event_type, pid, metadata

    def peek_time(self) -> Optional[float]:
        """Get the timestamp of the next event without popping."""
        if self._queue:
            return self._queue[0][0]
        return None

    def is_empty(self) -> bool:
        """Check if queue is empty."""
        return len(self._queue) == 0

    def clear(self):
        """Reset the queue."""
        self._queue.clear()
        self._counter = 0

    def remove_by_pid_and_type(self, pid: int, event_type: str):
        """Remove future events of a specific type for a process (e.g. quantum expire or io start when preempted)."""
        new_queue = []
        for time, counter, et, p, meta in self._queue:
            if p == pid and et == event_type:
                continue
            new_queue.append((time, counter, et, p, meta))
        heapq.heapify(new_queue)
        self._queue = new_queue
