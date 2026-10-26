from data_loader import load_metrics
from preprocessing import preprocess_data

from anomaly_detector import detect_anomalies


def main():

    print(
        "Loading monitoring metrics..."
    )

    dataframe = load_metrics(since_minutes=10)

    print(
        f"Loaded {len(dataframe)} metrics"
    )
    dataframe = preprocess_data(dataframe)

    print(
        "Data preprocessing completed"
    )
    results = detect_anomalies(
        dataframe
    )

    anomalies = results[
        results["is_anomaly"]
    ]

    print(
        f"Detected {len(anomalies)} anomalies"
    )

    if not anomalies.empty:

        print(
            anomalies[
                [
                    "service_id",
                    "response_time",
                    "recorded_at",
                    "severity",
                    "description"
                ]
            ]
        )


if __name__ == "__main__":
    main()