from dataclasses import dataclass, field
from typing import List, Optional, Tuple

@dataclass
class IOBurstState:
    start_offset: float
    duration: float
    completed: bool = False

@dataclass
class ProcessState:
    pid: int
    name: str
    arrival_time: float
    burst_time: float
    priority: int
    tickets: int
    io_bursts: List[IOBurstState] = field(default_factory=list)

    # Simulation tracking metrics
    remaining_burst: float = 0.0
    current_io_index: int = 0
    first_run_time: Optional[float] = None
    completion_time: Optional[float] = None
    run_segments: List[Tuple[float, float]] = field(default_factory=list)
    wait_segments: List[Tuple[float, float]] = field(default_factory=list)
    io_segments: List[Tuple[float, float]] = field(default_factory=list)
    context_switches: int = 0

    # Intermediate queue tracing
    last_ready_time: Optional[float] = None
    current_queue_level: int = 0  # For MLFQ level (0 is highest)
    win_count: int = 0  # For Lottery wins
    original_priority: int = 0  # For Priority aging restore

    def __post_init__(self):
        self.remaining_burst = self.burst_time
        self.original_priority = self.priority

class BaseScheduler:
    name: str = "Base"
    description: str = "Abstract base scheduler class"

    def select_next(self, ready_queue: List[ProcessState], current_time: float) -> Optional[ProcessState]:
        """Select the next process to run from the ready queue."""
        raise NotImplementedError

    def on_preempt(self, process: ProcessState, current_time: float):
        """Callback when a process is preempted."""
        pass
