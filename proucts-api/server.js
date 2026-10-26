const express = require("express");

const app = express();

const PORT = process.env.PORT || 3002;

app.use(express.json());


// Current simulated state of the service: normal | slow | error
let mode = "normal";


/**
 * Health check polled by the monitoring backend.
 */
app.get("/health", async (req, res) => {

    const start = Date.now();


    // Simulated latency
    if (mode === "slow") {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }


    const responseTime = Date.now() - start;


    // Simulated failure
    if (mode === "error") {

        return res.status(500).json({

            service: "products-api",

            status: "DOWN",

            error: "Product database unavailable",

            responseTime

        });

    }


    res.json({

        service: "products-api",

        status: "UP",

        responseTime,

        timestamp: new Date()

    });

});


/**
 * Return to normal operation.
 */
app.post("/simulate/normal", (req, res) => {

    mode = "normal";

    res.json({

        message: "Products API normal mode"

    });

});


/**
 * Simulate a slow service.
 */
app.post("/simulate/slow", (req, res) => {

    mode = "slow";

    res.json({

        message: "Products API slow mode activated"

    });

});


/**
 * Simulate a failing service.
 */
app.post("/simulate/error", (req, res) => {

    mode = "error";

    res.json({

        message: "Products API error mode activated"

    });

});


/**
 * Report the current simulated state.
 */
app.get("/status", (req, res) => {

    res.json({

        service: "products-api",

        mode

    });

});


app.listen(PORT, () => {

    console.log(
        `Products API running on port ${PORT}`
    );

});
