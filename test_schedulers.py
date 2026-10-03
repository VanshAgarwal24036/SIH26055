from receiver.receiver import ScanResult

from schedulers import (
    SequentialScheduler,
    RandomScheduler,
    RoundRobinScheduler,
    GreedyScheduler,
)


def test_stateless_scheduler(name, scheduler):

    print(f"\n{name}")
    print("-" * len(name))

    selected_bands = []

    for _ in range(10):
        band = scheduler.select_band()
        selected_bands.append(band)

    print(selected_bands)


def test_greedy_scheduler():

    scheduler = GreedyScheduler(num_bands=20)

    print("\nGreedy Scheduler")
    print("----------------")

    selected_bands = []

    for time_slot in range(30):

        band = scheduler.select_band()
        selected_bands.append(band)

        # Simulated observations.
        # Band 2 is producing hits, all other bands miss.
        if band == 2:
            result = "HIT"
        else:
            result = "MISS"

        observation = ScanResult(
            time_slot=time_slot,
            band=band,
            detected=(result == "HIT"),
            false_alarm=False,
            result=result,
            scan_duration=1,
        )

        # This is the important part.
        scheduler.update(observation)

    print(selected_bands)


def main():

    num_bands = 20

    test_stateless_scheduler(
        "Sequential Scheduler",
        SequentialScheduler(num_bands),
    )

    test_stateless_scheduler(
        "Random Scheduler",
        RandomScheduler(
            num_bands,
            seed=42,
        ),
    )

    test_stateless_scheduler(
        "Round Robin Scheduler",
        RoundRobinScheduler(num_bands),
    )

    test_greedy_scheduler()


if __name__ == "__main__":
    main()