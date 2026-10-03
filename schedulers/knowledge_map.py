import numpy as np


class RFKnowledgeMap:
    """
    Stores information learned from receiver observations.

    The scheduler only sees observations:
        HIT
        MISS
        FALSE_ALARM

    It never receives RF ground truth.
    """

    def __init__(self, num_bands: int):

        self.num_bands = num_bands

        # Basic observation counts.
        self.scans = np.zeros(
            num_bands,
            dtype=np.int64,
        )

        self.hits = np.zeros(
            num_bands,
            dtype=np.int64,
        )

        self.misses = np.zeros(
            num_bands,
            dtype=np.int64,
        )

        self.false_alarms = np.zeros(
            num_bands,
            dtype=np.int64,
        )

        # Last observation times.
        self.last_scan_time = np.full(
            num_bands,
            -1,
            dtype=np.int64,
        )

        self.last_hit_time = np.full(
            num_bands,
            -1,
            dtype=np.int64,
        )

        # Full hit-time history for every band.
        self.hit_history = [
            []
            for _ in range(num_bands)
        ]

        # Global history of successful detections.
        # Format: (time_slot, band)
        self.global_hit_history = []

        # Band-to-band transition counts.
        #
        # transition_counts[A][B]
        # = number of times a HIT on A was followed by a HIT on B.
        self.transition_counts = np.zeros(
            (num_bands, num_bands),
            dtype=np.int64,
        )

        self.last_hit_band = None

    # ---------------------------------------------------------
    # Observation update
    # ---------------------------------------------------------

    def update(
        self,
        band: int,
        time_slot: int,
        result: str,
    ) -> None:

        if not 0 <= band < self.num_bands:
            raise ValueError(
                f"Invalid band: {band}"
            )

        self.scans[band] += 1

        self.last_scan_time[band] = time_slot

        if result == "HIT":

            self.hits[band] += 1
            self.last_hit_time[band] = time_slot

            # Store hit time for temporal analysis.
            self.hit_history[band].append(
                time_slot
            )

            # Store global detection history.
            self.global_hit_history.append(
                (time_slot, band)
            )

            # Learn transitions between detected bands.
            if self.last_hit_band is not None:

                self.transition_counts[
                    self.last_hit_band,
                    band,
                ] += 1

            self.last_hit_band = band

        elif result == "MISS":

            self.misses[band] += 1

        elif result == "FALSE_ALARM":

            self.false_alarms[band] += 1

        else:

            raise ValueError(
                f"Unknown receiver result: {result}"
            )

    # ---------------------------------------------------------
    # Activity estimation
    # ---------------------------------------------------------

    def estimated_activity(self) -> np.ndarray:
        """
        Smoothed empirical detection probability.
        """

        return (
            self.hits + 1.0
        ) / (
            self.scans + 2.0
        )

    # ---------------------------------------------------------
    # Uncertainty
    # ---------------------------------------------------------

    def uncertainty(self) -> np.ndarray:
        """
        Simple observation uncertainty estimate.

        More observations -> lower uncertainty.
        """

        return 1.0 / np.sqrt(
            self.scans + 1.0
        )

    # ---------------------------------------------------------
    # Temporal information
    # ---------------------------------------------------------

    def estimate_period(
        self,
        band: int,
    ) -> float | None:
        """
        Estimate periodicity from HIT timestamps.

        Returns:
            Estimated period in time slots,
            or None if insufficient history.
        """

        times = self.hit_history[band]

        if len(times) < 3:
            return None

        intervals = np.diff(
            np.asarray(times)
        )

        if len(intervals) == 0:
            return None

        return float(
            np.median(intervals)
        )

    def periodicity_confidence(
        self,
        band: int,
    ) -> float:
        """
        Estimate how regular the HIT intervals are.

        Returns a value approximately in [0, 1].

        Higher = more periodic.
        """

        times = self.hit_history[band]

        if len(times) < 3:
            return 0.0

        intervals = np.diff(
            np.asarray(times)
        ).astype(float)

        mean_interval = np.mean(
            intervals
        )

        if mean_interval <= 0:
            return 0.0

        std_interval = np.std(
            intervals
        )

        confidence = 1.0 / (
            1.0 + (
                std_interval
                / mean_interval
            )
        )

        return float(
            np.clip(
                confidence,
                0.0,
                1.0,
            )
        )

    def periodic_due_score(
        self,
        band: int,
        current_time: int,
    ) -> float:
        """
        Estimate whether a periodic emitter may be due
        for another transmission soon.

        Higher score means the current time is closer to
        the estimated periodic phase.
        """

        period = self.estimate_period(
            band
        )

        if period is None:
            return 0.0

        last_hit = self.last_hit_time[band]

        if last_hit < 0:
            return 0.0

        elapsed = current_time - last_hit

        if elapsed < 0:
            return 0.0

        # Distance from the expected next period.
        phase_error = abs(
            elapsed - period
        )

        # Convert to a score.
        score = np.exp(
            -phase_error / max(period, 1.0)
        )

        return float(
            np.clip(
                score,
                0.0,
                1.0,
            )
        )

    # ---------------------------------------------------------
    # Frequency-agility information
    # ---------------------------------------------------------

    def transition_probability(
        self,
        from_band: int,
        to_band: int,
    ) -> float:
        """
        Probability that a successful detection on from_band
        is followed by a successful detection on to_band.
        """

        row = self.transition_counts[
            from_band
        ]

        total = row.sum()

        if total == 0:
            return 0.0

        return float(
            row[to_band] / total
        )

    def most_likely_next_band(
        self,
        current_band: int,
    ) -> int | None:
        """
        Return the band most frequently observed after
        the current detected band.
        """

        row = self.transition_counts[
            current_band
        ]

        if row.sum() == 0:
            return None

        return int(
            np.argmax(row)
        )

    # ---------------------------------------------------------
    # Time since observations
    # ---------------------------------------------------------

    def time_since_scan(
        self,
        current_time: int,
    ) -> np.ndarray:

        result = np.full(
            self.num_bands,
            current_time + 1,
            dtype=np.float64,
        )

        scanned = (
            self.last_scan_time >= 0
        )

        result[scanned] = (
            current_time
            - self.last_scan_time[scanned]
        )

        return result

    def time_since_hit(
        self,
        current_time: int,
    ) -> np.ndarray:

        result = np.full(
            self.num_bands,
            current_time + 1,
            dtype=np.float64,
        )

        hit = (
            self.last_hit_time >= 0
        )

        result[hit] = (
            current_time
            - self.last_hit_time[hit]
        )

        return result

    # ---------------------------------------------------------
    # Complete feature vector
    # ---------------------------------------------------------

    def get_band_features(
        self,
        band: int,
        current_time: int,
    ) -> dict:

        period = self.estimate_period(
            band
        )

        return {
            "band": band,

            "scans": int(
                self.scans[band]
            ),

            "hits": int(
                self.hits[band]
            ),

            "misses": int(
                self.misses[band]
            ),

            "false_alarms": int(
                self.false_alarms[band]
            ),

            "activity_probability": float(
                self.estimated_activity()[band]
            ),

            "uncertainty": float(
                self.uncertainty()[band]
            ),

            "time_since_scan": float(
                self.time_since_scan(
                    current_time
                )[band]
            ),

            "time_since_hit": float(
                self.time_since_hit(
                    current_time
                )[band]
            ),

            "estimated_period": (
                float(period)
                if period is not None
                else 0.0
            ),

            "periodicity_confidence": float(
                self.periodicity_confidence(
                    band
                )
            ),

            "periodic_due_score": float(
                self.periodic_due_score(
                    band,
                    current_time,
                )
            ),
        }

    # ---------------------------------------------------------
    # Reset
    # ---------------------------------------------------------

    def reset(self) -> None:

        self.scans.fill(0)
        self.hits.fill(0)
        self.misses.fill(0)
        self.false_alarms.fill(0)

        self.last_scan_time.fill(-1)
        self.last_hit_time.fill(-1)

        self.hit_history = [
            []
            for _ in range(self.num_bands)
        ]

        self.global_hit_history.clear()

        self.transition_counts.fill(0)

        self.last_hit_band = None