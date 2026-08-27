/**
 * Name: overlay-settings.js
 * Author: Tango Hunter
 * Date Created: 8/26/26
 * Description: Express routes for the Digital Terminal Chat Overlay settings manager.
 */


import express from "express";


import {
    getSettings,
    updateSettings,
    resetSettings
} from "../database/settings-repository.js";


const router = express.Router();


/*
==============================================================================
    GET OVERLAY SETTINGS
==============================================================================

    Endpoint:

        GET /api/overlay-settings

    Purpose:

        Retrieves all overlay settings required by the
        settings management webpage.

    Response:

        {
            settings: [
                {
                    setting_name,
                    setting_value,
                    setting_default,
                    form_type,
                    css_class,
                    updated_at
                }
            ]
        }

==============================================================================
*/

router.get(
    "/",
    async (
        req,
        res
    ) => {

        try {

            console.log("[Overlay Settings] GET request received.");

            const settings = await getSettings();

            console.log(`[Overlay Settings] Loaded ${settings.length} settings.`);

            return res.status(200).json({
                settings
            });
        }

        catch (error) {
            console.error(
                "[Overlay Settings] Failed to load settings:",
                error
            );

            return res.status(500).json({
                error: "Unable to load overlay settings."
            });
        }
    }
);


/*
==============================================================================
    UPDATE OVERLAY SETTINGS
==============================================================================

    Endpoint:

        PUT /api/overlay-settings

    Expected body:

        {
            settings: [
                {
                    setting_name: "font_size",
                    setting_value: "18px"
                },
                {
                    setting_name: "typing_speed",
                    setting_value: "35"
                }
            ]
        }

    Important:

        The client is only permitted to submit:

            setting_name
            setting_value

        Metadata such as:

            setting_default
            form_type
            css_class
            updated_at

        remains server/database controlled.

==============================================================================
*/

router.put(
    "/",
    async (
        req,
        res
    ) => {

        try {

            console.log("[Overlay Settings] PUT request received.");

            const { settings } = req.body;

            /*
            ----------------------------------------------------------
            VALIDATE REQUEST BODY
            ----------------------------------------------------------
            */
            if (
                !settings ||
                !Array.isArray(settings)
            ) {
                return res.status(400).json({
                    error: "Request body must contain a settings array."
                });
            }

            /*
            ----------------------------------------------------------
            VALIDATE SETTINGS
            ----------------------------------------------------------
            */
            if (
                settings.length === 0
            ) {
                return res.status(400).json({
                    error: "Settings array cannot be empty."
                });
            }

            for (
                const setting of settings
            ) {

                if (
                    !setting ||
                    typeof setting !==
                        "object"
                ) {
                    return res.status(400).json({
                        error: "Each setting must be an object."
                    });
                }

                if (
                    typeof setting.setting_name !==
                        "string" ||
                    setting.setting_name.trim() ===
                        ""
                ) {
                    return res.status(400).json({
                        error: "Each setting must contain a valid setting_name."
                    });
                }

                if (
                    !Object.prototype.hasOwnProperty.call(
                        setting,
                        "setting_value"
                    )
                ) {
                    return res.status(400).json({
                        error: `Setting "${setting.setting_name}" is missing setting_value.`
                    });
                }
            }

            /*
            ----------------------------------------------------------
            REMOVE DUPLICATE SETTING NAMES
            ----------------------------------------------------------

            The webpage should never send duplicates, but we
            normalize the request here so a malformed request
            cannot cause ambiguous updates.
            */
            const uniqueSettings = new Map();

            for (
                const setting of settings
            ) {
                uniqueSettings.set(
                    setting.setting_name.trim(),
                    setting.setting_value
                );
            }

            const normalizedSettings =
                Array.from(uniqueSettings.entries())
                .map(
                    (
                        [
                            setting_name,
                            setting_value
                        ]
                    ) => ({
                        setting_name,
                        setting_value
                    })
                );

            console.log(`[Overlay Settings] Updating ${normalizedSettings.length} settings.`);

            /*
            ----------------------------------------------------------
            UPDATE DATABASE
            ----------------------------------------------------------
            */
            await updateSettings(normalizedSettings);

            console.log("[Overlay Settings] Settings updated successfully.");

            return res.status(200).json({
                success: true,
                message: "Overlay settings updated successfully."
            });
        }

        catch (error) {

            console.error(
                "[Overlay Settings] Failed to update settings:",
                error
            );

            return res.status(500).json({
                error: "Unable to update overlay settings."
            });
        }
    }
);


/*
==============================================================================
    RESET OVERLAY SETTINGS
==============================================================================

    Endpoint:

        POST /api/overlay-settings/reset

    Purpose:

        Restores every overlay setting to its database-defined
        default value.

    The repository is responsible for determining the default
    values and updating the database.

==============================================================================
*/

router.post(
    "/reset",
    async (
        req,
        res
    ) => {

        try {

            console.log("[Overlay Settings] RESET request received.");

            await resetSettings();

            console.log("[Overlay Settings] Settings reset to defaults successfully.");

            return res.status(200).json({
                success: true,
                message: "Overlay settings reset to their default values."
            });
        }

        catch (error) {

            console.error(
                "[Overlay Settings] Failed to reset settings:",
                error
            );

            return res.status(500).json({
                error: "Unable to reset overlay settings."
            });
        }
    }
);


/*
==============================================================================
    EXPORT ROUTER
==============================================================================
*/

export default router;
