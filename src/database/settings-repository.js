/**
 * ============================================================================
 * Title: settings-repository.js
 * Author: Tango Hunter
 * Date Created: 8/27/26
 * Description: Provides database operations for Chat Overlay settings.
 * ============================================================================
 */

import config from "../configs/config.js";

const { database } = config;


/*
 * ============================================================================
 * FONT OPTIONS
 * ============================================================================
 */

const FONT_OPTIONS = {
    "Monospace": [
        "IBM Plex Mono",
        "JetBrains Mono",
        "Roboto Mono",
        "Source Code Pro",
        "Space Mono",
        "Fira Code",
        "DM Mono",
        "Noto Sans Mono",
        "Inconsolata",
        "Ubuntu Mono"
    ],
    "Sans-serif": [
        "Inter",
        "Roboto",
        "Open Sans",
        "Noto Sans",
        "Montserrat",
        "Poppins",
        "Lato",
        "Nunito",
        "Raleway",
        "Work Sans"
    ],
    "Serif": [
        "Merriweather",
        "Lora",
        "Playfair Display",
        "Libre Baskerville",
        "Source Serif 4",
        "Cormorant Garamond",
        "Crimson Text",
        "Bitter",
        "Roboto Slab",
        "PT Serif"
    ],
    "Script": [
        "Pacifico",
        "Lobster",
        "Dancing Script",
        "Great Vibes",
        "Caveat",
        "Satisfy",
        "Sacramento",
        "Kaushan Script",
        "Permanent Marker",
        "Yellowtail"
    ],
    "Blackletter": [
        "UnifrakturCook",
        "UnifrakturMaguntia",
        "Pirata One",
        "Uncial Antiqua",
        "MedievalSharp",
        "Germania One",
        "Grenze Gotisch",
        "New Rocker"
    ]
};


/*
 * ============================================================================
 * DEFAULT SETTINGS
 * ============================================================================
 */

const DEFAULT_SETTINGS = [
    {
        setting_name: "font_family",
        display_name: "Font Family",
        setting_value: "IBM Plex Mono",
        setting_default: "IBM Plex Mono",
        form_type: "font",
        form_options: JSON.stringify(FONT_OPTIONS),
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
        setting_name: "font_color",
        display_name: "Font Color",
        setting_value: "#00FF78",
        setting_default: "#00FF78",
        form_type: "color",
        form_options: null,
        css_class: "color-input",
        category: "typography",
        description: "Color used for chat text.",
        sort_order: 50
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
        description: "Delay between characters during typing, in milliseconds.",
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
        description: "Controls how quickly the terminal cursor blinks.",
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
        description: "Displays the terminal cursor while typing.",
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
        description: "Maximum visible messages. Set to 0 for unlimited messages.",
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
        description: "Controls spacing between individual chat messages.",
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
        description: "Displays the viewer's avatar.",
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
        description: "Displays the viewer's username.",
        sort_order: 50
    },
    {
        setting_name: "show_badges",
        display_name: "Show Badges",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "messages",
        description: "Displays Twitch badges beside viewer usernames.",
        sort_order: 60
    },
    {
        setting_name: "show_emotes",
        display_name: "Show Emotes",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "messages",
        description: "Displays Twitch emotes in chat messages.",
        sort_order: 70
    },
    {
        setting_name: "message_style",
        display_name: "Message Style",
        setting_value: "new_line",
        setting_default: "new_line",
        form_type: "select",
        form_options: JSON.stringify([
            "new_line",
            "inline"
        ]),
        css_class: "style-select",
        category: "messages",
        description: "Controls whether messages appear inline or on a new line.",
        sort_order: 80
    },
    {
        setting_name: "background_opacity",
        display_name: "Background Opacity",
        setting_value: "94",
        setting_default: "94",
        form_type: "percentage",
        form_options: null,
        css_class: "percentage-input",
        category: "background",
        description: "Controls terminal background opacity as a percentage.",
        sort_order: 10
    },
    {
        setting_name: "background_color",
        display_name: "Background Color",
        setting_value: "#020805",
        setting_default: "#020805",
        form_type: "color",
        form_options: null,
        css_class: "color-input",
        category: "background",
        description: "Color used for the terminal background.",
        sort_order: 20
    },
    {
        setting_name: "show_border",
        display_name: "Show Border",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "background",
        description: "Displays the terminal border.",
        sort_order: 30
    },
    {
        setting_name: "border_color",
        display_name: "Border Color",
        setting_value: "#00FF78",
        setting_default: "#00FF78",
        form_type: "color",
        form_options: null,
        css_class: "color-input",
        category: "background",
        description: "Color used for the terminal border.",
        sort_order: 40
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
        description: "Periodically performs a CRT-style reboot effect.",
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
        description: "How often the CRT reboot occurs, in minutes.",
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
        description: "Controls intensity and duration of the CRT reboot.",
        sort_order: 60
    }
];


/*
 * ============================================================================
 * SYNARA SETTINGS
 * ============================================================================
 */

const SYNARA_SETTINGS = [
    {
        setting_name: "synara_ai_responses_enabled",
        display_name: "SYNARA - AI Responses Enabled",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "synara",
        description: "Allows SYNARA to generate AI responses to Twitch chat.",
        sort_order: 10
    },
    {
        setting_name: "synara_response_chance",
        display_name: "SYNARA - Response Chance",
        setting_value: "10",
        setting_default: "10",
        form_type: "percentage",
        form_options: null,
        css_class: "percentage-input",
        category: "synara",
        description: "Chance that SYNARA responds to an eligible chat message.",
        sort_order: 20
    },
    {
        setting_name: "synara_ignore_emotes",
        display_name: "SYNARA - Ignore Emotes",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "synara",
        description: "Prevents SYNARA from responding to emote-only messages.",
        sort_order: 30
    },
    {
        setting_name: "synara_ignore_broadcaster",
        display_name: "SYNARA - Ignore Broadcaster",
        setting_value: "false",
        setting_default: "false",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "synara",
        description: "Prevents SYNARA from responding to broadcaster messages.",
        sort_order: 40
    },
    {
        setting_name: "synara_ignore_bots",
        display_name: "SYNARA - Ignore Bots",
        setting_value: "true",
        setting_default: "true",
        form_type: "checkbox",
        form_options: null,
        css_class: "checkbox-input",
        category: "synara",
        description: "Prevents SYNARA from responding to bot messages.",
        sort_order: 50
    }
];


/*
 * ============================================================================
 * GET SETTINGS
 * ============================================================================
 */

export async function getSettings(twitchUserId) {

    if (!twitchUserId) {
        throw new TypeError("Twitch user ID is required.");
    }

    const query = `
        SELECT
            id,
            twitch_user_id,
            setting_name,
            display_name,
            setting_value,
            setting_default,
            form_type,
            form_options,
            css_class,
            category,
            description,
            sort_order,
            updated_at
        FROM chat_overlay_settings
        WHERE twitch_user_id = $1
        ORDER BY category, sort_order, id;
    `;

    const result = await database.query(query, [twitchUserId]);

    return result.rows;
}


/*
 * ============================================================================
 * CREATE DEFAULT SETTINGS
 * ============================================================================
 */

export async function createDefaultSettings(twitchUserId) {

    if (!twitchUserId) {
        throw new TypeError("Twitch user ID is required.");
    }

    const isAdministrator =
        twitchUserId === config.auth.administrator;

    const settings = isAdministrator
        ? [...DEFAULT_SETTINGS, ...SYNARA_SETTINGS]
        : DEFAULT_SETTINGS;

    const client = await database.connect();

    try {

        await client.query("BEGIN");

        const query = `
            INSERT INTO chat_overlay_settings (
                twitch_user_id,
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
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11
            )
            ON CONFLICT (twitch_user_id, setting_name)
            DO NOTHING
            RETURNING *;
        `;

        const createdSettings = [];

        for (const setting of settings) {

            const result = await client.query(query, [
                twitchUserId,
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

            if (result.rowCount > 0) {
                createdSettings.push(result.rows[0]);
            }
        }

        await client.query("COMMIT");

        return createdSettings;

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
}


/*
 * ============================================================================
 * UPDATE SETTINGS
 * ============================================================================
 */

export async function updateSettings(twitchUserId, settings) {

    if (!twitchUserId) {
        throw new TypeError("Twitch user ID is required.");
    }

    if (!Array.isArray(settings)) {
        throw new TypeError("Settings must be provided as an array.");
    }

    if (settings.length === 0) {
        return [];
    }

    const client = await database.connect();

    try {

        await client.query("BEGIN");

        const updatedSettings = [];

        for (const setting of settings) {

            if (
                !setting ||
                typeof setting.setting_name !== "string" ||
                typeof setting.setting_value === "undefined"
            ) {
                throw new TypeError(
                    "Each setting must contain setting_name and setting_value."
                );
            }

            const query = `
                UPDATE chat_overlay_settings
                SET
                    setting_value = $1,
                    updated_at = NOW()
                WHERE
                    twitch_user_id = $2
                    AND setting_name = $3
                RETURNING
                    id,
                    twitch_user_id,
                    setting_name,
                    display_name,
                    setting_value,
                    setting_default,
                    form_type,
                    form_options,
                    css_class,
                    category,
                    description,
                    sort_order,
                    updated_at;
            `;

            const result = await client.query(query, [
                String(setting.setting_value),
                twitchUserId,
                setting.setting_name
            ]);

            if (result.rowCount === 0) {
                throw new Error(
                    `Setting not found: ${setting.setting_name}`
                );
            }

            updatedSettings.push(result.rows[0]);
        }

        await client.query("COMMIT");

        return updatedSettings;

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
}


/*
 * ============================================================================
 * RESET SETTINGS
 * ============================================================================
 */

export async function resetSettings(twitchUserId) {

    if (!twitchUserId) {
        throw new TypeError("Twitch user ID is required.");
    }

    const query = `
        UPDATE chat_overlay_settings
        SET
            setting_value = setting_default,
            updated_at = NOW()
        WHERE twitch_user_id = $1
        RETURNING
            id,
            twitch_user_id,
            setting_name,
            display_name,
            setting_value,
            setting_default,
            form_type,
            form_options,
            css_class,
            category,
            description,
            sort_order,
            updated_at;
    `;

    const result = await database.query(query, [twitchUserId]);

    return result.rows;
}
