import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';


/*
 * One colour per service, by position. Two lines drawn in the
 * default colour would be indistinguishable.
 */
const LINE_COLORS = [
    '#2563eb',
    '#dc2626',
    '#16a34a',
    '#ca8a04'
];


function MetricChart({ metrics }) {

    /*
      * metrics arrive newest-first; take the most recent window
      * and flip it so the chart reads left-to-right in time.
      */
    const recent = metrics
        .slice(0, 10)
        .reverse();


    /*
     * The API interleaves services (service 2, service 1, service 2...).
     * Plotting them as one series produced a line that alternated
     * between two different services' values - invisible while both
     * were fast, a sawtooth the moment one degraded.
     *
     * Group by timestamp into one row per sweep, with a column per
     * service, so each service gets its own line.
     */
    const serviceNames = [
        ...new Set(
            recent.map(metric => metric.service_name)
        )
    ];

    const rowsByTime = new Map();

    recent.forEach(metric => {

        const time = new Date(
            metric.recorded_at
        ).toLocaleTimeString();

        if (!rowsByTime.has(time)) {
            rowsByTime.set(time, { time });
        }

        rowsByTime.get(time)[metric.service_name] =
            Number(metric.response_time);
    });

    const data = [...rowsByTime.values()];


    return (

        <section className="section">

            <h2>
                Response Time
            </h2>

            <div className="chart-container">

                <ResponsiveContainer
                    width="100%"
                    height={350}
                >

                    <LineChart data={data}>

                        <CartesianGrid
                            strokeDasharray="3 3"
                        />

                        <XAxis
                            dataKey="time"
                        />

                        <YAxis />

                        <Tooltip />

                        <Legend />

                        {serviceNames.map((name, index) => (

                            <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                name={name}
                                stroke={
                                    LINE_COLORS[
                                        index % LINE_COLORS.length
                                    ]
                                }
                                connectNulls
                            />

                        ))}

                    </LineChart>

                </ResponsiveContainer>

            </div>

        </section>
    );
}


export default MetricChart;