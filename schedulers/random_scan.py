import numpy as np

from schedulers.base import BaseScheduler


class RandomScheduler(BaseScheduler):
    """
    Randomly selects a frequency band.
    """

    def __init__(
        self,
        num_bands: int,
        seed: int | None = None,
    ):
        super().__init__(num_bands)

        self.rng = np.random.default_rng(seed)

    def select_band(self) -> int:
        return int(
            self.rng.integers(
                0,
                self.num_bands,
            )
        )

    def reset(self) -> None:
        pass