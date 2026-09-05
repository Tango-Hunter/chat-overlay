/**
 * Title: index.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Digital Terminal Chat Overlay Server
 */
/**
 * To open the Settings Editor Locally after `npm start`:
 * http://localhost:3000/overlay-settings
 */


import express from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";

import config from "./configs/config.js";
import { initializeDatabase } from "./database/init-database.js";
import overlaySettingsRoutes from "./routes/overlay-settings.js";
import authenticationRoutes from "./routes/authentication.js";
import registrationRoutes from "./routes/registration.js";
import twitchRoutes from "./routes/twitch.js";
import { validateEnabledTwitchTokens } from "./twitch/twitch-auth.js";
import { connectEventSubWebSocket } from "./twitch/eventsub-websocket-manager.js";
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
        tableName: "chat_overlay_operator_sessions",
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
            sameSite: "lax",
            path: "/",
            maxAge: 8 * 60 * 60 * 1000
        }
    })
);


/*==============================================================================
    PROTECTED PAGES
==============================================================================*/

app.get(
    "/overlay-settings",
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


app.get(
    "/debug/routes",
    (req, res) => {
        res.status(200).json({
            createLink: true,
            registration: true,
            twitch: true,
            timestamp: new Date().toISOString()
        });
    }
);


/*==============================================================================
    CREATE REGISTRATION LINK PAGE
==============================================================================*/

app.get(
    "/create-link",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "public",
                "create-link.html"
            )
        );
    }
);


/*==============================================================================
    REGISTRATION PAGE
==============================================================================*/

app.get(
    "/registration",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "public",
                "registration.html"
            )
        );
    }
);

/*==============================================================================
    AUTHENTICATION PAGE
==============================================================================*/

app.get(
    "/authentication",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "public",
                "authentication.html"
            )
        );
    }
);

/*==============================================================================
    STATUS PAGE
==============================================================================*/

app.get(
    "/status",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "public",
                "status.html"
            )
        );
    }
);


/*
 * ==============================================================================
 *     AUTHENTICATION/REGISTRATION ROUTES
 * ==============================================================================
 */

app.use(
    "/api/auth",
    authenticationRoutes
);

app.use(
    "/api/registration",
    registrationRoutes
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
 * ==============================================================================
 *     TWITCH ROUTES
 * ==============================================================================
 */
app.use(
    "/api/twitch",
    twitchRoutes
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
         * Initialize tables in the database.
         */
        await initializeDatabase();

        /*
         * Validate enabled Twitch authorizations during startup
         * when explicitly enabled in configuration.
         *
         * getValidAccessToken() only refreshes a token when Twitch
         * rejects the existing access token.
         */

        if (
            config.app.refreshOnStartup
        ) {
            console.log(
                "Validating enabled Twitch authorizations..."
            );
            await validateEnabledTwitchTokens();
            console.log(
                "Twitch authorization validation complete."
            );
        }

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

            connectEventSubWebSocket()
                .then(
                    () => {
                        console.log(
                            "[EventSub WebSocket] Startup connection successful."
                        );
                    }
                )
                .catch(
                    error => {
                        console.error(
                            "[EventSub WebSocket] Initial startup connection failed.",
                            error
                        );
                    }
                );
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
