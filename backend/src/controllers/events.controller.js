const pool = require('../config/database');

const getAllEvents = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                events.id,
                events.service_id,
                services.name AS service_name,
                events.event_type,
                events.message,
                events.created_at
            FROM events
            JOIN services
                ON events.service_id = services.id
            ORDER BY events.created_at DESC
            LIMIT 200
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching events:', error);

        res.status(500).json({
            message: 'Failed to retrieve events'
        });
    }
};

module.exports = {
    getAllEvents
};