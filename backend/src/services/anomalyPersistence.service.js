const pool = require("../config/database");

async function saveAnomaly(
    serviceId,
    metricType,
    value,
    expectedValue,
    severity,
    description
) {

    const result = await pool.query(
        `
        INSERT INTO anomalies
        (
            service_id,
            metric_type,
            value,
            expected_value,
            severity,
            description
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
            serviceId,
            metricType,
            value,
            expectedValue,
            severity,
            description
        ]
    );

    return result.rows[0];
}

module.exports = {
    saveAnomaly
};