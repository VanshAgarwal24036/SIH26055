
from environment.emitter import Emitter
from environment.rf_environment import RFEnvironment
from receiver.receiver import VirtualReceiver

from schedulers import (
    SequentialScheduler,
    RandomScheduler,
    RoundRobinScheduler,
    GreedyScheduler,
)

from experiments.runner import ExperimentRunner


def create_environment():

    env = RFEnvironment(
        num_bands=20,
        num_time_slots=1000,
    )

    # Continuous emitter
    env.add_emitter(
        Emitter(
            emitter_id=1,
            band=2,
            emitter_type="continuous",
        )
    )

    # Periodic emitter
    env.add_emitter(
        Emitter(
            emitter_id=2,
            band=7,
            emitter_type="periodic",
            period=20,
            active_duration=5,
        )
    )

    # Intermittent emitter
    env.add_emitter(
        Emitter(
            emitter_id=3,
            band=12,
            emitter_type="intermittent",
            period=15,
        )
    )

    # Frequency agile emitter
    env.add_emitter(
        Emitter(
            emitter_id=4,
            band=5,
            emitter_type="frequency_agile",
            agile_bands=[5, 8, 11, 15],
            agile_period=10,
        )
    )

    return env


def create_receiver(env, seed):

    return VirtualReceiver(
        environment=env,
        detection_probability=0.90,
        false_alarm_probability=0.02,
        dwell_time=1,
        retune_time=1,
        sensitivity=0.8,
        seed=seed,
    )


def main():

    scheduler_factories = {
        "Sequential": lambda n: SequentialScheduler(n),

        "Random": lambda n: RandomScheduler(
            n,
            seed=42,
        ),

        "Round Robin": lambda n: RoundRobinScheduler(n),

        "Greedy": lambda n: GreedyScheduler(n),
    }

    print("\nSIH26055 BASELINE EXPERIMENT")
    print("=" * 60)

    for name, factory in scheduler_factories.items():

        env = create_environment()

        receiver = create_receiver(env, seed=42)

        scheduler = factory(
            env.num_bands
        )

        runner = ExperimentRunner(
            environment=env,
            receiver=receiver,
            scheduler=scheduler,
        )

        metrics, _ = runner.run()

        print(f"\n{name}")
        print("-" * 40)

        print(
            f"Scans                    : "
            f"{metrics.total_scans}"
        )

        print(
            f"Hits                     : "
            f"{metrics.hits}"
        )

        print(
            f"Misses                   : "
            f"{metrics.misses}"
        )

        print(
            f"False alarms             : "
            f"{metrics.false_alarms}"
        )

        print(
            f"Probability of Detection : "
            f"{metrics.probability_of_detection:.4f}"
        )

        print(
            f"Probability of False Alarm: "
            f"{metrics.probability_of_false_alarm:.4f}"
        )

        print(
            f"Event Detection Rate     : "
            f"{metrics.event_detection_rate:.4f}"
        )

        print(
            f"Intercepted Events       : "
            f"{metrics.intercepted_events}"
        )

        print(
            f"Missed Events            : "
            f"{metrics.missed_events}"
        )

        print(
            f"Total Events             : "
            f"{metrics.total_events}"
        )

        print(
            f"Average Intercept Time   : "
            f"{metrics.average_intercept_time:.2f}"
        )


if __name__ == "__main__":
    main()