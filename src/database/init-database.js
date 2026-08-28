/*
 * ============================================================================
 * Title: init-database.js
 * Author: Tango Hunter
 * Date Created: 8/27/26
 * Description: Creates and initializes Chat Overlay database tables.
 * ============================================================================
 */

import config from "../configs/config.js";

const { database } = config;

/*
 * ============================================================================
 * REGISTERED USERS
 * ============================================================================
 */

async function createRegisteredUsersTable() {

    const query = `
        CREATE TABLE IF NOT EXISTS chat_overlay_registered_users (
            id BIGSERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            twitch_user_id TEXT NOT NULL UNIQUE,
            twitch_display_name TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    await database.query(query);

    console.log(
        "✓ chat_overlay_registered_users table ready."
    );
}


/*
 * ============================================================================
 * OVERLAY SETTINGS
 * ============================================================================
 */

async function createOverlaySettingsTable() {

    const query = `
        CREATE TABLE IF NOT EXISTS chat_overlay_settings (
            id BIGSERIAL PRIMARY KEY,
            twitch_user_id TEXT NOT NULL,
            setting_name VARCHAR(100) NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            setting_value TEXT NOT NULL,
            setting_default TEXT NOT NULL,
            form_type VARCHAR(30) NOT NULL,
            form_options TEXT,
            css_class VARCHAR(100),
            category VARCHAR(50) NOT NULL,
            description TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT chat_overlay_settings_user_fk
                FOREIGN KEY (twitch_user_id)
                REFERENCES chat_overlay_registered_users(twitch_user_id)
                ON DELETE CASCADE,

            CONSTRAINT chat_overlay_settings_unique_setting
                UNIQUE (twitch_user_id, setting_name)
        );
    `;

    await database.query(query);

    console.log(
        "✓ chat_overlay_settings table ready."
    );
}


/*
 * ============================================================================
 * TWITCH EVENTSUB SUBSCRIPTIONS
 * ============================================================================
 */

async function createEventSubSubscriptionsTable() {

    const query = `
        CREATE TABLE IF NOT EXISTS
        chat_overlay_twitch_eventsub_subscriptions (
            id BIGSERIAL PRIMARY KEY,
            twitch_user_id TEXT NOT NULL,
            subscription_id TEXT NOT NULL UNIQUE,
            subscription_type TEXT NOT NULL,
            status TEXT NOT NULL,
            oauth_token TEXT NOT NULL,
            oauth_refresh_token TEXT NOT NULL,
            oauth_expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT chat_overlay_eventsub_user_fk
                FOREIGN KEY (twitch_user_id)
                REFERENCES chat_overlay_registered_users(twitch_user_id)
                ON DELETE CASCADE
        );
    `;

    await database.query(query);

    console.log(
        "✓ chat_overlay_twitch_eventsub_subscriptions table ready."
    );
}


/*
 * ============================================================================
 * OPERATOR SESSIONS
 * ============================================================================
 */

async function createOperatorSessionsTable() {

    const query = `
        CREATE TABLE IF NOT EXISTS chat_overlay_operator_sessions (
            sid TEXT PRIMARY KEY,
            sess JSON NOT NULL,
            expire TIMESTAMP(6) NOT NULL
        );
    `;

    await database.query(query);

    console.log(
        "✓ chat_overlay_operator_sessions table ready."
    );
}


/*
 * ============================================================================
 * OPERATOR SESSION INDEX
 * ============================================================================
 */

async function createOperatorSessionsIndex() {

    const query = `
        CREATE INDEX IF NOT EXISTS
        chat_overlay_operator_sessions_expire_idx
        ON chat_overlay_operator_sessions (expire);
    `;

    await database.query(query);

    console.log(
        "✓ chat_overlay_operator_sessions expiration index ready."
    );
}


/*
 * ============================================================================
 * INITIALIZE DATABASE
 * ============================================================================
 */

export async function initializeDatabase() {

    console.log("Initializing Chat Overlay database...");

    try {

        await createRegisteredUsersTable();
        await createOverlaySettingsTable();
        await createEventSubSubscriptionsTable();
        await createOperatorSessionsTable();
        await createOperatorSessionsIndex();

        console.log(
            "Chat Overlay database initialization complete."
        );

    } catch (error) {

        console.error(
            "Failed to initialize Chat Overlay database."
        );

        throw error;
    }
}
