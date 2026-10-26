function ServiceList({ services }) {

    return (
        <div className="service-list">

            <h2>Services</h2>

            {services.length === 0 ? (

                <p>No services found.</p>

            ) : (

                services.slice(0,10).map(service => (

                    <div
                        className="service-card"
                        key={service.id}
                    >

                        <div>

                            <h3>
                                {service.name}
                            </h3>

                            <p>
                                {service.type}
                            </p>

                        </div>

                        <div>

                            <span
                                className={
                                    service.status === "UP"
                                        ? "status-up"
                                        : "status-down"
                                }
                            >
                                {service.status || "UNKNOWN"}
                            </span>

                        </div>

                    </div>

                ))

            )}

        </div>
    );
}

export default ServiceList;