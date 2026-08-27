/**
 * Title: index.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Digital Terminal Chat Overlay Server
 */
/**
 * To open the Settings Editor Locally after `npm start`:
 * http://localhost:3000/overlay-settings.html
 */


import express from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import config from "./configs/config.js";
import { initializeOverlaySettings } from "./database/overlay-settings.js";
import { initializeOperatorSession } from "./database/operator-session.js";
import overlaySettingsRoutes from "./routes/overlay-settings.js";
import authenticationRoutes from "./routes/authentication.js";
import {
    requireAuthentication,
    requirePageAuthentication
} from "./auth/require-authentication.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const PostgreSQLStore = pgSession(session);

const sessionStore =
    new PostgreSQLStore({
        pool: config.database,
        tableName: "operator_sessions",
        createTableIfMissing: false
    });

const { port, host, environment } = config.server;

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );

if (
    environment === "production"
) {
    app.set(
        "trust proxy",
        1
    );
}


/*
==============================================================================
    MIDDLEWARE
==============================================================================
*/
app.use(
    express.json()
);

app.use(
    session({
        store: sessionStore,
        secret: config.auth.sessionSecret,
        name: config.auth.sessionCookieName,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: environment === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 30 * 60 * 1000
        }
    })
);


/*==============================================================================
    PROTECTED PAGES
==============================================================================*/

app.get(
    "/overlay-settings.html",
    requirePageAuthentication,
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "public",
                "overlay-settings.html"
            )
        );
    }
);


/*==============================================================================
    PUBLIC STATIC FILES
==============================================================================*/

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/*
 * ==============================================================================
 *     AUTHENTICATION ROUTES
 * ==============================================================================
 */

app.use(
    "/api/auth",
    authenticationRoutes
);


/*
 * ==============================================================================
 *     OVERLAY SETTINGS ROUTES
 * ==============================================================================
 */

app.use(
    "/api/overlay-settings",
    requireAuthentication,
    overlaySettingsRoutes
);

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
         * Initialize the operator session database.
         *
         * This will:
         * 1. Create the operator_sessions table if it doesn't exist.
         * 2. Create the expiration index if it doesn't exist.
         */
        await initializeOperatorSession();

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
        console.error("The application database could not be initialized.");
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
