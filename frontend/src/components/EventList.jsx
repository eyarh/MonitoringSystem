/*
 * Events arrive as a prop from App, which already polls every
 * 5 seconds. This component used to ignore that prop and run a
 * second identical poll of its own, doubling every /api/events
 * request the dashboard made.
 */

function EventList({ events }) {

    return (

        <section className="section">

            <h2>Recent Events</h2>

            {events.length === 0 ? (

                <p>No events available.</p>

            ) : (

                <div className="events-list">

                    {events.slice(0,10).map(event => (

                        <div
                            className="event-card"
                            key={event.id}
                        >

                            <h3>
                                Service ID:{event.service_id}
                            </h3>

                            <p>
                                Service type: {event.event_type}
                            </p>

                            <p>
                                {event.message}
                            </p>

                            <p>
                                
                            </p>

                            <small>
                                {new Date(
                                    event.created_at
                                ).toLocaleString()}
                            </small>

                        </div>

                    ))}

                </div>
            )}

        </section>
    );
}


export default EventList;