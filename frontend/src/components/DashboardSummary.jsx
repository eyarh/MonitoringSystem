function DashboardSummary({ services, anomalyCount }) {

    const totalServices = services.length;

    const servicesUp = services.filter(
        service => service.status === 'UP'
    ).length;

    const servicesDown = services.filter(
        service => service.status === 'DOWN'
    ).length;

    /*
     * Comes from /api/anomalies/count. Using the list length here
     * would report 200 forever, because /api/anomalies is capped.
     */
    const totalAnomalies = anomalyCount;


    return (

        <section className="summary">

            <div className="summary-card">

                <h3>
                    Total Services
                </h3>

                <p className="summary-number">
                    {totalServices}
                </p>

            </div>


            <div className="summary-card">

                <h3>
                    Services UP
                </h3>

                <p className="summary-number">
                    {servicesUp}
                </p>

            </div>


            <div className="summary-card">

                <h3>
                    Services DOWN
                </h3>

                <p className="summary-number">
                    {servicesDown}
                </p>

            </div>


            <div className="summary-card">

                <h3>
                    Anomalies
                </h3>

                <p className="summary-number">
                    {totalAnomalies}
                </p>

            </div>

        </section>
    );
}


export default DashboardSummary;