const pool = require('../config/database');

const getAllAnomalies = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                anomalies.id,
                anomalies.service_id,
                services.name AS service_name,
                anomalies.metric_type,
                anomalies.value,
                anomalies.expected_value,
                anomalies.severity,
                anomalies.description,
                anomalies.detected_at
            FROM anomalies
            JOIN services
                ON anomalies.service_id = services.id
            ORDER BY anomalies.detected_at DESC
            LIMIT 10
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching anomalies:', error);

        res.status(500).json({
            message: 'Failed to retrieve anomalies'
        });
    }
};

/*
 * The list endpoint is capped at LIMIT 200, so the dashboard cannot
 * derive a real total from it. This returns the actual count.
 */
const getAnomalyCount = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT count(*) AS count FROM anomalies'
        );

        res.json({
            count: Number(result.rows[0].count)
        });

    } catch (error) {
        console.error('Error counting anomalies:', error);

        res.status(500).json({
            message: 'Failed to count anomalies'
        });
    }
};

module.exports = {
    getAllAnomalies,
    getAnomalyCount
};