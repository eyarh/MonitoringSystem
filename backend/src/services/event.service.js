//event service
const pool = require("../config/database");

async function createEvent(
    serviceId,
    eventType,
    message
) {
    const result = await pool.query(
        `
        INSERT INTO events
        (service_id, event_type, message)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
            serviceId,
            eventType,
            message
        ]
    );

    return result.rows[0];
}

module.exports = {
    createEvent
};