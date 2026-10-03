from abc import ABC, abstractmethod

from receiver.receiver import ScanResult


class BaseScheduler(ABC):
    """
    Base interface for all scan schedulers.

    The scheduler only receives scan observations.
    It never receives RF ground truth.
    """

    def __init__(self, num_bands: int):
        self.num_bands = num_bands

    @abstractmethod
    def select_band(self) -> int:
        """Choose the next band to scan."""
        raise NotImplementedError

    def update(self, result: ScanResult) -> None:
        """
        Update scheduler state after a scan.

        Stateless schedulers do nothing here.
        Learning schedulers will use this later.
        """
        pass

    def reset(self) -> None:
        """Reset scheduler state."""
        pass