import numpy as np

from receiver.receiver import ScanResult
from schedulers.base import BaseScheduler
from schedulers.knowledge_map import RFKnowledgeMap


class KnowledgeAwareScheduler(BaseScheduler):
    """
    Adaptive heuristic scheduler using the RF Knowledge Map.

    This is NOT ML/RL yet.

    It combines:
        - estimated activity
        - uncertainty
        - scan freshness
        - periodicity
        - frequency transition probability
    """

    def __init__(
        self,
        num_bands: int,
        activity_weight: float = 0.40,
        uncertainty_weight: float = 0.25,
        freshness_weight: float = 0.10,
        periodicity_weight: float = 0.15,
        transition_weight: float = 0.10,
    ):
        super().__init__(num_bands)

        self.knowledge = RFKnowledgeMap(
            num_bands
        )

        self.current_time = 0

        self.activity_weight = activity_weight
        self.uncertainty_weight = uncertainty_weight
        self.freshness_weight = freshness_weight
        self.periodicity_weight = periodicity_weight
        self.transition_weight = transition_weight

    def select_band(self) -> int:

        # -----------------------------------------------------
        # Initial exploration
        # -----------------------------------------------------

        unvisited = np.where(
            self.knowledge.scans == 0
        )[0]

        if len(unvisited) > 0:
            return int(unvisited[0])

        # -----------------------------------------------------
        # Feature vectors
        # -----------------------------------------------------

        activity = (
            self.knowledge.estimated_activity()
        )

        uncertainty = (
            self.knowledge.uncertainty()
        )

        time_since_scan = (
            self.knowledge.time_since_scan(
                self.current_time
            )
        )

        # Normalize freshness.
        freshness = np.clip(
            time_since_scan / 50.0,
            0.0,
            1.0,
        )

        # -----------------------------------------------------
        # Periodicity
        # -----------------------------------------------------

        periodicity = np.array(
            [
                self.knowledge.periodic_due_score(
                    band,
                    self.current_time,
                )
                for band in range(
                    self.num_bands
                )
            ]
        )

        # -----------------------------------------------------
        # Frequency transition
        # -----------------------------------------------------

        transition = np.zeros(
            self.num_bands,
            dtype=float,
        )

        last_hit_band = (
            self.knowledge.last_hit_band
        )

        if last_hit_band is not None:

            for band in range(
                self.num_bands
            ):
                transition[band] = (
                    self.knowledge.transition_probability(
                        last_hit_band,
                        band,
                    )
                )

        # -----------------------------------------------------
        # Combined score
        # -----------------------------------------------------

        scores = (
            self.activity_weight * activity
            +
            self.uncertainty_weight * uncertainty
            +
            self.freshness_weight * freshness
            +
            self.periodicity_weight * periodicity
            +
            self.transition_weight * transition
        )

        return int(
            np.argmax(scores)
        )

    def update(
        self,
        result: ScanResult,
    ) -> None:

        self.current_time = result.time_slot + result.scan_duration

        self.knowledge.update(
            band=result.band,
            time_slot=result.time_slot,
            result=result.result,
        )

    def reset(self) -> None:

        self.current_time = 0

        self.knowledge.reset()