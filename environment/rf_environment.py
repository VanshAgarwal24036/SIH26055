import numpy as np

from environment.emitter import Emitter


class RFEnvironment:
    """
    Simulated RF environment.

    The environment knows the ground truth.
    The scheduler/receiver will later observe only scan results.
    """

    def __init__(
        self,
        num_bands: int = 20,
        num_time_slots: int = 1000,
    ):
        self.num_bands = num_bands
        self.num_time_slots = num_time_slots

        self.emitters: list[Emitter] = []

        # truth[time][band] = 1 if at least one emitter is transmitting
        self.truth = np.zeros(
            (num_time_slots, num_bands),
            dtype=np.int8,
        )

    def add_emitter(self, emitter: Emitter) -> None:
        """Add an emitter to the environment."""

        if emitter.band < 0 or emitter.band >= self.num_bands:
            raise ValueError(
                f"Emitter band {emitter.band} is outside "
                f"0-{self.num_bands - 1}"
            )

        self.emitters.append(emitter)

    def generate(self) -> np.ndarray:
        """
        Generate the complete hidden RF truth matrix.

        Returns:
            numpy array with shape:
            (num_time_slots, num_bands)
        """

        self.truth.fill(0)

        for emitter in self.emitters:

            for time_slot in range(self.num_time_slots):

                if not emitter.is_active(time_slot):
                    continue

                band = emitter.get_band(time_slot)

                if 0 <= band < self.num_bands:
                    self.truth[time_slot, band] = 1

        return self.truth.copy()

    def is_transmitting(
        self,
        time_slot: int,
        band: int,
    ) -> bool:
        """Query ground truth for debugging/evaluation."""

        if not (0 <= time_slot < self.num_time_slots):
            raise ValueError("Invalid time slot.")

        if not (0 <= band < self.num_bands):
            raise ValueError("Invalid band.")

        return bool(self.truth[time_slot, band])

    def get_occupancy(self) -> np.ndarray:
        """
        Calculate fraction of active time for every band.
        """

        return self.truth.mean(axis=0)

    def reset(self) -> None:
        """Reset environment."""

        self.emitters.clear()
        self.truth.fill(0)

    def get_active_emitters(
        self,
        time_slot: int,
        band: int,
    ) -> list[int]:
        """
        Return emitter IDs transmitting on a band at a given time.

        This is evaluator/debug information.
        The scheduler must never receive this information.
        """

        active_emitters = []

        for emitter in self.emitters:

            if not emitter.is_active(time_slot):
                continue

            emitter_band = emitter.get_band(time_slot)

            if emitter_band == band:
                active_emitters.append(emitter.emitter_id)

        return active_emitters