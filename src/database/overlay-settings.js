/**
 * Title: overlay-settings.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Creates and initializes the overlay settings table.
 */

import config from "../configs/config.js";

/*
 * Reference the PostgreSQL connection pool created
 * in the central configuration file.
 */
const { database } = config;

/*
 * Initial overlay settings.
 *
 * These values represent the default configuration for
 * the Digital Terminal Chat Overlay.
 *
 * IMPORTANT:
 * These values are only inserted when the setting does
 * not already exist in the database.
 *
 * Existing settings are never overwritten during startup.
 */
const DEFAULT_SETTINGS = [
    {
        setting_name: "font_family",
        display_name: "Font Family",
        setting_value: "IBM Plex Mono",
        setting_default: "IBM Plex Mono",
        form_type: "select",
        form_options: JSON.stringify([
            "IBM Plex Mono",
            "Roboto Mono",
            "Source Code Pro",
            "JetBrains Mono"
        ]),
        css_class: "font-select",
        category: "typography",
        description: "Font used throughout the chat overlay.",
        sort_order: 10
    },

    {
        setting_name: "font_size",
        display_name: "Font Size",
        setting_value: "18",
        setting_default: "18",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "typography",
        description: "Font size used for chat messages.",
        sort_order: 20
    },

    {
        setting_name: "username_font_size",
        display_name: "Username Font Size",
        setting_value: "18",
        setting_default: "18",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "typography",
        description: "Font size used for viewer usernames.",
        sort_order: 30
    },

    {
        setting_name: "line_height",
        display_name: "Line Height",
        setting_value: "1.42",
        setting_default: "1.42",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "typography",
        description: "Controls the vertical spacing between lines of chat text.",
        sort_order: 40
    },

    {
        setting_name: "typing_enabled",
        display_name: "Typing Animation",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "typing",
        description: "Enables the typewriter animation for incoming messages.",
        sort_order: 10
    },

    {
        setting_name: "character_delay",
        display_name: "Character Delay",
        setting_value: "35",
        setting_default: "35",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "typing",
        description: "Delay between each character during the typing animation, in milliseconds.",
        sort_order: 20
    },

    {
        setting_name: "cursor_blink_speed",
        display_name: "Cursor Blink Speed",
        setting_value: "650",
        setting_default: "650",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "typing",
        description: "Controls how quickly the terminal cursor blinks, in milliseconds.",
        sort_order: 30
    },

    {
        setting_name: "show_cursor",
        display_name: "Show Cursor",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "typing",
        description: "Displays the terminal cursor while a message is being typed.",
        sort_order: 40
    },

    {
        setting_name: "maximum_visible",
        display_name: "Maximum Visible Messages",
        setting_value: "9",
        setting_default: "9",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "messages",
        description: "Maximum number of messages displayed at once. Set to 0 to allow messages to fill the available terminal space.",
        sort_order: 10
    },

    {
        setting_name: "message_spacing",
        display_name: "Message Spacing",
        setting_value: "18",
        setting_default: "18",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "messages",
        description: "Controls the spacing between individual chat messages.",
        sort_order: 20
    },

    {
        setting_name: "show_avatar",
        display_name: "Show Avatar",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "messages",
        description: "Displays the viewer's avatar beside their username.",
        sort_order: 30
    },

    {
        setting_name: "avatar_size",
        display_name: "Avatar Size",
        setting_value: "28",
        setting_default: "28",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "messages",
        description: "Size of viewer avatars in pixels.",
        sort_order: 40
    },

    {
        setting_name: "show_username",
        display_name: "Show Username",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "messages",
        description: "Displays the viewer's username above their message.",
        sort_order: 50
    },

    {
        setting_name: "scanlines_enabled",
        display_name: "Scanline Effect",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "effects",
        description: "Periodically sends visible scanlines down the terminal.",
        sort_order: 10
    },

    {
        setting_name: "scanlines_frequency",
        display_name: "Scanline Frequency",
        setting_value: "5",
        setting_default: "5",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "effects",
        description: "How often the scanline effect occurs, in minutes.",
        sort_order: 20
    },

    {
        setting_name: "scanlines_strength",
        display_name: "Scanline Strength",
        setting_value: "medium",
        setting_default: "medium",
        form_type: "select",
        form_options: JSON.stringify([
            "low",
            "medium",
            "high"
        ]),
        css_class: "strength-select",
        category: "effects",
        description: "Controls the number and visibility of scanlines.",
        sort_order: 30
    },

    {
        setting_name: "reboot_enabled",
        display_name: "CRT Reboot Effect",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "effects",
        description: "Periodically performs a CRT-style screen reboot effect.",
        sort_order: 40
    },

    {
        setting_name: "reboot_frequency",
        display_name: "CRT Reboot Frequency",
        setting_value: "10",
        setting_default: "10",
        form_type: "number",
        form_options: null,
        css_class: "number-input",
        category: "effects",
        description: "How often the CRT reboot effect occurs, in minutes.",
        sort_order: 50
    },

    {
        setting_name: "reboot_strength",
        display_name: "CRT Reboot Strength",
        setting_value: "medium",
        setting_default: "medium",
        form_type: "select",
        form_options: JSON.stringify([
            "low",
            "medium",
            "high"
        ]),
        css_class: "strength-select",
        category: "effects",
        description: "Controls the intensity and duration of the CRT reboot effect.",
        sort_order: 60
    }
];

/*
 * Create the overlay settings table.
 *
 * The table is only created if it does not already exist.
 */
async function createOverlaySettingsTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS overlay_settings (
            id SERIAL PRIMARY KEY,

            setting_name VARCHAR(100) NOT NULL UNIQUE,

            display_name VARCHAR(100) NOT NULL,

            setting_value TEXT NOT NULL,

            setting_default TEXT NOT NULL,

            form_type VARCHAR(30) NOT NULL,

            form_options TEXT,

            css_class VARCHAR(100),

            category VARCHAR(50) NOT NULL,

            description TEXT,

            sort_order INTEGER NOT NULL DEFAULT 0,

            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    await database.query(query);
}

/*
 * Insert the default settings.
 *
 * ON CONFLICT DO NOTHING ensures that existing settings
 * are never overwritten when the application starts.
 */
async function createDefaultSettings() {
    const query = `
        INSERT INTO overlay_settings (
            setting_name,
            display_name,
            setting_value,
            setting_default,
            form_type,
            form_options,
            css_class,
            category,
            description,
            sort_order
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
        )
        ON CONFLICT (setting_name) DO NOTHING;
    `;

    for (const setting of DEFAULT_SETTINGS) {
        await database.query(query, [
            setting.setting_name,
            setting.display_name,
            setting.setting_value,
            setting.setting_default,
            setting.form_type,
            setting.form_options,
            setting.css_class,
            setting.category,
            setting.description,
            setting.sort_order
        ]);
    }
}

/*
 * Initialize the overlay settings database.
 *
 * This function creates the table first and then inserts
 * any settings that do not already exist.
 */
export async function initializeOverlaySettings() {
    try {
        console.log("Initializing overlay settings database...");

        await createOverlaySettingsTable();
        await createDefaultSettings();

        console.log("Overlay settings database initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize overlay settings database.");
        console.error(error);

        throw error;
    }
}
