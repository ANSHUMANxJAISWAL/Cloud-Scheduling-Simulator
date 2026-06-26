from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class IOBurst(BaseModel):
    start_offset: float = Field(..., description="Run time offset within burst when IO starts")
    duration: float = Field(..., description="Duration of IO operation")

class Process(BaseModel):
    pid: int
    name: str
    arrival_time: float
    burst_time: float
    priority: int = Field(default=5, ge=1, le=10, description="Priority: 1=highest, 10=lowest")
    tickets: int = Field(default=10, ge=1, description="Tickets for Lottery scheduling")
    io_bursts: Optional[List[IOBurst]] = Field(default_factory=list)

class SimulationConfig(BaseModel):
    processes: List[Process]
    algorithm: Literal[
        "fcfs",
        "rr",
        "sjf",
        "sjf_preemptive",
        "priority",
        "priority_aging",
        "mlfq",
        "lottery"
    ]
    time_quantum: float = Field(default=2.0, ge=0.1)
    aging_rate: float = Field(default=0.5, ge=0.0)
    mlfq_queues: int = Field(default=3, ge=1, le=5)
    mlfq_quantums: List[float] = Field(default_factory=lambda: [2.0, 4.0, 8.0])
    simulation_speed: float = Field(default=1.0)
    max_time: float = Field(default=1000.0)
    context_switch_overhead: float = Field(default=0.1, ge=0.0)
