/*
 * Single source of truth: serviceMonitor.service.js imports this
 * so the HIGH_RESPONSE_TIME event and the HIGH_RESPONSE_TIME
 * anomaly can never disagree about what "slow" means again.
 */
const SLOW_RESPONSE_THRESHOLD = 1000;


function detectRuleBasedAnomaly(result) {

    // Service unavailable
    if (result.status === "DOWN") {

        return {
            isAnomaly: true,
            type: "SERVICE_DOWN",
            severity: "CRITICAL",
            message: `${result.serviceName} is unavailable`
        };
    }

    // HTTP error
    if (
        result.statusCode &&
        result.statusCode >= 500
    ) {

        return {
            isAnomaly: true,
            type: "HTTP_ERROR",
            severity: "HIGH",
            message:
                `${result.serviceName} returned HTTP ${result.statusCode}`
        };
    }

    // High response time
    if (result.responseTime > SLOW_RESPONSE_THRESHOLD) {

        return {
            isAnomaly: true,
            type: "HIGH_RESPONSE_TIME",
            severity: "WARNING",
            message:
                `${result.serviceName} response time is ${result.responseTime} ms`
        };
    }

    return {
        isAnomaly: false,
        type: null,
        severity: null,
        message: null
    };
}

module.exports = {
    detectRuleBasedAnomaly,
    SLOW_RESPONSE_THRESHOLD
};