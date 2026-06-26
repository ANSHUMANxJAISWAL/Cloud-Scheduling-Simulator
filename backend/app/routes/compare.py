from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import asyncio

from app.models.process import Process, SimulationConfig
from app.models.metrics import ComparisonReport
from app.routes.simulation import make_config_hashable, get_cached_simulation

router = APIRouter()

class CompareRequest(BaseModel):
    processes: List[Process]
    algorithms: List[str]
    time_quantum: float = 2.0
    aging_rate: float = 0.5

@router.post("", response_model=ComparisonReport)
async def compare_algorithms(req: CompareRequest):
    if not req.processes:
        raise HTTPException(status_code=400, detail="Process list cannot be empty")
        
    loop = asyncio.get_running_loop()
    
    # We will build SimulationConfig for each algorithm and run them
    results = {}
    
    def run_algo(algo_name, processes, tq, ar):
        # Determine specific config parameters
        config = SimulationConfig(
            processes=processes,
            algorithm=algo_name,
            time_quantum=tq,
            aging_rate=ar,
            mlfq_queues=3,
            mlfq_quantums=[2.0, 4.0, 8.0],
            context_switch_overhead=0.1,
            max_time=1000.0
        )
        hash_key = make_config_hashable(config)
        return algo_name, get_cached_simulation(hash_key)

    tasks = [
        loop.run_in_executor(None, run_algo, algo, req.processes, req.time_quantum, req.aging_rate)
        for algo in req.algorithms
    ]
    
    completed = await asyncio.gather(*tasks)
    
    for algo, res in completed:
        results[algo] = res
        
    # Compute ranking lists for key metrics
    # Throughput (higher is better)
    # Avg Wait Time (lower is better)
    # Avg Response Time (lower is better)
    # Fairness (higher is better)
    # Overhead (lower is better)
    
    rankings = []
    
    def get_rank_list(metric_key, is_aggregate=True, sub_key=None, reverse=False):
        items = []
        for algo, res in results.items():
            if is_aggregate:
                val = res["metrics"]["aggregate"][sub_key]
            else:
                val = res["fairness"][sub_key]
            items.append({"algorithm": algo, "value": val})
        items.sort(key=lambda x: x["value"], reverse=reverse)
        return items

    throughput_rank = get_rank_list("throughput", sub_key="throughput", reverse=True)
    avg_wait_rank = get_rank_list("avg_waiting_time", sub_key="avg_waiting_time", reverse=False)
    response_rank = get_rank_list("avg_response_time", sub_key="avg_response_time", reverse=False)
    fairness_rank = get_rank_list("jains_index", is_aggregate=False, sub_key="jains_index", reverse=True)
    overhead_rank = get_rank_list("context_switch_overhead", sub_key="context_switch_overhead", reverse=False)
    
    rankings = [
        {"metric": "Throughput", "ranking": throughput_rank},
        {"metric": "Avg Waiting Time", "ranking": avg_wait_rank},
        {"metric": "Avg Response Time", "ranking": response_rank},
        {"metric": "Fairness (Jain's Index)", "ranking": fairness_rank},
        {"metric": "Context Switch Overhead", "ranking": overhead_rank}
    ]
    
    # Best for mapping
    best_for = {
        "throughput": throughput_rank[0]["algorithm"] if throughput_rank else "None",
        "fairness": fairness_rank[0]["algorithm"] if fairness_rank else "None",
        "avg_wait": avg_wait_rank[0]["algorithm"] if avg_wait_rank else "None",
        "response_time": response_rank[0]["algorithm"] if response_rank else "None"
    }
    
    # Generate a descriptive textual analysis paragraph
    summary_parts = []
    
    if len(results) > 1:
        best_wait_algo = avg_wait_rank[0]["algorithm"]
        best_wait_val = avg_wait_rank[0]["value"]
        worst_wait_algo = avg_wait_rank[-1]["algorithm"]
        worst_wait_val = avg_wait_rank[-1]["value"]
        
        summary_parts.append(
            f"Comparing wait times, '{best_wait_algo}' performed best with an average wait of {best_wait_val}ms, "
            f"whereas '{worst_wait_algo}' performed poorest with {worst_wait_val}ms."
        )
        
        best_fair_algo = fairness_rank[0]["algorithm"]
        best_fair_val = fairness_rank[0]["value"]
        worst_fair_algo = fairness_rank[-1]["algorithm"]
        worst_fair_val = fairness_rank[-1]["value"]
        
        summary_parts.append(
            f"Regarding CPU allocation fairness (Jain's index), '{best_fair_algo}' was the most balanced ({best_fair_val}), "
            f"while '{worst_fair_algo}' was the least fair ({worst_fair_val})."
        )
        
        # Check for starvation
        starved_algos = []
        for algo, res in results.items():
            if res["starvation"]["starved"]:
                starved_algos.append(algo)
        if starved_algos:
            summary_parts.append(
                f"Be aware: starvation events occurred during execution of {', '.join(starved_algos)}. "
                "Non-preemptive SJF and Basic Priority are highly prone to starving long or low-priority processes when short jobs arrive continuously."
            )
        else:
            summary_parts.append("No processes suffered severe starvation under any of the simulated algorithms for this workload.")
            
        # Context switch mention
        best_overhead_algo = overhead_rank[0]["algorithm"]
        best_overhead_val = overhead_rank[0]["value"]
        worst_overhead_algo = overhead_rank[-1]["algorithm"]
        worst_overhead_val = overhead_rank[-1]["value"]
        
        summary_parts.append(
            f"Overhead analysis indicates that '{best_overhead_algo}' had the least context switch overhead ({best_overhead_val}ms), "
            f"contrasting with '{worst_overhead_algo}' which lost {worst_overhead_val}ms to switches."
        )
    else:
        summary_parts.append("Run multiple algorithms to see a comparison analysis.")
        
    tradeoff_summary = " ".join(summary_parts)
    
    comparison_data = {
        "rankings": rankings,
        "best_for": best_for,
        "tradeoff_summary": tradeoff_summary
    }
    
    return ComparisonReport(
        results=results,
        comparison=comparison_data
    )
