from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import asyncio
from functools import lru_cache

from app.models.process import SimulationConfig, Process, IOBurst
from app.models.metrics import SimulationResult
from app.simulator.engine import SimulationEngine
from app.simulator.metrics_calculator import MetricsCalculator
from app.analysis.starvation_detector import StarvationDetector
from app.analysis.fairness import FairnessCalculator

router = APIRouter()

# Helper to convert SimulationConfig to hashable form for caching
def make_config_hashable(config: SimulationConfig):
    # Sort processes by pid to make cache key invariant to ordering
    sorted_procs = sorted(config.processes, key=lambda p: p.pid)
    
    proc_tuples = []
    for p in sorted_procs:
        io_tuples = tuple((io.start_offset, io.duration) for io in (p.io_bursts or []))
        proc_tuples.append((
            p.pid,
            p.name,
            p.arrival_time,
            p.burst_time,
            p.priority,
            p.tickets,
            io_tuples
        ))
        
    config_tuple = (
        config.algorithm,
        config.time_quantum,
        config.aging_rate,
        config.mlfq_queues,
        tuple(config.mlfq_quantums),
        config.context_switch_overhead,
        config.max_time
    )
    
    return (tuple(proc_tuples), config_tuple)

def execute_simulation(config: SimulationConfig) -> Dict[str, Any]:
    engine = SimulationEngine(config)
    trace, processes, total_overhead = engine.run()
    
    # Calculate simulation total time (last event time or max completion time)
    last_event_time = trace[-1]["timestamp"] if trace else 0.0
    
    metrics = MetricsCalculator.calculate(processes, last_event_time, total_overhead)
    starvation = StarvationDetector.detect(processes, metrics.aggregate.avg_waiting_time)
    fairness = FairnessCalculator.calculate(processes)
    
    return {
        "trace": trace,
        "metrics": metrics.model_dump(),
        "starvation": starvation.model_dump(),
        "fairness": fairness.model_dump()
    }

@lru_cache(maxsize=128)
def get_cached_simulation(hashable_key) -> Dict[str, Any]:
    # We retrieve the actual configuration by unpacking the hashable key or rebuilding it
    proc_tuples, config_tuple = hashable_key
    
    processes = []
    for pt in proc_tuples:
        pid, name, arrival, burst, prio, tickets, io_tuples = pt
        io_bursts = [IOBurst(start_offset=io[0], duration=io[1]) for io in io_tuples]
        processes.append(Process(
            pid=pid,
            name=name,
            arrival_time=arrival,
            burst_time=burst,
            priority=prio,
            tickets=tickets,
            io_bursts=io_bursts
        ))
        
    algo, tq, ar, mlfq_q, mlfq_quants, cso, mt = config_tuple
    config = SimulationConfig(
        processes=processes,
        algorithm=algo,
        time_quantum=tq,
        aging_rate=ar,
        mlfq_queues=mlfq_q,
        mlfq_quantums=list(mlfq_quants),
        context_switch_overhead=cso,
        max_time=mt
    )
    return execute_simulation(config)

@router.post("", response_model=SimulationResult)
def run_simulation(config: SimulationConfig):
    try:
        hash_key = make_config_hashable(config)
        result = get_cached_simulation(hash_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

class BatchSimulationRequest(BaseModel):
    configs: List[SimulationConfig]

@router.post("/batch", response_model=List[SimulationResult])
async def run_batch_simulation(req: BatchSimulationRequest):
    if len(req.configs) > 10:
        raise HTTPException(status_code=400, detail="Maximum batch size is 10")
        
    loop = asyncio.get_running_loop()
    
    # Run CPU-bound simulations in parallel in executor threads
    def run_sim(config):
        hash_key = make_config_hashable(config)
        return get_cached_simulation(hash_key)
        
    tasks = [
        loop.run_in_executor(None, run_sim, config)
        for config in req.configs
    ]
    
    results = await asyncio.gather(*tasks)
    return results

@router.get("/presets")
def get_presets():
    return [
        {
            "name": "Classic OS Textbook",
            "description": "Standard set of CPU-bound processes arriving closely together. Demonstrates convoy effect in FCFS and benefits of SJF/Round Robin.",
            "processes": [
                {"pid": 1, "name": "P1", "arrival_time": 0.0, "burst_time": 24.0, "priority": 3, "tickets": 10, "io_bursts": []},
                {"pid": 2, "name": "P2", "arrival_time": 1.0, "burst_time": 3.0, "priority": 1, "tickets": 30, "io_bursts": []},
                {"pid": 3, "name": "P3", "arrival_time": 2.0, "burst_time": 4.0, "priority": 2, "tickets": 20, "io_bursts": []}
            ]
        },
        {
            "name": "Web Server Simulation",
            "description": "High frequency, low burst CPU requests with heavy I/O requirements. Showcases how Round Robin and MLFQ handle interactive sessions efficiently.",
            "processes": [
                {"pid": 1, "name": "HTTP_GET_1", "arrival_time": 0.0, "burst_time": 4.0, "priority": 2, "tickets": 15, "io_bursts": [{"start_offset": 1.0, "duration": 8.0}]},
                {"pid": 2, "name": "HTTP_POST", "arrival_time": 1.0, "burst_time": 6.0, "priority": 4, "tickets": 10, "io_bursts": [{"start_offset": 2.0, "duration": 15.0}]},
                {"pid": 3, "name": "HTTP_GET_2", "arrival_time": 2.0, "burst_time": 3.0, "priority": 1, "tickets": 25, "io_bursts": [{"start_offset": 1.0, "duration": 5.0}]},
                {"pid": 4, "name": "DB_QUERY", "arrival_time": 4.0, "burst_time": 8.0, "priority": 3, "tickets": 20, "io_bursts": [{"start_offset": 3.0, "duration": 20.0}]}
            ]
        },
        {
            "name": "Batch Processing",
            "description": "Long-running, computational-heavy batch workloads with no I/O. Ideal for studying maximum throughput algorithms.",
            "processes": [
                {"pid": 1, "name": "Batch_Job_A", "arrival_time": 0.0, "burst_time": 50.0, "priority": 8, "tickets": 10, "io_bursts": []},
                {"pid": 2, "name": "Batch_Job_B", "arrival_time": 10.0, "burst_time": 80.0, "priority": 10, "tickets": 10, "io_bursts": []},
                {"pid": 3, "name": "Batch_Job_C", "arrival_time": 15.0, "burst_time": 30.0, "priority": 5, "tickets": 10, "io_bursts": []}
            ]
        },
        {
            "name": "Real-Time Tasks",
            "description": "Critical processes with high priorities arriving periodically. Highlights how preemptive schedulers keep latency low for VIP tasks.",
            "processes": [
                {"pid": 1, "name": "RT_Telemetry", "arrival_time": 0.0, "burst_time": 5.0, "priority": 1, "tickets": 50, "io_bursts": []},
                {"pid": 2, "name": "RT_Actuator", "arrival_time": 5.0, "burst_time": 4.0, "priority": 1, "tickets": 50, "io_bursts": []},
                {"pid": 3, "name": "Background_Log", "arrival_time": 2.0, "burst_time": 30.0, "priority": 9, "tickets": 5, "io_bursts": []}
            ]
        },
        {
            "name": "Adversarial SJF",
            "description": "Exposes Shortest Job First starvation. A long-running task is continually starved by a high-rate arrival stream of very short tasks.",
            "processes": [
                {"pid": 1, "name": "Long_Job", "arrival_time": 0.0, "burst_time": 60.0, "priority": 10, "tickets": 5, "io_bursts": []},
                {"pid": 2, "name": "Short_Job_1", "arrival_time": 1.0, "burst_time": 2.0, "priority": 1, "tickets": 20, "io_bursts": []},
                {"pid": 3, "name": "Short_Job_2", "arrival_time": 3.0, "burst_time": 2.0, "priority": 1, "tickets": 20, "io_bursts": []},
                {"pid": 4, "name": "Short_Job_3", "arrival_time": 5.0, "burst_time": 2.0, "priority": 1, "tickets": 20, "io_bursts": []},
                {"pid": 5, "name": "Short_Job_4", "arrival_time": 7.0, "burst_time": 2.0, "priority": 1, "tickets": 20, "io_bursts": []},
                {"pid": 6, "name": "Short_Job_5", "arrival_time": 9.0, "burst_time": 2.0, "priority": 1, "tickets": 20, "io_bursts": []}
            ]
        }
    ]
