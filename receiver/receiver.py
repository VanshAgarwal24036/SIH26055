from dataclasses import dataclass

import numpy as np

from environment.rf_environment import RFEnvironment


@dataclass
class ScanResult:
    time_slot: int
    band: int
    detected: bool
    false_alarm: bool
    result: str
    scan_duration: int


class VirtualReceiver:
    """
    Simulated receiver for the SIH26055 environment.

    The scheduler does NOT directly access the RF truth matrix.
    It asks the receiver to scan a band and receives an observation.
    """

    def __init__(
        self,
        environment: RFEnvironment,
        detection_probability: float = 0.90,
        false_alarm_probability: float = 0.02,
        dwell_time: int = 1,
        retune_time: int = 1,
        sensitivity: float = 0.8,
        seed: int = 42,
    ):
        self.environment = environment

        self.detection_probability = detection_probability
        self.false_alarm_probability = false_alarm_probability

        self.dwell_time = dwell_time
        self.retune_time = retune_time

        # Used as a receiver sensitivity parameter.
        # A higher value means a more sensitive receiver.
        self.sensitivity = sensitivity

        self.seed = seed

        rng = np.random.default_rng(seed)

        self.detection_random = rng.random(
            (
                self.environment.num_time_slots,
                self.environment.num_bands,
            )
        )

        self.false_alarm_random = rng.random(
            (
                self.environment.num_time_slots,
                self.environment.num_bands,
            )
        )

        self.current_time = 0
        self.current_band = None

        self.total_scans = 0
        self.total_hits = 0
        self.total_misses = 0
        self.total_false_alarms = 0

    def reset(self) -> None:
        """Reset receiver state."""

        self.current_time = 0
        self.current_band = None

        self.total_scans = 0
        self.total_hits = 0
        self.total_misses = 0
        self.total_false_alarms = 0

    def _retuning_cost(self, band: int) -> int:
        """Return retuning cost when moving to another band."""

        if self.current_band is None:
            return 0

        if self.current_band == band:
            return 0

        return self.retune_time

    def scan(self, band: int) -> ScanResult:
        """
        Scan one frequency band.

        The receiver accesses the environment internally.
        The scheduler receives only the resulting observation.
        """

        if not 0 <= band < self.environment.num_bands:
            raise ValueError(
                f"Invalid band {band}. "
                f"Valid range: 0-{self.environment.num_bands - 1}"
            )

        if self.current_time >= self.environment.num_time_slots:
            raise RuntimeError("Receiver has reached the end of the simulation.")

        retuning_cost = self._retuning_cost(band)

        # Advance time because of retuning.
        self.current_time += retuning_cost

        if self.current_time >= self.environment.num_time_slots:
            raise RuntimeError("Receiver ran out of simulation time during retuning.")

        # The actual RF condition exists inside the environment.
        signal_present = bool(self.environment.is_transmitting(
            self.current_time,
            band,))

        # Effective detection probability.
        # Sensitivity modifies the nominal probability.
        effective_pd = np.clip(
            self.detection_probability * self.sensitivity,
            0.0,
            1.0,
        )

        detected = False
        false_alarm = False

        if signal_present:
            detected = bool(
                self.detection_random[self.current_time, band]
                < effective_pd
            )

        else:
            false_alarm = bool(
                self.false_alarm_random[self.current_time, band]
                < self.false_alarm_probability
            )

        if detected:
            result = "HIT"
            self.total_hits += 1

        elif false_alarm:
            result = "FALSE_ALARM"
            self.total_false_alarms += 1

        else:
            result = "MISS"
            self.total_misses += 1

        self.total_scans += 1

        scan_start_time = self.current_time

        # Dwell consumes time.
        self.current_time += self.dwell_time

        self.current_band = band

        return ScanResult(
            time_slot=int(scan_start_time),
            band=int(band),
            detected=bool(detected),
            false_alarm=bool(false_alarm),
            result=str(result),
            scan_duration=int(
                retuning_cost + self.dwell_time
            ),
        )

    def get_statistics(self) -> dict:
        """Return current receiver statistics."""

        return {
            "total_scans": self.total_scans,
            "hits": self.total_hits,
            "misses": self.total_misses,
            "false_alarms": self.total_false_alarms,
            "current_time": self.current_time,
        }