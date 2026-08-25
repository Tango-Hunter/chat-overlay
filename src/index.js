/**
 * Title: index.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Digital Terminal Chat Overlay Server
 */


import express from "express";
import config from "./configs/config.js";
import { initializeOverlaySettings } from "./database/overlay-settings.js";

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
 * Start the application
 *
 * Database initialization must complete successfully before
 * Express begins accepting requests.
 */
async function startServer() {
    try {
        /*
         * Initialize the overlay settings database.
         *
         * This will:
         * 1. Create the overlay_settings table if it doesn't exist.
         * 2. Insert any missing default settings.
         * 3. Leave existing settings untouched.
         */
        await initializeOverlaySettings();

        /*
         * Start the Express server after the database
         * has successfully initialized.
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
    } catch (error) {
        /*
         * If the database cannot be initialized, do not
         * start the application.
         */
        console.error("");
        console.error("========================================");
        console.error(" APPLICATION STARTUP FAILED");
        console.error("========================================");
        console.error("The overlay settings database could not be initialized.");
        console.error("");
        console.error(error);
        console.error("");

        process.exit(1);
    }
}

/*
 * Begin application startup.
 */
startServer();
