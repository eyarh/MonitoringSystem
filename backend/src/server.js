/*
 * Loaded first: config below reads process.env at module scope,
 * before the route requires that used to pull dotenv in indirectly.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN ||
        'http://localhost:5173'
}));
app.use(express.json());


const servicesRoutes = require('./routes/services.routes');
const metricsRoutes = require('./routes/metrics.routes');
const eventsRoutes = require('./routes/events.routes');
const anomaliesRoutes = require('./routes/anomalies.routes');
const monitoringRoutes=require('./routes/monitoring.routes');

const {
    getSystemMetrics
}= require("./services/systemMetrics.service");

const {
    startMonitoring   
}= require("./services/monitorScheduler")


app.get("/", (req, res) => {

    res.json({
        message:
            "Smart Monitoring Platform API is running"
    });

});

/*
 * Removed: app.get("/api/monitor/orders", ...)
 *
 * Despite the name it ran a full sweep of every service, duplicating
 * GET /api/monitoring/check in monitoring.routes.js. It had no error
 * handling and let any caller trigger unauthenticated database
 * writes. Nothing in the dashboard used it.
 */

app.get(
    "/api/system/metrics",
    (req, res) => {

        const metrics =
            getSystemMetrics();

        res.json(metrics);
    }
);



app.use('/api/services', servicesRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/anomalies', anomaliesRoutes);
app.use('/api/monitoring',monitoringRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startMonitoring();
});