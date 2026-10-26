const pool = require("../config/database");

const {
    createEvent
} = require("./event.service");

const {
    detectRuleBasedAnomaly,
    SLOW_RESPONSE_THRESHOLD
} = require("./anomaly.service");

const {
    saveAnomaly
} = require("./anomalyPersistence.service");


const {
    getSystemMetrics
} = require("./systemMetrics.service");

const REQUEST_TIMEOUT = 4000;

/*
 * Remembers the last emitted condition per service so that a
 * persistent fault produces one event, not one event per poll.
 * In-memory by design: resets on restart, which re-announces
 * any still-active fault exactly once.
 */
const lastCondition = new Map();


async function checkService(service) {

    const start = Date.now();

    try {

        const response = await fetch(
            service.url,
            {
                signal: AbortSignal.timeout(
                    REQUEST_TIMEOUT
                )
            }
        );

        const responseTime =
            Date.now() - start;

        const status =
            response.ok ? "UP" : "DOWN";


        /*
         * Update service status atomically.
         *
         * The WHERE clause makes the transition itself the lock:
         * concurrent checks re-evaluate it after the first commits,
         * so exactly one observes the change and rowCount is 1 only
         * for the writer that actually caused it.
         */

        const statusUpdate = await pool.query(
            `
            WITH previous AS (
                SELECT status
                FROM services
                WHERE id = $2
            )
            UPDATE services
            SET status = $1
            WHERE id = $2
              AND status IS DISTINCT FROM $1
            RETURNING (
                SELECT status FROM previous
            ) AS previous_status
            `,
            [
                status,
                service.id
            ]
        );


        const statusChanged =
            statusUpdate.rowCount === 1;


        const previousStatus =
            statusChanged
                ? statusUpdate.rows[0].previous_status
                : status;


        /*
         * Save metric
         */

        const system = getSystemMetrics();

        await pool.query(
            `
            INSERT INTO metrics
            (
                service_id,
                response_time,
                status_code,
                cpu_usage,
                memory_usage
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                service.id,
                responseTime,
                response.status,
                system.cpuUsage,
                system.memoryUsage
            ]
        );


        /*
         * Service DOWN event
         */

        if (
            previousStatus === "UP" &&
            status === "DOWN"
        ) {

            await createEvent(
                service.id,
                "SERVICE_DOWN",
                `${service.name} is unavailable`
            );
        }

        /*
         * Service recovered
         */

        if (
            previousStatus === "DOWN" &&
            status === "UP"
        ) {

            await createEvent(
                service.id,
                "SERVICE_RECOVERED",
                `${service.name} is back online`
            );
        }


        /*
         * HTTP error
         */

        const condition =
            lastCondition.get(service.id) || {};

        const httpError = !response.ok;

        if (httpError && !condition.httpError) {

            await createEvent(
                service.id,
                "HTTP_ERROR",
                `${service.name} returned HTTP ${response.status}`
            );
        }


        /*
         * Slow response
         */

        const slow =
            responseTime > SLOW_RESPONSE_THRESHOLD;

        if (slow && !condition.slow) {

            await createEvent(
                service.id,
                "HIGH_RESPONSE_TIME",
                `${service.name} response time is ${responseTime} ms`
            );
        }


        const result = {

            serviceId: service.id,

            serviceName: service.name,

            status,

            statusCode:
                response.status,

            responseTime,

            error: null

        };


        /*
         * Rule based anomaly detection
         */

        const anomaly =
            detectRuleBasedAnomaly(result);


        const anomalyIsNew =
            anomaly.isAnomaly &&
            anomaly.type !== condition.anomalyType;

        if (anomalyIsNew) {

            await saveAnomaly(
                service.id,
                anomaly.type,
                anomaly.type === "HIGH_RESPONSE_TIME"
                    ? responseTime
                    : response.status,
                anomaly.type === "HIGH_RESPONSE_TIME"
                    ? SLOW_RESPONSE_THRESHOLD
                    : null,
                anomaly.severity,
                anomaly.message
            );
        }


        lastCondition.set(
            service.id,
            {
                httpError,
                slow,
                anomalyType: anomaly.isAnomaly
                    ? anomaly.type
                    : null
            }
        );


        return result;


    } catch (error) {

        const responseTime =
            Date.now() - start;


        /*
         * Service DOWN.
         *
         * Same conditional UPDATE as the reachable path: the WHERE
         * clause is the lock, so rowCount is 1 only for the check
         * that actually caused the transition. Writing 'DOWN'
         * unconditionally here made every subsequent poll look like
         * a fresh outage.
         */

        const statusUpdate = await pool.query(
            `
            UPDATE services
            SET status = 'DOWN'
            WHERE id = $1
              AND status IS DISTINCT FROM 'DOWN'
            `,
            [service.id]
        );

        const statusChanged =
            statusUpdate.rowCount === 1;


        /*
         * Save failed metric
         */

        const system = getSystemMetrics();

        await pool.query(
            `
            INSERT INTO metrics
            (
                service_id,
                response_time,
                status_code,
                cpu_usage,
                memory_usage
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                service.id,
                responseTime,
                null,
                system.cpuUsage,
                system.memoryUsage
            ]
        );


        /*
         * Event — only on the transition into DOWN.
         *
         * An unreachable service is polled twelve times a minute.
         * Emitting here unconditionally produced one SERVICE_DOWN
         * event and one SERVICE_DOWN anomaly per poll, roughly 720
         * of each per hour, which is the same flood the reachable
         * path already guards against.
         */

        const condition =
            lastCondition.get(service.id) || {};

        if (statusChanged) {

            await createEvent(
                service.id,
                "SERVICE_DOWN",
                `${service.name} is unreachable: ${error.message}`
            );
        }


        const result = {

            serviceId: service.id,

            serviceName: service.name,

            status: "DOWN",

            statusCode: null,

            responseTime,

            error: error.message

        };


        /*
         * Save anomaly — keyed on the remembered condition rather
         * than the status transition, so a restart re-announces a
         * still-active outage exactly once.
         */

        if (condition.anomalyType !== "SERVICE_DOWN") {

            await saveAnomaly(
                service.id,
                "SERVICE_DOWN",
                0,
                null,
                "CRITICAL",
                `${service.name} is unreachable`
            );
        }


        lastCondition.set(
            service.id,
            {
                httpError: false,
                slow: false,
                anomalyType: "SERVICE_DOWN"
            }
        );


        return result;
    }
}


async function checkAllServices() {

    const result =
        await pool.query(
            `
            SELECT *
            FROM services
            ORDER BY id
            `
        );


    const results = [];


    for (
        const service of result.rows
    ) {

        try {

            const monitoringResult =
                await checkService(service);

            results.push(
                monitoringResult
            );

        } catch (error) {

            console.error(
                `[Monitoring] check failed for ${service.name}:`,
                error.message
            );
        }
    }


    return results;
}


module.exports = {

    checkService,

    checkAllServices

};