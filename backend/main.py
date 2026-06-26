from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.config import CORS_ORIGINS
from app.routes import simulation, compare, workload

app = FastAPI(
    title="Cloud Scheduling Simulator API",
    description="Discrete-Event simulation engine for cloud scheduling algorithms.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(simulation.router, prefix="/simulate", tags=["Simulation"])
app.include_router(compare.router, prefix="/compare", tags=["Comparison"])
app.include_router(workload.router, prefix="/workload", tags=["Workload"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Cloud Scheduling Simulator Backend",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
