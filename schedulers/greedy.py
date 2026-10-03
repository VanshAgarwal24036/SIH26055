import numpy as np

from receiver.receiver import ScanResult
from schedulers.base import BaseScheduler


class GreedyScheduler(BaseScheduler):
    """
    Greedy scheduler.

    Learns which bands have historically produced detections
    and prefers bands with higher estimated activity.

    This is still a baseline, not our final intelligent scheduler.
    """

    def __init__(self, num_bands: int):
        super().__init__(num_bands)

        self.scans = np.zeros(
            num_bands,
            dtype=np.int64,
        )

        self.hits = np.zeros(
            num_bands,
            dtype=np.int64,
        )

    def select_band(self) -> int:

        # Force every band to be observed at least once.
        unvisited = np.where(self.scans == 0)[0]

        if len(unvisited) > 0:
            return int(unvisited[0])

        # Laplace-smoothed empirical hit probability.
        probabilities = (
            self.hits + 1
        ) / (
            self.scans + 2
        )

        return int(
            np.argmax(probabilities)
        )

    def update(self, result: ScanResult) -> None:

        band = result.band

        self.scans[band] += 1

        if result.result == "HIT":
            self.hits[band] += 1

    def reset(self) -> None:

        self.scans.fill(0)
        self.hits.fill(0)