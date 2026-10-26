function MetricList({ metrics }) {

    return (

        <section className="section">

            <h2>Recent Metrics</h2>

            {metrics.length === 0 ? (

                <p>No metrics available.</p>

            ) : (

                <div className="metrics-list">

                    {metrics.slice(0, 10).map(metric => (

                        <div
                            className="metric-card"
                            key={metric.id}
                        >

                            <p>
                                <strong>
                                    Service ID:
                                </strong>

                                {' '}

                                {metric.service_id}
                            </p>

                            <p>
                                <strong>
                                    Response Time:
                                </strong>

                                {' '}

                                {metric.response_time} ms
                            </p>

                            <p>
                                <strong>
                                    Status Code:
                                </strong>

                                {' '}

                                {metric.status_code ?? 'N/A'}
                            </p>

                            <p>
                                <strong>
                                    Recorded:
                                </strong>

                                {' '}

                                {new Date(
                                    metric.recorded_at
                                ).toLocaleString()}
                            </p>

                        </div>

                    ))}

                </div>
            )}

        </section>
    );
}


export default MetricList;