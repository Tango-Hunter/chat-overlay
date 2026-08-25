/**
 * Title: index.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Digital Terminal Chat Overlay Server
 */


import express from "express";
import config from "./configs/config.js";

const app = express();

const { port, host, environment } = config.server;

/*
 * Root endpoint
 *
 * This will eventually serve the chat overlay.
 * For now, it simply confirms that the application is running.
 */
app.get("/", (req, res) => {
    res.status(200).json({
        application: "Digital Terminal Chat Overlay",
        status: "online",
        environment
    });
});

/*
 * Health endpoint
 *
 * This will be useful for monitoring the application and
 * eventually for Railway health checks.
 */
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy"
    });
});

/*
 * Start the server
 */
app.listen(port, host, () => {
    console.log("");
    console.log("========================================");
    console.log(" Digital Terminal Chat Overlay");
    console.log("========================================");
    console.log(` Environment : ${environment}`);
    console.log(` Server      : http://${host}:${port}`);
    console.log(` Health      : http://${host}:${port}/health`);
    console.log("========================================");
    console.log("");
});
