# Cloud Scheduling Simulator

A high-performance, discrete-event simulation engine for CPU and cloud scheduling heuristics. Features a robust FastAPI backend and an interactive React dashboard styled with Tailwind CSS, supporting timeline replays and side-by-side scheduling analyses.

---

## 🏛️ System Architecture

```
                                      +---------------------------------------------+
                                      |                   BACKEND                   |
                                      |                                             |
                                      |                +-------------------------+  |
                                      |           +--->|    Simulation Engine    |  |
                                      |           |    +-------------------------+  |
+------------------+                  |  +-----+  |                                 |
|     BROWSER      |                  |  |     |--+    +-------------------------+  |
|  (React/Vite)    |=== HTTP API ====>|  | API |--+--->|     Algorithms (6)      |  |
|  localhost:5173  |   (Port 8000)    |  |     |--+    +-------------------------+  |
+------------------+                  |  +-----+  |                                 |
                                      |           |    +-------------------------+  |
                                      |           +--->|   Metrics Calculator    |  |
                                      |           |    +-------------------------+  |
                                      |           |                                 |
                                      |           |    +-------------------------+  |
                                      |           +--->|   Starvation Detector   |  |
                                      |                +-------------------------+  |
                                      +---------------------------------------------+
```

---

## 📊 Scheduling Heuristics Matrix

| Algorithm | Preemptive | Time Complexity | Starvation Risk | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **First Come First Served (FCFS)** | No | $O(N)$ | None | Long batch workloads |
| **Round Robin (RR)** | Yes | $O(N)$ | None | Time-sharing / interactive systems |
| **Shortest Job First (SJF)** | No | $O(N \log N)$ | High | Minimizing average wait times |
| **Shortest Remaining Time First (SRTF)** | Yes | $O(N \log N)$ | High | Minimizing response latency |
| **Priority Scheduling (Basic)** | No | $O(N \log N)$ | High | Real-time kernels / VIP interrupts |
| **Priority Scheduling (Aging)** | Yes | $O(N \log N)$ | None | Priority jobs with starvation safety |
| **Multilevel Feedback Queue (MLFQ)** | Yes | $O(N \log N)$ | None (with Boost) | General-purpose OS kernels |
| **Lottery Scheduling** | Yes | $O(N)$ | Low (Probabilistic) | Proportional resource distribution |

---

## ⚙️ How the Discrete-Event Engine Works

Unlike a naive **time-stepped** simulator that increments a clock by fixed ticks (e.g. `t += 1`), this system is built on a **Discrete-Event Simulation (DES)** paradigm using a min-heap priority event queue. 

Events in the simulation—such as `PROCESS_ARRIVE`, `PROCESS_START`, `PROCESS_PREEMPT`, `PROCESS_COMPLETE`, `IO_START`, and `IO_COMPLETE`—are scheduled at exact floating-point timestamps. The engine pops the earliest event from the min-heap, advances the system clock directly to that event's timestamp, and updates the scheduling state machine:

1. When a process starts running, the engine calculates the time of its next physical interruption (completion, I/O burst offset, or time slice expiration) and pushes that event to the queue.
2. If a preemptive event or an I/O request occurs, the running process yields the CPU, its CPU execution duration is recorded, and the scheduler picks the next job from the ready queue.
3. This event-driven approach ensures $100\%$ mathematical precision for metrics like waiting segments, response latency, and context switch overhead, remaining invariant to step size limits.

---

## 🧠 Engineering Decisions

### 1. Discrete-Event vs. Time-Stepped
Time-stepped loops suffer from step-size errors. If an I/O burst completes at $3.25\text{ms}$ but the step is $1.0\text{ms}$, the event is delayed to $4.0\text{ms}$, introducing cumulative measurement errors. Discrete-event models jump instantly to the next event time, supporting arbitrary precision and reducing CPU iterations.

### 2. Jain's Fairness Index vs. Simple Variance
Simple variance of waiting times fails to normalize values across different workloads. Jain's Fairness Index:
$$J(x) = \frac{(\sum x_i)^2}{n \cdot \sum x_i^2}$$
produces a normalized index between $1/n$ (completely unfair) and $1.0$ (perfectly fair), allowing direct comparisons across variable workload sizes.

### 3. MLFQ Priority Boost
Operating systems employing MLFQ demote CPU-bound tasks to lower-level queues to favor interactive requests. However, this causes low-priority tasks in low-level queues to starve. A global priority boost tick (every $50\text{ms}$) resets all processes to queue level 0, eliminating starvation.

### 4. Lottery Proportional Sharing
Lottery scheduling allocates tickets to processes and picks a winning ticket randomly. This provides probabilistic fairness. High-priority processes receive more tickets, getting proportionally larger shares of the CPU. This is ideal for multimedia processing (e.g., audio/video players) where strict guarantees are unnecessary, but proportional CPU shares keep streams synchronized.

### 5. Concurrent Batch Execution using `asyncio.gather`
For side-by-side comparisons, the backend runs all algorithms in parallel. To avoid blocking the single-threaded Python event loop with CPU-heavy simulations, FastAPI routes run the simulations in background thread executors via `loop.run_in_executor`, coordinated concurrently using `asyncio.gather`.

---

## 🔌 API Documentation

### 1. Generate Workload
* **Endpoint:** `POST /workload/generate`
* **Request Body:**
```json
{
  "preset": "cpu_bound",
  "num_processes": 3,
  "seed": 42
}
```
* **Response:**
```json
[
  {
    "pid": 1,
    "name": "CPU_P1",
    "arrival_time": 7.49,
    "burst_time": 96.06,
    "priority": 7,
    "tickets": 25,
    "io_bursts": []
  }
]
```

### 2. Run Simulation
* **Endpoint:** `POST /simulate`
* **Request Body:**
```json
{
  "processes": [
    { "pid": 1, "name": "P1", "arrival_time": 0.0, "burst_time": 10.0, "priority": 1, "tickets": 10, "io_bursts": [] }
  ],
  "algorithm": "fcfs",
  "time_quantum": 2.0,
  "context_switch_overhead": 0.1,
  "max_time": 1000.0
}
```
* **Response:**
```json
{
  "trace": [
    { "timestamp": 0.0, "event_type": "PROCESS_ARRIVE", "pid": 1, "message": "Process P1 arrived...", "ready_queue": [1] }
  ],
  "metrics": {
    "processes": [
      { "pid": 1, "name": "P1", "waiting_time": 0.0, "turnaround_time": 10.0, "response_time": 0.0, "completion_time": 10.0, "cpu_utilization_share": 100.0, "context_switches": 0 }
    ],
    "aggregate": {
      "avg_waiting_time": 0.0, "avg_turnaround_time": 10.0, "avg_response_time": 0.0, "throughput": 0.1, "cpu_utilization": 100.0, "idle_time": 0.0, "max_waiting_time": 0.0, "min_waiting_time": 0.0, "p99_waiting_time": 0.0, "context_switch_overhead": 0.0
    }
  },
  "starvation": { "starved": [], "at_risk": [], "max_starvation_gap": 0.0, "starvation_events": [] },
  "fairness": { "jains_index": 1.0, "cv_waiting": 0.0 }
}
```

---

## 🚀 How to Run Locally

### Using Docker Compose (Recommended)
```bash
docker compose up --build
```
* React Frontend: `http://localhost:5173`
* FastAPI Backend: `http://localhost:8000`

### Manual Execution

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
