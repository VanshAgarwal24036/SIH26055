from environment.scenarios import create_random_scenario


def main():

    for seed in [1, 2, 3]:

        env = create_random_scenario(
            seed=seed,
            num_bands=20,
            num_time_slots=1000,
            num_emitters=8,
        )

        print()
        print(f"Scenario Seed: {seed}")
        print("-" * 40)

        for emitter in env.emitters:

            print(
                f"Emitter {emitter.emitter_id} | "
                f"Type={emitter.emitter_type:18s} | "
                f"Band={emitter.band:2d} | "
                f"Start={emitter.start_time:3d} | "
                f"End={emitter.end_time:3d}"
            )


if __name__ == "__main__":
    main()