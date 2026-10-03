from environment.scenarios import create_random_scenario
from receiver.receiver import VirtualReceiver

from schedulers import KnowledgeAwareScheduler


def main():

    env = create_random_scenario(
        seed=42,
        num_bands=20,
        num_time_slots=1000,
        num_emitters=8,
    )

    receiver = VirtualReceiver(
        environment=env,
        detection_probability=0.90,
        false_alarm_probability=0.02,
        dwell_time=1,
        retune_time=1,
        sensitivity=0.8,
        seed=42,
    )

    scheduler = KnowledgeAwareScheduler(
        num_bands=env.num_bands
    )

    print()
    print("Knowledge-Aware Scheduler Test")
    print("=" * 60)

    for step in range(60):

        band = scheduler.select_band()

        result = receiver.scan(band)

        scheduler.update(result)

        print(
            f"Step={step:02d} | "
            f"Time={result.time_slot:03d} | "
            f"Band={result.band:02d} | "
            f"{result.result}"
        )

    print()
    print("Final band knowledge")
    print("-" * 60)

    for band in range(env.num_bands):

        features = scheduler.knowledge.get_band_features(
            band,
            receiver.current_time,
        )

        print(
            f"Band {band:02d} | "
            f"Activity={features['activity_probability']:.3f} | "
            f"Uncertainty={features['uncertainty']:.3f} | "
            f"Period={features['estimated_period']:.2f} | "
            f"PeriodicDue={features['periodic_due_score']:.3f}"
        )


if __name__ == "__main__":
    main()