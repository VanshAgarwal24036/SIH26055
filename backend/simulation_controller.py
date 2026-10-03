from typing import Optional

from environment.scenarios import create_random_scenario
from receiver.receiver import VirtualReceiver

from schedulers import (
    SequentialScheduler,
    RandomScheduler,
    RoundRobinScheduler,
    GreedyScheduler,
    KnowledgeAwareScheduler,
)

from metrics.evaluation import MetricsEvaluator


class SimulationController:
    """
    Keeps one active Spectra Shakti simulation in memory.

    This class connects:
        RF Environment
        Virtual Receiver
        Scheduler
        Knowledge Map
        Metrics
    """

    def __init__(self):
        self.environment = None
        self.receiver = None
        self.scheduler = None

        self.scheduler_name = "Knowledge-Aware"

        self.scenario_seed = 10001
        self.receiver_seed = 20001
        self.scheduler_seed = 30001

        self.is_running = False
        self.is_initialized = False

        self.scan_history = []
        self.spectrum_history = []

    # =========================================================
    # CREATE COMPONENTS
    # =========================================================

    def _create_scheduler(self, name: str):
        num_bands = self.environment.num_bands

        if name == "Sequential":
            return SequentialScheduler(num_bands)

        if name == "Random":
            return RandomScheduler(
                num_bands,
                seed=self.scheduler_seed,
            )

        if name == "Round Robin":
            return RoundRobinScheduler(
                num_bands
            )

        if name == "Greedy":
            return GreedyScheduler(
                num_bands
            )

        if name == "Knowledge-Aware":
            return KnowledgeAwareScheduler(
                num_bands
            )

        raise ValueError(
            f"Unknown scheduler: {name}"
        )

    def initialize(
        self,
        scheduler_name: str = "Knowledge-Aware",
        scenario_seed: Optional[int] = None,
        num_emitters: int = 8,
    ):
        """
        Create a completely new simulation.
        """

        if scenario_seed is not None:
            self.scenario_seed = scenario_seed

        self.scheduler_name = scheduler_name

        self.environment = create_random_scenario(
            seed=self.scenario_seed,
            num_bands=20,
            num_time_slots=1000,
            num_emitters=num_emitters,
        )

        self.receiver = VirtualReceiver(
            environment=self.environment,
            detection_probability=0.90,
            false_alarm_probability=0.02,
            dwell_time=1,
            retune_time=1,
            sensitivity=0.8,
            seed=self.receiver_seed,
        )

        self.scheduler = self._create_scheduler(
            scheduler_name
        )

        self.scan_history = []
        self.spectrum_history = []

        self.is_running = False
        self.is_initialized = True

        return self.get_state()

    # =========================================================
    # START / PAUSE
    # =========================================================

    def start(self):
        self._ensure_initialized()

        if self.receiver.current_time >= self.environment.num_time_slots:
            self.reset()

        self.is_running = True

        return self.get_state()

    def pause(self):
        self.is_running = False

        return self.get_state()

    # =========================================================
    # ONE REAL SCAN
    # =========================================================

    def step(self):
        """
        Perform exactly one real simulation scan.
        """

        self._ensure_initialized()

        if self.receiver.current_time >= self.environment.num_time_slots:
            self.is_running = False

            return self.get_state()

        band = self.scheduler.select_band()

        result = self.receiver.scan(
            band
        )

        self.scheduler.update(
            result
        )

        self.scan_history.append(
            result
        )

        if (
            self.receiver.current_time
            >= self.environment.num_time_slots
        ):
            self.is_running = False

        return self.get_state()

    # =========================================================
    # RESET
    # =========================================================

    def reset(self):
        """
        Reset the current scenario.
        """

        self.receiver = None
        self.scheduler = None
        self.environment = None

        self.scan_history = []

        self.is_initialized = False
        self.is_running = False

        return self.initialize(
            scheduler_name=self.scheduler_name,
            scenario_seed=self.scenario_seed,
        )

    # =========================================================
    # CHANGE SCHEDULER
    # =========================================================

    def set_scheduler(
        self,
        scheduler_name: str,
    ):
        """
        Switch scheduler and start a fresh run.

        We intentionally restart because continuing an existing
        run with a completely different scheduler would make
        comparison harder to interpret.
        """

        self.scheduler_name = scheduler_name

        return self.initialize(
            scheduler_name=scheduler_name,
            scenario_seed=self.scenario_seed,
        )

    # =========================================================
    # STATE
    # =========================================================

    def get_state(self):
        """
        Return the complete frontend-ready state.
        """

        self._ensure_initialized()

        receiver_stats = (
            self.receiver.get_statistics()
        )

        latest_result = None

        if self.scan_history:
            latest = self.scan_history[-1]

            latest_result = {
                "time_slot": latest.time_slot,
                "band": latest.band,
                "detected": latest.detected,
                "false_alarm": latest.false_alarm,
                "result": latest.result,
                "scan_duration": latest.scan_duration,
            }

        return {
            "status": {
                "initialized": self.is_initialized,
                "running": self.is_running,
            },

            "scenario": {
                "seed": self.scenario_seed,
                "num_bands": self.environment.num_bands,
                "num_emitters": len(
                    self.environment.emitters
                ),
                "num_time_slots": (
                    self.environment.num_time_slots
                ),
            },

            "scheduler": {
                "name": self.scheduler_name,
            },

            "receiver": {
                "current_time": (
                    self.receiver.current_time
                ),
                "current_band": (
                    self.receiver.current_band
                ),
                "detection_probability": (
                    self.receiver.detection_probability
                ),
                "false_alarm_probability": (
                    self.receiver.false_alarm_probability
                ),
                "sensitivity": (
                    self.receiver.sensitivity
                ),
                "dwell_time": (
                    self.receiver.dwell_time
                ),
                "retune_time": (
                    self.receiver.retune_time
                ),
            },

            "latest_scan": latest_result,

            "stats": receiver_stats,

            "spectrum": (
                self._get_spectrum_state()
            ),

            "knowledge_map": (
                self._get_knowledge_map_state()
            ),

            "metrics": (
                self._get_metrics()
            ),
        }

    # =========================================================
    # SPECTRUM STATE
    # =========================================================

    def _get_spectrum_state(self) -> dict:
        current_time = min(
            int(self.receiver.current_time),
            self.environment.num_time_slots - 1,
        )

        # ---------------------------------------------------------
        # Current spectrum state
        # ---------------------------------------------------------
        bands = []

        for band in range(self.environment.num_bands):
            active_emitters = (
                self.environment.get_active_emitters(
                    current_time,
                    band,
                )
            )

            emitter_data = []

            for emitter in active_emitters:
                emitter_id = getattr(
                    emitter,
                    "emitter_id",
                    getattr(
                        emitter,
                        "id",
                        None,
                    ),
                )

                emitter_type = getattr(
                    emitter,
                    "emitter_type",
                    getattr(
                        emitter,
                        "type",
                        getattr(
                            emitter,
                            "kind",
                            "unknown",
                        ),
                    ),
                )

                if hasattr(emitter_type, "value"):
                    emitter_type = emitter_type.value

                emitter_data.append(
                    {
                        "id": (
                            str(emitter_id)
                            if emitter_id is not None
                            else "Emitter"
                        ),
                        "type": str(
                            emitter_type
                        ),
                    }
                )

            bands.append(
                {
                    "band": int(band),
                    "active": bool(
                        len(emitter_data) > 0
                    ),
                    "emitters": emitter_data,
                }
            )

        # ---------------------------------------------------------
        # Historical RF state
        #
        # IMPORTANT:
        # "bands" remains 0/1 for backward compatibility.
        # "types" stores the emitter type(s) at each
        # time-slot / band.
        # ---------------------------------------------------------
        history_length = 60

        start_time = max(
            0,
            current_time - history_length + 1,
        )

        history = []

        for time_slot in range(
            start_time,
            current_time + 1,
        ):
            activity = []
            types = []

            for band in range(
                self.environment.num_bands
            ):
                active_emitters = (
                    self.environment.get_active_emitters(
                        time_slot,
                        band,
                    )
                )

                band_types = []

                for emitter in active_emitters:
                    emitter_type = getattr(
                        emitter,
                        "emitter_type",
                        getattr(
                            emitter,
                            "type",
                            getattr(
                                emitter,
                                "kind",
                                "unknown",
                            ),
                        ),
                    )

                    if hasattr(
                        emitter_type,
                        "value",
                    ):
                        emitter_type = (
                            emitter_type.value
                        )

                    band_types.append(
                        str(emitter_type)
                    )

                activity.append(
                    int(len(band_types) > 0)
                )

                types.append(
                    band_types
                )

            history.append(
                {
                    "time_slot": int(
                        time_slot
                    ),
                    "bands": activity,
                    "types": types,
                }
            )

        return {
            "time_slot": int(current_time),
            "bands": bands,
            "history": history,
        }

        # ---------------------------------------------------------
        # Rolling spectrum history
        # ---------------------------------------------------------

        history_start = max(
            0,
            current_time - 119,
        )

        history = []

        for time_slot in range(
            history_start,
            current_time + 1,
        ):

            row = []

            for band in range(
                self.environment.num_bands
            ):

                active = self.environment.is_transmitting(
                    time_slot,
                    band,
                )

                row.append(
                    1 if active else 0
                )

            history.append(
                {
                    "time_slot": time_slot,
                    "bands": row,
                }
            )

        return {
            "time_slot": current_time,
            "bands": bands,
            "history": history,
        }

    # =========================================================
    # KNOWLEDGE MAP
    # =========================================================

    def _get_knowledge_map_state(self):

        knowledge = getattr(
            self.scheduler,
            "knowledge",
            None,
        )

        if knowledge is None:
            return []

        current_time = (
            self.receiver.current_time
        )

        rows = []

        for band in range(
            self.environment.num_bands
        ):

            rows.append(
                knowledge.get_band_features(
                    band,
                    current_time,
                )
            )

        return rows

    # =========================================================
    # METRICS
    # =========================================================

    def _get_metrics(self):

        evaluator = MetricsEvaluator(
            self.environment
        )

        metrics = evaluator.evaluate(
            self.scan_history,
            self.receiver.get_statistics(),
        )

        return {
            "pd": (
                metrics.probability_of_detection
            ),
            "pfa": (
                metrics.probability_of_false_alarm
            ),
            "event_detection_rate": (
                metrics.event_detection_rate
            ),
            "intercepted_events": (
                metrics.intercepted_events
            ),
            "missed_events": (
                metrics.missed_events
            ),
            "total_events": (
                metrics.total_events
            ),
            "average_intercept_time": (
                metrics.average_intercept_time
            ),
            "hits": metrics.hits,
            "misses": metrics.misses,
            "false_alarms": metrics.false_alarms,
        }

    # =========================================================
    # VALIDATION
    # =========================================================

    def _ensure_initialized(self):

        if not self.is_initialized:
            self.initialize(
                scheduler_name=self.scheduler_name,
                scenario_seed=self.scenario_seed,
            )