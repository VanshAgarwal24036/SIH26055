from environment.emitter import Emitter
from environment.rf_environment import RFEnvironment
from receiver.receiver import VirtualReceiver


def main():
    env = RFEnvironment(
        num_bands=20,
        num_time_slots=1000,
    )

    env.add_emitter(
        Emitter(
            emitter_id=1,
            band=2,
            emitter_type="continuous",
        )
    )

    env.add_emitter(
        Emitter(
            emitter_id=2,
            band=7,
            emitter_type="periodic",
            period=20,
            active_duration=5,
        )
    )

    env.add_emitter(
        Emitter(
            emitter_id=3,
            band=12,
            emitter_type="intermittent",
            period=15,
        )
    )

    env.add_emitter(
        Emitter(
            emitter_id=4,
            band=5,
            emitter_type="frequency_agile",
            agile_bands=[5, 8, 11, 15],
            agile_period=10,
        )
    )

    env.generate()

    receiver = VirtualReceiver(
        environment=env,
        detection_probability=0.90,
        false_alarm_probability=0.02,
        dwell_time=1,
        retune_time=1,
        sensitivity=0.8,
    )

    print("Virtual Receiver Test")
    print("---------------------")

    test_bands = [2, 7, 12, 5, 8, 11, 15, 0]

    for band in test_bands:
        result = receiver.scan(band)

        print(
            f"Time={result.time_slot:3d} | "
            f"Band={result.band:2d} | "
            f"Result={result.result:12s} | "
            f"Duration={result.scan_duration}"
        )

    print("\nReceiver statistics:")
    print(receiver.get_statistics())


if __name__ == "__main__":
    main()