import { useEffect, useState } from 'react';

import './App.css';

import ServiceList from './components/ServiceList';
import AnomalyList from './components/AnomalyList';
import DashboardSummary from './components/DashboardSummary';
import EventList from './components/EventList';
import MetricList from './components/MetricList';
import MetricChart from './components/MetricChart';

import {
    getServices,
    getMetrics,
    getSystemMetrics,
    getAnomalies,
    getAnomalyCount,
    getEvents
} from './services/api';


/*
 * os.uptime() is a float in seconds (e.g. 4151683.156), which is
 * unreadable on a dashboard.
 */
function formatUptime(totalSeconds) {

    const seconds = Math.floor(totalSeconds);

    const days = Math.floor(seconds / 86400);

    const hours = Math.floor((seconds % 86400) / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
}


function App() {

    const [services, setServices] = useState([]);

    const [metrics, setMetrics] = useState([]);

    const [events, setEvents] = useState([]);

    const [systemMetrics, setSystemMetrics] = useState(null);

    const [anomalies, setAnomalies] = useState([]);

    const [anomalyCount, setAnomalyCount] = useState(0);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);


    async function loadData() {

        try {

            /*
             * SERVICES
             */

            const servicesData = await getServices();

            setServices(servicesData);


            /*
             * METRICS
             */

            const metricsData = await getMetrics();

            setMetrics(metricsData);


            /*
             * SYSTEM METRICS
             */

            const systemData = await getSystemMetrics();

            setSystemMetrics(systemData);


            /*
             * ANOMALIES
             */

            const anomaliesData = await getAnomalies();

            setAnomalies(anomaliesData);


            /*
             * Total count, not the LIMIT-200 list length.
             */

            const anomalyCountData = await getAnomalyCount();

            setAnomalyCount(anomalyCountData.count);


            /*
             * EVENTS
             */

            const eventsData = await getEvents();

            setEvents(eventsData);


            /*
             * Everything loaded successfully
             */

            setError(null);

        } catch (err) {

            console.error(
                "Failed to load dashboard data:",
                err
            );

            setError(
                "Unable to connect to the monitoring backend."
            );

        } finally {

            /*
             * Stop loading screen
             */

            setLoading(false);
        }
    }


    /*
     * Load data when the page opens
     * and every 5 seconds afterwards.
     */

    useEffect(() => {

        let cancelled = false;

        let timer;

        /*
         * Self-rescheduling, mirroring the backend's monitoring loop:
         * wait 5 seconds AFTER a round finishes rather than on a fixed
         * clock, so a slow backend cannot stack overlapping rounds of
         * six requests each.
         *
         * The first round is scheduled rather than called directly.
         * Calling it in the effect body sets state synchronously
         * during the effect, which react-hooks/set-state-in-effect
         * reports as an error and which triggers a cascading render.
         */
        const loop = async () => {

            await loadData();

            if (!cancelled) {

                timer = setTimeout(loop, 5000);
            }
        };

        timer = setTimeout(loop, 0);

        return () => {

            cancelled = true;

            clearTimeout(timer);

        };

    }, []);


    /*
     * Loading screen
     */

    if (loading) {

        return (

            <div className="app">

                <h1>
                    Smart Monitoring Platform
                </h1>

                <p>
                    Loading...
                </p>

            </div>

        );
    }


    return (

        <div className="app">

            <h1>
                Smart Monitoring Platform
            </h1>


            {/* Backend connection error */}

            {error && (

                <p className="error">
                    {error}
                </p>

            )}


            {/* Dashboard Summary */}

            <DashboardSummary
                services={services}
                anomalyCount={anomalyCount}
            />


            {/* Services */}

            <ServiceList
                services={services}
            />


            {/* Metrics Chart */}

            <MetricChart
                metrics={metrics}
            />


            {/* Metrics List */}

            <MetricList
                metrics={metrics}
            />


            {/* Events */}

            <EventList
                events={events}
            />


            {/* Anomalies */}

            <AnomalyList
                anomalies={anomalies}
                totalCount={anomalyCount}
            />


            {/* System Metrics */}

            {systemMetrics && (

                <div className="system-metrics">

                    <h2>
                        System Metrics
                    </h2>

                    <p>

                        <strong>
                            CPU Usage:
                        </strong>

                        {' '}

                        {systemMetrics.cpuUsage}%

                    </p>


                    <p>

                        <strong>
                            Memory Usage:
                        </strong>

                        {' '}

                        {systemMetrics.memoryUsage}%

                    </p>


                    <p>

                        <strong>
                            Total Memory:
                        </strong>

                        {' '}

                        {(
                            systemMetrics.totalMemory /
                            1024 /
                            1024 /
                            1024
                        ).toFixed(2)}

                        {' '}

                        GB

                    </p>


                    <p>

                        <strong>
                            Free Memory:
                        </strong>

                        {' '}

                        {(
                            systemMetrics.freeMemory /
                            1024 /
                            1024 /
                            1024
                        ).toFixed(2)}

                        {' '}

                        GB

                    </p>


                    <p>

                        <strong>
                            Uptime:
                        </strong>

                        {' '}

                        {formatUptime(systemMetrics.uptime)}

                    </p>

                </div>

            )}

        </div>

    );
}


export default App;