from sklearn.ensemble import IsolationForest
from scipy.stats import zscore
import pandas as pd


# status_code is deliberately excluded: it is 200 on every healthy
# row, so its z-score is numerical noise over a near-constant column.
# That is what produced "Unusual status code detected" with
# value 200.00 and expected_value 200.00.
FEATURE_COLUMNS = [
    "response_time",
    "cpu_usage",
    "memory_usage"
]

CONTAMINATION = "auto"


def detect_anomalies(dataframe):

    # No data
    if dataframe is None or dataframe.empty:
        return dataframe

    # Make a copy so we don't modify the original DataFrame
    data = dataframe.copy()

    # Make sure all expected columns exist
    for column in FEATURE_COLUMNS:

        if column not in data.columns:
            data[column] = 0

    # Columns used by the anomaly detection model
    values = data[FEATURE_COLUMNS].copy()

    # Convert values to numeric
    for column in FEATURE_COLUMNS:

        values[column] = pd.to_numeric(
            values[column],
            errors="coerce"
        )

    # Replace missing values
    values = values.fillna(0)

    # Create Isolation Forest model
    model = IsolationForest(
        contamination=CONTAMINATION,
        random_state=42
    )

    # Train model
    model.fit(values)

    # 1 = normal
    # -1 = anomaly
    predictions = model.predict(values)

    # True when metric is an anomaly
    data["is_anomaly"] = predictions == -1

    # Calculate Z-scores
    z_scores = values.apply(
        zscore,
        axis=0
    )

    # Replace NaN / infinite values
    z_scores = z_scores.replace(
        [float("inf"), float("-inf")],
        0
    )

    z_scores = z_scores.fillna(0)

    # Find the metric with the largest deviation
    data["metric_type"] = z_scores.idxmax(
        axis=1
    )

    # Find the largest Z-score for each row
    max_z = z_scores.max(
        axis=1
    )

    # -------------------------------------------------
    # Severity
    # -------------------------------------------------

    def calculate_severity(
        is_anomaly,
        z
    ):

        if not is_anomaly:
            return None

        if z >= 4:
            return "CRITICAL"

        return "WARNING"

    data["severity"] = [
        calculate_severity(
            anomaly,
            z
        )
        for anomaly, z
        in zip(
            data["is_anomaly"],
            max_z
        )
    ]

    # -------------------------------------------------
    # Value and expected value
    # -------------------------------------------------

    data["value"] = None
    data["expected_value"] = None

    # Calculate mean for every monitored metric
    metric_means = {}

    for column in FEATURE_COLUMNS:

        metric_means[column] = values[column].mean()

    # Get the actual value and expected value
    # for each row's detected metric

    for index in data.index:

        metric_type = data.loc[
            index,
            "metric_type"
        ]

        data.loc[
            index,
            "value"
        ] = values.loc[
            index,
            metric_type
        ]

        data.loc[
            index,
            "expected_value"
        ] = metric_means.get(
            metric_type,
            0
        )

    # -------------------------------------------------
    # Naming convention
    # -------------------------------------------------
    # The rule-based detector in the backend writes SERVICE_DOWN,
    # HTTP_ERROR and HIGH_RESPONSE_TIME. Left as-is, the dashboard
    # showed those next to lowercase cpu_usage / response_time rows
    # from this file. Uppercased last, after the value lookups above,
    # which index into `values` by the original column name.

    data["metric_type"] = data["metric_type"].str.upper()

    # -------------------------------------------------
    # Description
    # -------------------------------------------------

    def create_description(
        is_anomaly,
        metric_type
    ):

        if not is_anomaly:
            return "Normal metric"

        if metric_type is None:
            metric_type = "metric"

        readable_metric = (
            str(metric_type)
            .replace("_", " ")
            .lower()
        )

        return (
            f"Unusual {readable_metric} detected"
        )

    data["description"] = [
        create_description(
            anomaly,
            metric
        )
        for anomaly, metric
        in zip(
            data["is_anomaly"],
            data["metric_type"]
        )
    ]

    return data