import matplotlib.pyplot as plt

from environment.emitter import Emitter
from environment.rf_environment import RFEnvironment


def main():
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

    # Frequency-agile emitter
    env.add_emitter(
        Emitter(
            emitter_id=4,
            band=5,
            emitter_type="frequency_agile",
            agile_bands=[5, 8, 11, 15],
            agile_period=10,
        )
    )

    truth = env.generate()

    print("RF Environment Generated")
    print("-------------------------")
    print(f"Time slots : {env.num_time_slots}")
    print(f"Frequency bands : {env.num_bands}")
    print(f"Emitters : {len(env.emitters)}")

    print("\nTruth matrix shape:")
    print(truth.shape)

    print("\nBand occupancy:")
    for band, occupancy in enumerate(env.get_occupancy()):
        print(f"Band {band:2d}: {occupancy:.3f}")

    # Visualize hidden RF environment
    plt.figure(figsize=(14, 6))

    plt.imshow(
        truth.T,
        aspect="auto",
        origin="lower",
        interpolation="nearest",
    )

    plt.xlabel("Time Slot")
    plt.ylabel("Frequency Band")
    plt.title("Simulated RF Environment (Ground Truth)")

    plt.colorbar(label="Transmission")

    plt.show()


if __name__ == "__main__":
    main()