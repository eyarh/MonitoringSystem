from flask import Flask, jsonify, request # type: ignore 
from flask_cors import CORS # type: ignore 
from dotenv import load_dotenv # type: ignore 

import os
import psycopg2 # type: ignore 
import pandas as pd # type: ignore 

from data_loader import load_metrics
from anomaly_detector import detect_anomalies


load_dotenv()

app = Flask(__name__)

CORS(app)


@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "UP",
        "service": "AI anomaly detector"
    })


@app.route("/analyze", methods=["POST"])
def analyze():

    try:

        # Get JSON request body
        request_data = request.get_json(
            silent=True
        ) or {}

        # Number of minutes to analyze
        since_minutes = request_data.get(
            "since_minutes",
            10
        )

        # Make sure since_minutes is an integer
        try:

            since_minutes = int(
                since_minutes
            )

        except (TypeError, ValueError):

            since_minutes = 10

        print(
            f"Starting AI analysis for "
            f"the last {since_minutes} minutes..."
        )

        # Load recent metrics
        dataframe = load_metrics(
            since_minutes=since_minutes
        )

        if dataframe is None or dataframe.empty:

            return jsonify({
                "success": True,
                "message": "No recent metrics found",
                "metrics_analyzed": 0,
                "anomalies_detected": 0,
                "anomalies_inserted": 0
            })

        print(
            f"Metrics loaded: {len(dataframe)}"
        )

        # Run anomaly detector
        results = detect_anomalies(
            dataframe
        )

        # Make sure results is a DataFrame
        if results is None:

            results = pd.DataFrame()

        elif not isinstance(
            results,
            pd.DataFrame
        ):

            results = pd.DataFrame(
                results
            )

        print(
            f"Anomaly detector returned "
            f"{len(results)} rows"
        )

        # Count anomalies
        if "is_anomaly" in results.columns:

            anomaly_rows = results[
                results["is_anomaly"] == True
            ].copy()

        else:

            anomaly_rows = pd.DataFrame()

        anomalies_detected = len(
            anomaly_rows
        )

        print(
            f"Anomalies detected: "
            f"{anomalies_detected}"
        )

        # Insert anomalies into PostgreSQL
        anomalies_inserted = insert_anomalies(
            anomaly_rows
        )

        return jsonify({
            "success": True,
            "metrics_analyzed": len(dataframe),
            "anomalies_detected": anomalies_detected,
            "anomalies_inserted": anomalies_inserted
        })

    except Exception as error:

        print(
            "AI analysis error:",
            str(error)
        )

        return jsonify({
            "success": False,
            "error": str(error)
        }), 500


# Suppress a repeat finding only when one at least as bad is already
# recorded for the same service + metric_type inside this window.
#
# IsolationForest ranks rows within each batch, so on a healthy system
# it flags its share every tick regardless. Plain category dedupe is
# not enough: a 3 ms noise row and a 3019 ms outage are both labelled
# "response_time / WARNING", so keying on the label alone silences the
# real fault. Comparing the value keeps the worst finding per window
# while dropping the repeats. All three features here are
# higher-is-worse, which is what makes >= the right comparison.
ANOMALY_DEDUPE_MINUTES = 10


def to_native(value):
    """
    pandas hands back numpy scalars. psycopg2 cannot adapt numpy.int64
    at all, and numpy 2.x renders float64 as "np.float64(3.2)", which
    Postgres then parses as a reference to a schema called "np".
    Convert to plain Python types before they reach the driver.
    """

    if value is None:
        return None

    if pd.isna(value):
        return None

    if hasattr(value, "item"):
        return value.item()

    return value


def insert_anomalies(anomaly_rows):

    if anomaly_rows.empty:

        return 0

    connection = None

    inserted = 0

    try:

        connection = psycopg2.connect(
            host=os.getenv(
                "DB_HOST",
                "localhost"
            ),
            port=os.getenv(
                "DB_PORT",
                "5432"
            ),
            database=os.getenv(
                "DB_NAME",
                "monitoring_db"
            ),
            user=os.getenv(
                "DB_USER",
                "postgres"
            ),
            password=os.getenv(
                "DB_PASSWORD",
                ""
            )
        )

        cursor = connection.cursor()

        for _, row in anomaly_rows.iterrows():

            service_id = to_native(
                row.get("service_id")
            )

            anomaly_type = row.get(
                "metric_type",
                "metric"
            )

            severity = row.get(
                "severity",
                "medium"
            )

            value = to_native(
                row.get("value")
            )

            expected_value = to_native(
                row.get("expected_value")
            )

            description = row.get(
                "description",
                "Anomaly detected"
            )

            cursor.execute(
                """
                INSERT INTO anomalies (
                    service_id,
                    metric_type,
                    severity,
                    value,
                    expected_value,
                    description
                )
                SELECT %s, %s, %s, %s, %s, %s
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM anomalies
                    WHERE service_id = %s
                      AND metric_type = %s
                      AND value >= %s
                      AND detected_at >
                          NOW() - (%s * INTERVAL '1 minute')
                )
                """,
                (
                    service_id,
                    str(anomaly_type),
                    str(severity),
                    value,
                    expected_value,
                    str(description),
                    service_id,
                    str(anomaly_type),
                    value,
                    ANOMALY_DEDUPE_MINUTES
                )
            )

            inserted += cursor.rowcount

        connection.commit()

        cursor.close()

        return inserted

    except Exception:

        if connection:
            connection.rollback()

        raise

    finally:

        if connection:
            connection.close()


if __name__ == "__main__":

    app.run(
        host=os.getenv("AI_HOST", "127.0.0.1"),
        port=int(os.getenv("AI_PORT", "5001")),
        debug=os.getenv("AI_DEBUG", "false").lower() == "true"
    )