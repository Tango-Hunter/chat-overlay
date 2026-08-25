/**
 * Title: settings-repository.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Provides database operations for overlay settings.
 */

import config from "../configs/config.js";

/*
 * Reference the PostgreSQL connection pool created
 * in the central configuration file.
 */
const { database } = config;


/**
 * GET SETTINGS
 *
 * Retrieves all overlay settings from the database.
 *
 * Settings are returned in category and sort order so that
 * the settings interface can display them in a predictable
 * order.
 *
 * @returns {Promise<Array>} Array of overlay setting objects.
 */
export async function getSettings() {
    const query = `
        SELECT
            id,
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
        FROM overlay_settings
        ORDER BY category, sort_order, id;
    `;

    const result = await database.query(query);

    return result.rows;
}


/**
 * UPDATE SETTINGS
 *
 * Updates one or more overlay settings.
 *
 * Expected input:
 *
 * [
 *     {
 *         setting_name: "font_size",
 *         setting_value: "20"
 *     },
 *     {
 *         setting_name: "typing_enabled",
 *         setting_value: "true"
 *     }
 * ]
 *
 * Only setting_value and updated_at are modified.
 *
 * @param {Array} settings - Settings to update.
 * @returns {Promise<Array>} Updated setting records.
 */
export async function updateSettings(settings) {
    if (!Array.isArray(settings)) {
        throw new TypeError("Settings must be provided as an array.");
    }

    if (settings.length === 0) {
        return [];
    }

    const client = await database.connect();

    try {
        /*
         * Start a transaction so either every requested
         * setting is updated or none of them are.
         */
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
                UPDATE overlay_settings
                SET
                    setting_value = $1,
                    updated_at = NOW()
                WHERE setting_name = $2
                RETURNING
                    id,
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
                setting.setting_name
            ]);

            /*
             * A requested setting that doesn't exist in the
             * database is considered an error rather than
             * silently being ignored.
             */
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
        /*
         * Always return the client to the connection pool.
         */
        client.release();
    }
}


/**
 * RESET SETTINGS
 *
 * Resets every overlay setting to its stored default value.
 *
 * The setting_default column is never changed.
 *
 * @returns {Promise<Array>} Reset setting records.
 */
export async function resetSettings() {
    const query = `
        UPDATE overlay_settings
        SET
            setting_value = setting_default,
            updated_at = NOW()
        RETURNING
            id,
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
        ;
    `;

    const result = await database.query(query);

    return result.rows;
}
