const {
    checkAllServices
} = require("./serviceMonitor.service");

const {
    runAIAnalysis
} = require("./aiMonitor.service");

const MONITORING_INTERVAL = 5000;

const AI_INTERVAL = 60000;

async function runMonitoring() {

    try {

        const results =
            await checkAllServices();

        console.log(
            `[Monitoring] Checked ${results.length} services`
        );

        results.forEach(result => {

            console.log(
                `[Monitoring] ${result.serviceName}: ` +
                `${result.status} - ` +
                `${result.responseTime} ms`
            );

        });

    } catch (error) {

        console.error(
            "[Monitoring] Error:",
            error.message
        );
    }
}

async function runAI() {

    try {

        const result = await runAIAnalysis();

        if (result) {

            console.log(
                "[AI] Analysis completed:",
                result
            );

        } else {

            console.log(
                "[AI] Analysis unavailable."
            );
        }

    } catch (error) {

        console.error(
            "[AI] Error:",
            error.message
        );
    }
}

function startMonitoring() {

    console.log(
        "Automatic monitoring started"
    );

    /*
     * Self-rescheduling loop.
     *
     * Runs the task immediately, then waits `interval` AFTER the
     * task settles before running it again.
     *
     * setInterval fires on a fixed clock and does not wait for the
     * previous pass, so a sweep slower than the interval overlapped
     * itself. The immediate first run must be part of the same loop
     * for the same reason: kicking it off separately races the
     * loop's first scheduled pass.
     */
    const loop = async (task, interval) => {

        await task();

        setTimeout(
            () => loop(task, interval),
            interval
        );
    };

    loop(runMonitoring, MONITORING_INTERVAL);

    loop(runAI, AI_INTERVAL);
}

module.exports = {
    startMonitoring
};