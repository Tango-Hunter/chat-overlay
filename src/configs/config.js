/**
 * Title: config.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Processes and exports environmental variables for all server files.
 */

import dotenv from "dotenv";
import { Pool } from "pg";

/*
 * Load environment variables from .env
 */
dotenv.config();

/*
 * Server configuration
 */
const server = {
    environment: process.env.NODE_ENV || "development",

    /*
     * Railway provides PORT automatically in production.
     * Local development will use 3000 unless another port
     * is specified in .env.
     */
    port: Number(process.env.PORT) || 3000,

    /*
     * 0.0.0.0 allows the application to accept connections
     * from the network interface as well as localhost.
     * This is important for Railway deployment.
     */
    host: process.env.HOST || "0.0.0.0",
};

/*
 * PostgreSQL connection pool
 * SSL is enabled because the production database will be
 * hosted remotely.
 */
const database = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,

    ssl: {
        rejectUnauthorized: false
    }
});

/*
 * Authentication configuration
 */

const auth = {
    username: process.env.USER_LOGIN,
    passwordHash: process.env.USER_PASSWORD_HASH,
    sessionSecret: process.env.SESSION_SECRET,
    sessionCookieName:
        server.environment === "production"
            ? "__Host-OperatorSession"
            : "OperatorSession"
};

/*
 * Export all application configuration through one object.
 */
const config = Object.freeze({
    server,
    database,
    auth
});

export default config;
