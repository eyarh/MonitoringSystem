const pool = require('../config/database');

const getAllMetrics = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                metrics.id,
                metrics.service_id,
                services.name AS service_name,
                metrics.response_time,
                metrics.status_code,
                /*
                 * node-postgres returns NUMERIC as a string to avoid
                 * float precision loss, so these arrived as "7.9".
                 * Cast here rather than reconfiguring the global pg
                 * type parser, which would affect every NUMERIC in
                 * the app.
                 */
                metrics.cpu_usage::float8 AS cpu_usage,
                metrics.memory_usage::float8 AS memory_usage,
                metrics.recorded_at
            FROM metrics
            JOIN services
                ON metrics.service_id = services.id
            ORDER BY metrics.recorded_at DESC
            LIMIT 200
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching metrics:', error);

        res.status(500).json({
            message: 'Failed to retrieve metrics'
        });
    }
};

module.exports = {
    getAllMetrics
};