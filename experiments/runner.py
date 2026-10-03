from metrics.evaluation import MetricsEvaluator


class ExperimentRunner:

    def __init__(self, environment, receiver, scheduler):
        self.environment = environment
        self.receiver = receiver
        self.scheduler = scheduler

    def run(self):

        self.receiver.reset()
        self.scheduler.reset()

        self.environment.generate()

        scan_results = []

        while self.receiver.current_time < self.environment.num_time_slots:

            band = self.scheduler.select_band()

            try:
                result = self.receiver.scan(band)
            except RuntimeError:
                break

            scan_results.append(result)

            # Scheduler sees only the observation.
            self.scheduler.update(result)

        evaluator = MetricsEvaluator(
            self.environment
        )

        metrics = evaluator.evaluate(
            scan_results,
            self.receiver.get_statistics(),
        )

        return metrics, scan_results