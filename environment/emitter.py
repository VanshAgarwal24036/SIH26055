from dataclasses import dataclass
from typing import List


@dataclass
class Emitter:
    """
    Simulated RF emitter.

    band:
        Initial/fixed band for non-agile emitters.

    emitter_type:
        continuous
        periodic
        intermittent
        frequency_agile
    """

    emitter_id: int
    band: int
    emitter_type: str

    start_time: int = 0
    end_time: int = 999

    period: int = 10
    active_duration: int = 2

    agile_bands: List[int] | None = None
    agile_period: int = 5

    def is_active(self, time_slot: int) -> bool:
        """Return whether the emitter is transmitting at this time."""

        if time_slot < self.start_time or time_slot > self.end_time:
            return False

        if self.emitter_type == "continuous":
            return True

        if self.emitter_type == "periodic":
            return (time_slot - self.start_time) % self.period < self.active_duration

        if self.emitter_type == "intermittent":
            # Simple deterministic intermittent pattern.
            return (time_slot - self.start_time) % self.period == 0

        if self.emitter_type == "frequency_agile":
            return True

        raise ValueError(f"Unknown emitter type: {self.emitter_type}")

    def get_band(self, time_slot: int) -> int:
        """Return the frequency band occupied at a given time."""

        if self.emitter_type != "frequency_agile":
            return self.band

        if not self.agile_bands:
            return self.band

        index = ((time_slot - self.start_time) // self.agile_period) % len(
            self.agile_bands
        )

        return self.agile_bands[index]