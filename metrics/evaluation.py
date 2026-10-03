from dataclasses import dataclass


@dataclass
class EvaluationResult:
    total_scans: int
    hits: int
    misses: int
    false_alarms: int

    # Receiver-level detection metric.
    probability_of_detection: float

    probability_of_false_alarm: float

    # Scheduler-level metric.
    event_detection_rate: float

    intercepted_events: int
    missed_events: int
    total_events: int

    average_intercept_time: float

    simulation_time: int


class MetricsEvaluator:

    def __init__(self, environment):
        self.environment = environment

    def _build_transmission_events(self):

        events = []

        for emitter in self.environment.emitters:

            active_previous = False
            event_start = None
            event_band = None

            for time_slot in range(
                self.environment.num_time_slots
            ):

                active = emitter.is_active(time_slot)

                if active:

                    band = emitter.get_band(time_slot)

                    if not active_previous:

                        event_start = time_slot
                        event_band = band

                    elif band != event_band:

                        events.append(
                            {
                                "emitter_id": emitter.emitter_id,
                                "start_time": event_start,
                                "end_time": time_slot - 1,
                                "band": event_band,
                                "intercepted": False,
                                "detection_time": None,
                            }
                        )

                        event_start = time_slot
                        event_band = band

                    active_previous = True

                else:

                    if active_previous:

                        events.append(
                            {
                                "emitter_id": emitter.emitter_id,
                                "start_time": event_start,
                                "end_time": time_slot - 1,
                                "band": event_band,
                                "intercepted": False,
                                "detection_time": None,
                            }
                        )

                    active_previous = False
                    event_start = None
                    event_band = None

            if active_previous:

                events.append(
                    {
                        "emitter_id": emitter.emitter_id,
                        "start_time": event_start,
                        "end_time": self.environment.num_time_slots - 1,
                        "band": event_band,
                        "intercepted": False,
                        "detection_time": None,
                    }
                )

        return events

    def evaluate(self, scan_results, receiver_stats):

        signal_scans = 0
        empty_scans = 0

        hits = 0
        misses = 0
        false_alarms = 0

        # ---------------------------------------------------------
        # Receiver-level metrics
        # ---------------------------------------------------------

        for result in scan_results:

            signal_present = self.environment.is_transmitting(
                result.time_slot,
                result.band,
            )

            if signal_present:

                signal_scans += 1

                if result.result == "HIT":
                    hits += 1

            else:

                empty_scans += 1

                if result.result == "FALSE_ALARM":
                    false_alarms += 1

            if result.result == "MISS":
                misses += 1

        probability_of_detection = (
            hits / signal_scans
            if signal_scans > 0
            else 0.0
        )

        probability_of_false_alarm = (
            false_alarms / empty_scans
            if empty_scans > 0
            else 0.0
        )

        # ---------------------------------------------------------
        # Emitter-event interception
        # ---------------------------------------------------------

        events = self._build_transmission_events()

        intercept_delays = []

        for event in events:

            for result in scan_results:

                if result.result != "HIT":
                    continue

                if result.band != event["band"]:
                    continue

                if result.time_slot < event["start_time"]:
                    continue

                if result.time_slot > event["end_time"]:
                    continue

                event["intercepted"] = True
                event["detection_time"] = result.time_slot

                delay = (
                    result.time_slot
                    - event["start_time"]
                )

                intercept_delays.append(delay)

                break

        intercepted_events = sum(
            event["intercepted"]
            for event in events
        )

        total_events = len(events)

        missed_events = (
            total_events
            - intercepted_events
        )

        event_detection_rate = (
            intercepted_events / total_events
            if total_events > 0
            else 0.0
        )

        average_intercept_time = (
            sum(intercept_delays)
            / len(intercept_delays)
            if intercept_delays
            else 0.0
        )

        return EvaluationResult(
            total_scans=len(scan_results),

            hits=hits,
            misses=misses,
            false_alarms=false_alarms,

            probability_of_detection=probability_of_detection,

            probability_of_false_alarm=probability_of_false_alarm,

            event_detection_rate=event_detection_rate,

            intercepted_events=intercepted_events,

            missed_events=missed_events,

            total_events=total_events,

            average_intercept_time=average_intercept_time,

            simulation_time=receiver_stats["current_time"],
        )