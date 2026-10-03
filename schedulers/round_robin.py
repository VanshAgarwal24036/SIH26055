from schedulers.base import BaseScheduler


class RoundRobinScheduler(BaseScheduler):
    """
    Cyclic scheduler.

    Each band receives scanning opportunities in a fixed cycle.
    """

    def __init__(
        self,
        num_bands: int,
        start_band: int = 0,
    ):
        super().__init__(num_bands)

        self.start_band = start_band
        self.current_band = start_band

    def select_band(self) -> int:

        band = self.current_band

        self.current_band = (
            self.current_band + 1
        ) % self.num_bands

        return band

    def reset(self) -> None:
        self.current_band = self.start_band