from schedulers.knowledge_map import RFKnowledgeMap


def main():

    knowledge = RFKnowledgeMap(
        num_bands=20
    )

    # Simulated periodic emitter:
    # HIT at 10, 20, 30, 40, 50
    for time_slot in [
        10,
        20,
        30,
        40,
        50,
    ]:

        knowledge.update(
            band=7,
            time_slot=time_slot,
            result="HIT",
        )

    print("Band 7 temporal analysis")
    print("-" * 40)

    print(
        "Hit history:",
        knowledge.hit_history[7],
    )

    print(
        "Estimated period:",
        knowledge.estimate_period(7),
    )

    print(
        "Periodicity confidence:",
        knowledge.periodicity_confidence(7),
    )

    for current_time in [
        55,
        59,
        60,
        61,
        65,
    ]:

        print(
            f"Time {current_time:3d} "
            f"→ due score = "
            f"{knowledge.periodic_due_score(7, current_time):.4f}"
        )

    # ---------------------------------------------------------
    # Test frequency transition learning
    # ---------------------------------------------------------

    transition_test = RFKnowledgeMap(
        num_bands=20
    )

    detections = [
        (10, 5),
        (20, 8),
        (30, 5),
        (40, 8),
        (50, 5),
        (60, 8),
    ]

    for time_slot, band in detections:

        transition_test.update(
            band=band,
            time_slot=time_slot,
            result="HIT",
        )

    print("\nFrequency transition analysis")
    print("-" * 40)

    print(
        "5 → 8 probability:",
        transition_test.transition_probability(
            5,
            8,
        ),
    )

    print(
        "8 → 5 probability:",
        transition_test.transition_probability(
            8,
            5,
        ),
    )

    print(
        "Likely band after 5:",
        transition_test.most_likely_next_band(5),
    )

    print(
        "Likely band after 8:",
        transition_test.most_likely_next_band(8),
    )


if __name__ == "__main__":
    main()