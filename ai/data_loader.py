import os

import psycopg2  # type: ignore
import pandas as pd  # type: ignore
from dotenv import load_dotenv  # type: ignore

load_dotenv()


def load_metrics(since_minutes=10):

    connection = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "monitoring_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
    )

    query = """
        SELECT
            service_id,
            response_time,
            status_code,
            cpu_usage,
            memory_usage,
            recorded_at
        FROM metrics
        WHERE recorded_at >= NOW() - (%s * INTERVAL '1 minute')
        ORDER BY recorded_at DESC
    """

    try:

        # Built from a cursor rather than pd.read_sql. pandas only
        # supports SQLAlchemy connectables and emits a UserWarning on
        # every call when handed a raw psycopg2 connection, which
        # printed once per analysis run in the service log.
        with connection.cursor() as cursor:

            cursor.execute(query, (since_minutes,))

            columns = [
                description[0]
                for description in cursor.description
            ]

            rows = cursor.fetchall()

        dataframe = pd.DataFrame(
            rows,
            columns=columns
        )

    finally:

        connection.close()

    return dataframe
