from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ProcessMetric(BaseModel):
    pid: int
    name: str
    waiting_time: float
    turnaround_time: float
    response_time: float
    completion_time: float
    cpu_utilization_share: float
    context_switches: int

class AggregateMetrics(BaseModel):
    avg_waiting_time: float
    avg_turnaround_time: float
    avg_response_time: float
    throughput: float
    cpu_utilization: float
    idle_time: float
    max_waiting_time: float
    min_waiting_time: float
    p99_waiting_time: float
    context_switch_overhead: float

class AlgorithmMetrics(BaseModel):
    processes: List[ProcessMetric]
    aggregate: AggregateMetrics

class TraceEvent(BaseModel):
    timestamp: float
    event_type: str
    pid: Optional[int] = None
    message: str
    running_pid: Optional[int] = None
    ready_queue: List[int] = []
    io_queue: List[int] = []

class StarvationEvent(BaseModel):
    pid: int
    wait_start: float
    wait_end: float
    duration: float

class StarvationReport(BaseModel):
    starved: List[int]
    at_risk: List[int]
    max_starvation_gap: float
    starvation_events: List[StarvationEvent]

class FairnessReport(BaseModel):
    jains_index: float
    cv_waiting: float

class SimulationResult(BaseModel):
    trace: List[TraceEvent]
    metrics: AlgorithmMetrics
    starvation: StarvationReport
    fairness: FairnessReport

class MetricRankingItem(BaseModel):
    algorithm: str
    value: float

class MetricRanking(BaseModel):
    metric: str
    ranking: List[MetricRankingItem]

class BestForReport(BaseModel):
    throughput: str
    fairness: str
    avg_wait: str
    response_time: str

class ComparisonReport(BaseModel):
    results: Dict[str, SimulationResult]
    comparison: Any
