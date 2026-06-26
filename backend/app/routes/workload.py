from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Literal
import numpy as np
from app.models.process import Process, IOBurst

router = APIRouter()

class WorkloadGenerateRequest(BaseModel):
    preset: Literal["cpu_bound", "io_bound", "mixed", "bursty", "adversarial"]
    num_processes: int = Field(default=5, ge=1, le=50)
    seed: int = Field(default=42)

@router.post("/generate", response_model=List[Process])
def generate_workload(req: WorkloadGenerateRequest):
    # Set seed for reproducibility
    np.random.seed(req.seed)
    
    processes = []
    
    if req.preset == "cpu_bound":
        for i in range(req.num_processes):
            arrival = float(np.random.uniform(0, 20))
            burst = float(np.random.uniform(20, 100))
            prio = int(np.random.randint(1, 11))
            
            # 20% chance of a single I/O burst
            io_bursts = []
            if np.random.rand() < 0.2 and burst > 30:
                start = float(np.random.uniform(10, burst - 15))
                duration = float(np.random.uniform(5, 15))
                io_bursts.append(IOBurst(start_offset=round(start, 2), duration=round(duration, 2)))
                
            processes.append(Process(
                pid=i + 1,
                name=f"CPU_P{i+1}",
                arrival_time=round(arrival, 2),
                burst_time=round(burst, 2),
                priority=prio,
                tickets=int(np.random.randint(5, 50)),
                io_bursts=io_bursts
            ))
            
    elif req.preset == "io_bound":
        for i in range(req.num_processes):
            arrival = float(np.random.uniform(0, 20))
            burst = float(np.random.uniform(2, 10))
            prio = int(np.random.randint(1, 11))
            
            # Frequent I/O bursts
            io_bursts = []
            num_io = int(np.random.randint(1, 4))
            for j in range(num_io):
                # Distribute IO bursts along the CPU burst
                start = (j + 1) * (burst / (num_io + 1))
                duration = float(np.random.uniform(10, 30))
                io_bursts.append(IOBurst(start_offset=round(start, 2), duration=round(duration, 2)))
                
            processes.append(Process(
                pid=i + 1,
                name=f"IO_P{i+1}",
                arrival_time=round(arrival, 2),
                burst_time=round(burst, 2),
                priority=prio,
                tickets=int(np.random.randint(5, 50)),
                io_bursts=io_bursts
            ))
            
    elif req.preset == "mixed":
        for i in range(req.num_processes):
            # Alternate between CPU-bound and IO-bound
            is_cpu = (i % 2 == 0)
            arrival = float(np.random.uniform(0, 20))
            prio = int(np.random.randint(1, 11))
            
            if is_cpu:
                burst = float(np.random.uniform(20, 80))
                io_bursts = []
                if np.random.rand() < 0.3 and burst > 25:
                    start = float(np.random.uniform(5, burst - 15))
                    duration = float(np.random.uniform(5, 10))
                    io_bursts.append(IOBurst(start_offset=round(start, 2), duration=round(duration, 2)))
                name = f"MixCPU_P{i+1}"
            else:
                burst = float(np.random.uniform(2, 10))
                io_bursts = []
                num_io = int(np.random.randint(1, 3))
                for j in range(num_io):
                    start = (j + 1) * (burst / (num_io + 1))
                    duration = float(np.random.uniform(10, 20))
                    io_bursts.append(IOBurst(start_offset=round(start, 2), duration=round(duration, 2)))
                name = f"MixIO_P{i+1}"
                
            processes.append(Process(
                pid=i + 1,
                name=name,
                arrival_time=round(arrival, 2),
                burst_time=round(burst, 2),
                priority=prio,
                tickets=int(np.random.randint(5, 50)),
                io_bursts=io_bursts
            ))
            
    elif req.preset == "bursty":
        for i in range(req.num_processes):
            # 80% arrive early
            if i < int(req.num_processes * 0.8):
                arrival = float(np.random.uniform(0, 5))
            else:
                arrival = float(np.random.uniform(5, 50))
                
            burst = float(np.random.uniform(5, 30))
            prio = int(np.random.randint(1, 11))
            
            processes.append(Process(
                pid=i + 1,
                name=f"Burst_P{i+1}",
                arrival_time=round(arrival, 2),
                burst_time=round(burst, 2),
                priority=prio,
                tickets=int(np.random.randint(5, 50)),
                io_bursts=[]
            ))
            
    elif req.preset == "adversarial":
        # Process 1 is very long, arriving at 0
        processes.append(Process(
            pid=1,
            name="Long_P1",
            arrival_time=0.0,
            burst_time=100.0,
            priority=10, # Lowest priority
            tickets=5,
            io_bursts=[]
        ))
        
        # Subsequent short processes arrive continuously
        for i in range(1, req.num_processes):
            arrival = float(i * 3.0)  # arrive every 3ms
            burst = 2.0  # very short burst
            processes.append(Process(
                pid=i + 1,
                name=f"Short_P{i+1}",
                arrival_time=round(arrival, 2),
                burst_time=burst,
                priority=1, # Highest priority
                tickets=40,
                io_bursts=[]
            ))
            
    return processes
