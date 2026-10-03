from schedulers.base import BaseScheduler


class SequentialScheduler(BaseScheduler):
    """
    Sequential frequency sweep.

    0 -> 1 -> 2 -> ... -> N-1 -> 0 -> ...
    """

    def __init__(self, num_bands: int):
        super().__init__(num_bands)

        self.current_band = 0

    def select_band(self) -> int:
        band = self.current_band

        self.current_band = (
            self.current_band + 1
        ) % self.num_bands

        return band

    def reset(self) -> None:
        self.current_band = 0