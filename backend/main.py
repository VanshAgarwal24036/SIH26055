from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.simulation_controller import SimulationController


app = FastAPI(
    title="Spectra Shakti API",
    description="Backend API for the Spectra Shakti smart RF scan simulation.",
    version="0.1.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# GLOBAL SIMULATION CONTROLLER
# =========================================================

simulation = SimulationController()


# =========================================================
# REQUEST MODELS
# =========================================================

class StartRequest(BaseModel):
    scheduler: str = "Knowledge-Aware"

    scenario_seed: int = Field(
        default=10001,
        ge=0,
    )

    num_emitters: int = Field(
        default=8,
        ge=1,
        le=50,
    )


class SchedulerRequest(BaseModel):
    scheduler: str


class ScenarioRequest(BaseModel):
    scenario_seed: int = Field(
        default=10001,
        ge=0,
    )

    num_emitters: int = Field(
        default=8,
        ge=1,
        le=50,
    )


# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Spectra Shakti",
        "version": "0.1.0",
    }


# =========================================================
# GET CURRENT STATE
# =========================================================

@app.get("/api/simulation/state")
def get_simulation_state():

    try:
        return simulation.get_state()

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =========================================================
# START
# =========================================================

@app.post("/api/simulation/start")
def start_simulation(request: StartRequest):

    try:

        # Initialize a fresh scenario when starting.
        state = simulation.initialize(
            scheduler_name=request.scheduler,
            scenario_seed=request.scenario_seed,
            num_emitters=request.num_emitters,
        )

        simulation.start()

        return simulation.get_state()

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =========================================================
# PAUSE
# =========================================================

@app.post("/api/simulation/pause")
def pause_simulation():

    try:

        return simulation.pause()

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =========================================================
# STEP
# =========================================================

@app.post("/api/simulation/step")
def step_simulation():

    try:

        return simulation.step()

    except RuntimeError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =========================================================
# RESET
# =========================================================

@app.post("/api/simulation/reset")
def reset_simulation():

    try:

        return simulation.reset()

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =========================================================
# CHANGE SCHEDULER
# =========================================================

@app.post("/api/simulation/scheduler")
def change_scheduler(request: SchedulerRequest):

    try:

        return simulation.set_scheduler(
            request.scheduler
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =========================================================
# NEW SCENARIO
# =========================================================

@app.post("/api/simulation/scenario")
def new_scenario(request: ScenarioRequest):

    try:

        return simulation.initialize(
            scheduler_name=simulation.scheduler_name,
            scenario_seed=request.scenario_seed,
            num_emitters=request.num_emitters,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )