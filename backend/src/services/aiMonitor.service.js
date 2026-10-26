const axios = require("axios");

const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL ||
    "http://127.0.0.1:5001";


async function runAIAnalysis() {

    try {

        console.log(
            "Running AI anomaly detection..."
        );

        const response = await axios.post(
            `${AI_SERVICE_URL}/analyze`,
            {
                /*
                 * Must not exceed the AI_INTERVAL (60s) in
                 * monitorScheduler.js. A 10-minute window on a
                 * 60-second tick re-analyzed ~90% of the same rows
                 * every time and re-inserted an anomaly for each.
                 */
                since_minutes: 1
            },
            {
                timeout: 30000
            }
        );

        console.log(
            "AI analysis result:",
            response.data
        );

        return response.data;

    } catch (error) {

        console.error(
            "AI analysis failed:",
            error.response?.data ||
            error.message
        );

        return null;
    }
}


module.exports = {
    runAIAnalysis
};