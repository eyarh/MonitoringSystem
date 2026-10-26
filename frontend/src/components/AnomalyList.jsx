/*
 * value / expected_value are NUMERIC, which node-postgres returns as
 * a string, so they render at full precision (77.44541666666667).
 */
function formatNumber(value) {

    if (value === null || value === undefined) {
        return 'N/A';
    }

    return Number(value).toFixed(2);
}


/*
 * How many anomaly cards the dashboard renders at once.
 *
 * This is a display cap only. Nothing is deleted and nothing stops
 * being recorded: every anomaly the detectors find is still written
 * to the anomalies table, and the "Total Anomalies" figure at the
 * top of the page comes from /api/anomalies/count, which counts the
 * whole table rather than this list.
 */
const MAX_VISIBLE = 110;


function AnomalyList({ anomalies, totalCount }) {

    /*const anomalies = anomalies;*/

    // totalCount is the real row count from the database. Fall back to
    // the length of the list if the count request has not landed yet.
    const total =
        typeof totalCount === 'number'
            ? totalCount
            : anomalies.length;

    const hiddenCount = total - anomalies.length;
console.log({anomalies});

    return (

        <section className="section">

            <h2>
                Detected Anomalies
            </h2>


            {anomalies.length === 0 ? (

                <p>
                    No anomalies detected.
                </p>

            ) : (

                <div className="anomalies-list">

                    {anomalies.map(anomaly => (

                        <div
                            className="anomaly-card"
                            key={anomaly.id}
                        >

                            <h3>
                                {anomaly.severity}
                            </h3>

                            <p>
                                {anomaly.description}
                            </p>

                            <p>
                                <strong>
                                    Metric:
                                </strong>

                                {' '}

                                {anomaly.metric_type}
                            </p>

                            <p>
                                <strong>
                                    Value:
                                </strong>

                                {' '}

                                {formatNumber(anomaly.value)}
                            </p>

                            <p>
                                <strong>
                                    Expected:
                                </strong>

                                {' '}

                                {formatNumber(anomaly.expected_value)}
                            </p>

                            {/* same formatting as EventList */}
                            <small>
                                {new Date(
                                    anomaly.detected_at
                                ).toLocaleString()}
                            </small>

                        </div>

                    ))}

                </div>

            )}


            {hiddenCount > 0 && (

                <p className="list-footnote">
                    Showing the {anomalies.length} most recent of {total}{' '}
                    stored. The rest are still in the database.
                </p>

            )}

        </section>
    );
}


export default AnomalyList;