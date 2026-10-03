import numpy as np

from environment.emitter import Emitter
from environment.rf_environment import RFEnvironment


def create_random_scenario(
    seed: int,
    num_bands: int = 20,
    num_time_slots: int = 1000,
    num_emitters: int = 8,
) -> RFEnvironment:

    rng = np.random.default_rng(seed)

    env = RFEnvironment(
        num_bands=num_bands,
        num_time_slots=num_time_slots,
    )

    emitter_types = [
        "continuous",
        "periodic",
        "intermittent",
        "frequency_agile",
    ]

    # Give each emitter an initial band.
    initial_bands = rng.choice(
        num_bands,
        size=num_emitters,
        replace=False,
    )

    for emitter_id in range(1, num_emitters + 1):

        emitter_type = emitter_types[
            (emitter_id - 1) % len(emitter_types)
        ]

        band = int(
            initial_bands[emitter_id - 1]
        )

        start_time = int(
            rng.integers(
                0,
                200,
            )
        )

        end_time = int(
            rng.integers(
                max(start_time + 100, 300),
                num_time_slots,
            )
        )

        if emitter_type == "continuous":

            emitter = Emitter(
                emitter_id=emitter_id,
                band=band,
                emitter_type="continuous",
                start_time=start_time,
                end_time=end_time,
            )

        elif emitter_type == "periodic":

            period = int(
                rng.integers(
                    10,
                    50,
                )
            )

            active_duration = int(
                rng.integers(
                    1,
                    min(period, 10),
                )
            )

            emitter = Emitter(
                emitter_id=emitter_id,
                band=band,
                emitter_type="periodic",
                start_time=start_time,
                end_time=end_time,
                period=period,
                active_duration=active_duration,
            )

        elif emitter_type == "intermittent":

            period = int(
                rng.integers(
                    8,
                    40,
                )
            )

            emitter = Emitter(
                emitter_id=emitter_id,
                band=band,
                emitter_type="intermittent",
                start_time=start_time,
                end_time=end_time,
                period=period,
            )

        else:
            # Frequency-agile emitter.
            num_agile_bands = int(
                rng.integers(
                    3,
                    6,
                )
            )

            agile_bands = rng.choice(
                num_bands,
                size=num_agile_bands,
                replace=False,
            ).tolist()

            agile_period = int(
                rng.integers(
                    5,
                    20,
                )
            )

            emitter = Emitter(
                emitter_id=emitter_id,
                band=band,
                emitter_type="frequency_agile",
                start_time=start_time,
                end_time=end_time,
                agile_bands=[
                    int(b)
                    for b in agile_bands
                ],
                agile_period=agile_period,
            )

        env.add_emitter(emitter)

    env.generate()

    return env