/*
 * ============================================================================
 * Name: authentication.js
 * Author: Tango Hunter
 * Date Created: 8/30/26
 * Description: Express routes for user authentication and session management.
 * ============================================================================
 */

import express from "express";
import crypto from "node:crypto";
import { promisify } from "node:util";

import config from "../configs/config.js";

import {
    isSessionAuthenticated
} from "../auth/require-authentication.js";

import {
    getUserByUsername
} from "../database/registered-users-repository.js";

import {
    getValidAccessToken
} from "../twitch/twitch-auth.js";


/*==============================================================================
    ROUTER
==============================================================================*/

const router =
    express.Router();


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const scryptAsync =
    promisify(
        crypto.scrypt
    );


/*==============================================================================
    PASSWORD VERIFICATION
==============================================================================*/

async function verifyPassword(
    password,
    storedHash
) {

    if (
        !password ||
        !storedHash
    ) {
        return false;
    }

    const parts =
        storedHash.split(
            "$"
        );

    if (
        parts.length !== 6 ||
        parts[0] !== "scrypt"
    ) {

        console.error(
            "Invalid password hash format."
        );

        return false;
    }

    const N =
        Number(
            parts[1]
        );

    const r =
        Number(
            parts[2]
        );

    const p =
        Number(
            parts[3]
        );

    const salt =
        parts[4];

    const expectedHash =
        parts[5];

    if (
        !N ||
        !r ||
        !p ||
        !salt ||
        !expectedHash
    ) {
        return false;
    }

    try {

        const derivedKey =
            await scryptAsync(
                password,
                salt,
                64,
                {
                    N,
                    r,
                    p
                }
            );

        const expectedBuffer =
            Buffer.from(
                expectedHash,
                "hex"
            );

        if (
            derivedKey.length !==
            expectedBuffer.length
        ) {
            return false;
        }

        return crypto.timingSafeEqual(
            derivedKey,
            expectedBuffer
        );

    } catch (error) {

        console.error(
            "Password verification failed.",
            error
        );

        return false;
    }
}


/*==============================================================================
    UPDATE SESSION ACTIVITY
==============================================================================*/

function updateSessionActivity(
    req
) {

    req.session.lastActivity =
        Date.now();
}


/*==============================================================================
    VALIDATE TWITCH AUTHORIZATION
==============================================================================*/

async function validateTwitchAuthorization(
    twitchUserId
) {

    /*
     * Legacy users may not have a Twitch user ID yet.
     *
     * Authentication is still allowed for these accounts.
     */

    if (
        !twitchUserId
    ) {
        return {
            checked: false,
            valid: false
        };
    }

    try {

        await getValidAccessToken(
            twitchUserId
        );

        return {
            checked: true,
            valid: true
        };

    } catch (error) {

        console.error(
            `Failed to validate Twitch authorization for user ${twitchUserId}.`,
            error
        );

        return {
            checked: true,
            valid: false
        };
    }
}


/*==============================================================================
    LOGIN
==============================================================================*/

router.post(
    "/login",
    async (req, res) => {

        const {
            username,
            password
        } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string"
        ) {

            return res.status(
                400
            ).json({
                authenticated: false,
                message:
                    "Invalid credentials."
            });
        }

        const normalizedUsername =
            username.trim();

        if (
            !normalizedUsername ||
            !password
        ) {

            return res.status(
                400
            ).json({
                authenticated: false,
                message:
                    "Invalid credentials."
            });
        }

        try {

            /*
             * Database authentication only.
             */

            const registeredUser =
                await getUserByUsername(
                    normalizedUsername
                );

            if (
                !registeredUser ||
                !registeredUser.enabled
            ) {

                return res.status(
                    401
                ).json({
                    authenticated: false,
                    message:
                        "Authentication failed."
                });
            }

            const passwordValid =
                await verifyPassword(
                    password,
                    registeredUser.password_hash
                );

            if (
                !passwordValid
            ) {

                return res.status(
                    401
                ).json({
                    authenticated: false,
                    message:
                        "Authentication failed."
                });
            }

            /*
             * Check the Twitch token before creating
             * the authenticated session.
             *
             * A failed Twitch validation does not prevent
             * the user from logging into the application.
             */

            const twitchAuthorization =
                await validateTwitchAuthorization(
                    registeredUser.twitch_user_id
                );

            /*
             * Regenerate the session after successful
             * authentication to prevent session fixation.
             */

            req.session.regenerate(
                error => {

                    if (
                        error
                    ) {

                        console.error(
                            "Failed to regenerate authentication session.",
                            error
                        );

                        return res.status(
                            500
                        ).json({
                            authenticated: false,
                            message:
                                "Authentication system failure."
                        });
                    }

                    const twitchUserId =
                        registeredUser.twitch_user_id ||
                        null;

                    const isAdministrator =
                        twitchUserId !== null &&
                        twitchUserId ===
                        config.auth.administrator;

                    req.session.authenticated =
                        true;

                    req.session.userId =
                        registeredUser.id;

                    req.session.username =
                        registeredUser.username;

                    /*
                     * Retained for compatibility with
                     * existing application code.
                     */

                    req.session.operator =
                        registeredUser.username;

                    req.session.twitchUserId =
                        twitchUserId;

                    req.session.twitchUsername =
                        registeredUser.twitch_username ||
                        null;

                    req.session.twitchDisplayName =
                        registeredUser.twitch_display_name ||
                        null;

                    /*
                     * This is convenient session information.
                     *
                     * Sensitive route authorization should
                     * still verify twitchUserId against
                     * config.auth.administrator.
                     */

                    req.session.isAdministrator =
                        isAdministrator;

                    req.session.twitchAuthorizationChecked =
                        twitchAuthorization.checked;

                    req.session.twitchAuthorizationValid =
                        twitchAuthorization.valid;

                    req.session.createdAt =
                        Date.now();

                    req.session.lastActivity =
                        Date.now();

                    req.session.save(
                        saveError => {

                            if (
                                saveError
                            ) {

                                console.error(
                                    "Failed to save authentication session.",
                                    saveError
                                );

                                return res.status(
                                    500
                                ).json({
                                    authenticated: false,
                                    message:
                                        "Authentication system failure."
                                });
                            }

                            return res.status(
                                200
                            ).json({
                                authenticated: true,

                                twitchUserId,

                                isAdministrator,

                                twitchAuthorization:
                                    twitchAuthorization.valid
                            });
                        }
                    );
                }
            );

        } catch (error) {

            console.error(
                "Authentication failed.",
                error
            );

            return res.status(
                500
            ).json({
                authenticated: false,
                message:
                    "Authentication system failure."
            });
        }
    }
);


/*==============================================================================
    AUTHENTICATION STATUS
==============================================================================*/

router.get(
    "/status",
    (req, res) => {

        if (
            !isSessionAuthenticated(
                req.session
            )
        ) {

            if (
                req.session
            ) {

                req.session.destroy(
                    () => {}
                );
            }

            return res.status(
                401
            ).json({
                authenticated: false
            });
        }

        updateSessionActivity(
            req
        );

        req.session.save(
            error => {

                if (
                    error
                ) {

                    console.error(
                        "Failed to update authentication session.",
                        error
                    );

                    return res.status(
                        500
                    ).json({
                        authenticated: false,
                        message:
                            "Authentication system failure."
                    });
                }

                const twitchUserId =
                    req.session.twitchUserId ||
                    null;

                const isAdministrator =
                    twitchUserId !== null &&
                    twitchUserId ===
                    config.auth.administrator;

                return res.status(
                    200
                ).json({
                    authenticated: true,

                    userId:
                        req.session.userId ||
                        null,

                    username:
                        req.session.username ||
                        req.session.operator ||
                        null,

                    twitchUserId,

                    twitchUsername:
                        req.session.twitchUsername ||
                        null,

                    twitchDisplayName:
                        req.session.twitchDisplayName ||
                        null,

                    isAdministrator,

                    twitchAuthorization:
                        req.session.twitchAuthorizationValid ===
                        true
                });
            }
        );
    }
);


/*==============================================================================
    LOGOUT
==============================================================================*/

router.post(
    "/logout",
    (req, res) => {

        req.session.destroy(
            error => {

                if (
                    error
                ) {

                    console.error(
                        "Failed to destroy authentication session.",
                        error
                    );

                    return res.status(
                        500
                    ).json({
                        authenticated: false,
                        message:
                            "Logout failed."
                    });
                }

                res.clearCookie(
                    config.auth.sessionCookieName,
                    {
                        httpOnly: true,

                        secure:
                            config.server.environment ===
                            "production",

                        sameSite:
                            "lax",

                        path: "/"
                    }
                );

                return res.status(
                    200
                ).json({
                    authenticated: false
                });
            }
        );
    }
);


export default router;
