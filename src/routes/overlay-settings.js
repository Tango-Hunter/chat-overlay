/*
 * ============================================================================
 * Name: overlay-settings.js
 * Author: Tango Hunter
 * Date Created: 8/26/26
 * Description: Express routes for the Chat Overlay settings editor.
 * ============================================================================
 */

import express from "express";

import {
    getUserByTwitchId
} from "../database/registered-users-repository.js";

import {
    getSettings,
    updateSettings,
    resetSettings
} from "../database/settings-repository.js";


/*==============================================================================
    ROUTER
==============================================================================*/

const router =
    express.Router();


/*==============================================================================
    GET SETTINGS
==============================================================================*/

router.get(
    "/",
    async (
        req,
        res
    ) => {

        const twitchUserId =
            req.session.twitchUserId;

        if (
            !twitchUserId
        ) {

            return res.status(
                400
            ).json({
                error:
                    "A Twitch user ID is required."
            });
        }

        try {

            const [
                settings,
                user
            ] =
                await Promise.all([
                    getSettings(
                        twitchUserId
                    ),

                    getUserByTwitchId(
                        twitchUserId
                    )
                ]);

            if (
                !user
            ) {

                return res.status(
                    404
                ).json({
                    error:
                        "Registered user not found."
                });
            }

            return res.status(
                200
            ).json({
                settings,

                user: {
                    twitchUserId:
                        user.twitch_user_id,

                    twitchDisplayName:
                        user.twitch_display_name,

                    twitchScopes:
                        user.twitch_scopes || []
                }
            });

        } catch (error) {

            console.error(
                "[Overlay Settings] Failed to load settings.",
                error
            );

            return res.status(
                500
            ).json({
                error:
                    "Unable to load overlay settings."
            });
        }
    }
);


/*==============================================================================
    UPDATE SETTINGS
==============================================================================*/

router.put(
    "/",
    async (
        req,
        res
    ) => {

        const twitchUserId =
            req.session.twitchUserId;

        if (
            !twitchUserId
        ) {

            return res.status(
                400
            ).json({
                error:
                    "A Twitch user ID is required."
            });
        }

        const {
            settings
        } =
            req.body || {};

        if (
            !Array.isArray(
                settings
            )
        ) {

            return res.status(
                400
            ).json({
                error:
                    "Request body must contain a settings array."
            });
        }

        if (
            settings.length ===
            0
        ) {

            return res.status(
                400
            ).json({
                error:
                    "Settings array cannot be empty."
            });
        }

        try {

            const uniqueSettings =
                new Map();

            for (
                const setting of settings
            ) {

                if (
                    !setting ||
                    typeof setting !==
                        "object"
                ) {

                    return res.status(
                        400
                    ).json({
                        error:
                            "Each setting must be an object."
                    });
                }

                const settingName =
                    setting.setting_name;

                if (
                    typeof settingName !==
                        "string" ||

                    !settingName.trim()
                ) {

                    return res.status(
                        400
                    ).json({
                        error:
                            "Each setting must contain a valid setting_name."
                    });
                }

                if (
                    !Object.prototype.hasOwnProperty.call(
                        setting,
                        "setting_value"
                    )
                ) {

                    return res.status(
                        400
                    ).json({
                        error:
                            `Setting "${settingName}" is missing setting_value.`
                    });
                }

                uniqueSettings.set(
                    settingName.trim(),
                    String(
                        setting.setting_value
                    )
                );
            }

            const normalizedSettings =
                Array.from(
                    uniqueSettings.entries()
                ).map(
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

            const updatedSettings =
                await updateSettings(
                    twitchUserId,
                    normalizedSettings
                );

            return res.status(
                200
            ).json({
                success: true,
                settings:
                    updatedSettings
            });

        } catch (error) {

            console.error(
                "[Overlay Settings] Failed to update settings.",
                error
            );

            return res.status(
                500
            ).json({
                error:
                    "Unable to update overlay settings."
            });
        }
    }
);


/*==============================================================================
    RESET SETTINGS
==============================================================================*/

router.post(
    "/reset",
    async (
        req,
        res
    ) => {

        const twitchUserId =
            req.session.twitchUserId;

        if (
            !twitchUserId
        ) {

            return res.status(
                400
            ).json({
                error:
                    "A Twitch user ID is required."
            });
        }

        try {

            const settings =
                await resetSettings(
                    twitchUserId
                );

            return res.status(
                200
            ).json({
                success: true,
                settings
            });

        } catch (error) {

            console.error(
                "[Overlay Settings] Failed to reset settings.",
                error
            );

            return res.status(
                500
            ).json({
                error:
                    "Unable to reset overlay settings."
            });
        }
    }
);


export default router;
