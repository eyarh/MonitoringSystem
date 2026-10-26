#we create this file to make the value more readable for ai
import pandas as pd # type: ignore


def preprocess_data(dataframe):

    if dataframe.empty:
        return dataframe

    data = dataframe.copy()

    numeric_columns = [
        "response_time",
        "status_code",
        "cpu_usage",
        "memory_usage"
    ]

    for column in numeric_columns:

        if column not in data.columns:
            data[column] = 0

        data[column] = pd.to_numeric(
            data[column],
            errors="coerce"
        )

        # Calculate median only if there are valid values
        if data[column].notna().any():

            median_value = data[column].median()

            data[column] = data[column].fillna(
                median_value
            )

        else:

            # If the entire column is empty,
            # use 0 instead
            data[column] = data[column].fillna(0)

    if "recorded_at" in data.columns:

        data["recorded_at"] = pd.to_datetime(
            data["recorded_at"],
            errors="coerce"
        )

    data = data.dropna(
        subset=numeric_columns,
        how="all"
    )

    return data