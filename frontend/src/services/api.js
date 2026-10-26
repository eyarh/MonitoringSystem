const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000';


export const getServices = async () => {

    const response = await fetch(
        `${API_URL}/api/services`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch services');
    }

    return response.json();
};

export const getEvents = async () => {

    const response = await fetch(
        `${API_URL}/api/events`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch events');
    }

    return response.json();
};

export async function getMetrics() {

    const response =
        await fetch(
            `${API_URL}/api/metrics`
        );

    if (!response.ok) {

        throw new Error(
            "Failed to fetch metrics"
        );
    }

    return response.json();
}

export async function getAnomalies() {
    const response = await fetch(`${API_URL}/api/anomalies`);
    if (!response.ok) throw new Error("Failed to fetch anomalies");
    return response.json();
}
export async function getAnomalyCount() {
    const response = await fetch(`${API_URL}/api/anomalies/count`);
    if (!response.ok) throw new Error("Failed to fetch anomaly count");
    return response.json();
}
export const getSystemMetrics = async () => {

    const response = await fetch(
        `${API_URL}/api/system/metrics`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch metrics');
    }

    return response.json();
};