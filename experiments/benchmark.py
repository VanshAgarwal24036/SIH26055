from pathlib import Path

import pandas as pd

from environment.scenarios import create_random_scenario
from receiver.receiver import VirtualReceiver

from schedulers import (
    SequentialScheduler,
    RandomScheduler,
    RoundRobinScheduler,
    GreedyScheduler,
    KnowledgeAwareScheduler,
)

from experiments.runner import ExperimentRunner


NUM_EPISODES = 50


def create_receiver(env, seed):
    """Create a virtual receiver with controlled randomness."""

    return VirtualReceiver(
        environment=env,
        detection_probability=0.90,
        false_alarm_probability=0.02,
        dwell_time=1,
        retune_time=1,
        sensitivity=0.8,
        seed=seed,
    )


def create_scheduler(name, num_bands, seed):
    """Create the requested scheduler."""

    if name == "Sequential":
        return SequentialScheduler(num_bands)

    if name == "Random":
        return RandomScheduler(
            num_bands,
            seed=seed,
        )

    if name == "Round Robin":
        return RoundRobinScheduler(num_bands)

    if name == "Greedy":
        return GreedyScheduler(num_bands)

    if name == "Knowledge-Aware":
        return KnowledgeAwareScheduler(
            num_bands
        )

    raise ValueError(
        f"Unknown scheduler: {name}"
    )


def run_episode(scheduler_name, episode_number):
    """
    Run one scheduler on one randomized RF scenario.

    All schedulers use the same scenario seed and receiver seed
    for a given episode.
    """

    # Different RF scenario for every episode.
    scenario_seed = 10000 + episode_number

    # Same receiver randomness for every scheduler
    # within the same episode.
    receiver_seed = 20000 + episode_number

    # Separate seed for the Random scheduler.
    scheduler_seed = 30000 + episode_number

    # Create randomized RF environment.
    env = create_random_scenario(
        seed=scenario_seed,
        num_bands=20,
        num_time_slots=1000,
        num_emitters=8,
    )

    receiver = create_receiver(
        env,
        seed=receiver_seed,
    )

    scheduler = create_scheduler(
        scheduler_name,
        env.num_bands,
        scheduler_seed,
    )

    runner = ExperimentRunner(
        environment=env,
        receiver=receiver,
        scheduler=scheduler,
    )

    metrics, _ = runner.run()

    return {
        "episode": episode_number,
        "scheduler": scheduler_name,

        "total_scans": metrics.total_scans,
        "hits": metrics.hits,
        "misses": metrics.misses,
        "false_alarms": metrics.false_alarms,

        "pd": metrics.probability_of_detection,
        "pfa": metrics.probability_of_false_alarm,

        "event_detection_rate": metrics.event_detection_rate,

        "intercepted_events": metrics.intercepted_events,
        "missed_events": metrics.missed_events,
        "total_events": metrics.total_events,

        "average_intercept_time": metrics.average_intercept_time,

        "simulation_time": metrics.simulation_time,
    }


def main():

    scheduler_names = [
        "Sequential",
        "Random",
        "Round Robin",
        "Greedy",
        "Knowledge-Aware",
    ]

    all_results = []

    print()
    print("=" * 70)
    print("SIH26055 MULTI-EPISODE BASELINE BENCHMARK")
    print("=" * 70)

    # ---------------------------------------------------------
    # Run all episodes
    # ---------------------------------------------------------

    for scheduler_name in scheduler_names:

        print(
            f"\nRunning {scheduler_name}..."
        )

        for episode in range(
            1,
            NUM_EPISODES + 1,
        ):

            result = run_episode(
                scheduler_name,
                episode,
            )

            all_results.append(result)

            print(
                f"\rEpisode {episode:02d}/{NUM_EPISODES}",
                end="",
                flush=True,
            )

        print("  Done")

    # ---------------------------------------------------------
    # Save episode-level results
    # ---------------------------------------------------------

    df = pd.DataFrame(all_results)

    results_dir = Path("results")

    results_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    csv_path = (
        results_dir
        / "baseline_episode_results.csv"
    )

    df.to_csv(
        csv_path,
        index=False,
    )

    # ---------------------------------------------------------
    # Calculate mean and standard deviation
    # ---------------------------------------------------------

    metric_columns = [
        "total_scans",
        "hits",
        "misses",
        "false_alarms",
        "pd",
        "pfa",
        "event_detection_rate",
        "intercepted_events",
        "missed_events",
        "average_intercept_time",
    ]

    summary = (
        df.groupby("scheduler")[metric_columns]
        .agg(["mean", "std"])
        .round(4)
    )

    summary_csv_path = (
        results_dir
        / "baseline_summary.csv"
    )

    summary.to_csv(
        summary_csv_path
    )

    # ---------------------------------------------------------
    # Print summary
    # ---------------------------------------------------------

    print()
    print("=" * 70)
    print("BASELINE SUMMARY")
    print("=" * 70)

    for scheduler_name in scheduler_names:

        scheduler_data = df[
            df["scheduler"] == scheduler_name
        ]

        print()
        print(scheduler_name)
        print("-" * 50)

        print(
            f"Scans                    : "
            f"{scheduler_data['total_scans'].mean():.2f}"
            f" ± "
            f"{scheduler_data['total_scans'].std():.2f}"
        )

        print(
            f"Pd                       : "
            f"{scheduler_data['pd'].mean():.4f}"
            f" ± "
            f"{scheduler_data['pd'].std():.4f}"
        )

        print(
            f"Pfa                      : "
            f"{scheduler_data['pfa'].mean():.4f}"
            f" ± "
            f"{scheduler_data['pfa'].std():.4f}"
        )

        print(
            f"Event Detection Rate     : "
            f"{scheduler_data['event_detection_rate'].mean():.4f}"
            f" ± "
            f"{scheduler_data['event_detection_rate'].std():.4f}"
        )

        print(
            f"Intercepted Events       : "
            f"{scheduler_data['intercepted_events'].mean():.2f}"
            f" ± "
            f"{scheduler_data['intercepted_events'].std():.2f}"
        )

        print(
            f"Average Intercept Time   : "
            f"{scheduler_data['average_intercept_time'].mean():.2f}"
            f" ± "
            f"{scheduler_data['average_intercept_time'].std():.2f}"
        )

    print()
    print("=" * 70)
    print(
        f"Episode results saved to: {csv_path}"
    )
    print(
        f"Summary saved to:         {summary_csv_path}"
    )
    print("=" * 70)


if __name__ == "__main__":
    main()