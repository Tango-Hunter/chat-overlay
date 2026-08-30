/*
 * ============================================================================
 * Name: authentication.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: Express routes for operator authentication and session management.
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
    HELPERS
==============================================================================*/

function safeCompare(
    value,
    expected
) {

    const valueBuffer =
        Buffer.from(
            value
        );

    const expectedBuffer =
        Buffer.from(
            expected
        );

    if (
        valueBuffer.length !==
        expectedBuffer.length
    ) {

        return false;
    }

    return crypto.timingSafeEqual(
        valueBuffer,
        expectedBuffer
    );
}


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
        parts.length !==
            6 ||
        parts[0] !==
            "scrypt"
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
            typeof username !==
                "string" ||
            typeof password !==
                "string"
        ) {

            return res.status(
                400
            ).json({
                authenticated: false,
                message:
                    "Invalid credentials."
            });
        }

        let authenticated =
            false;

        let sessionOperator =
            username;

        let twitchUserId =
            null;

        /*
         * Check registered database users first.
         */

        const registeredUser =
            await getUserByUsername(
                username
            );

        if (
            registeredUser &&
            registeredUser.enabled
        ) {

            authenticated =
                await verifyPassword(
                    password,
                    registeredUser.password_hash
                );

            if (
                authenticated
            ) {

                sessionOperator =
                    registeredUser.username;

                twitchUserId =
                    registeredUser.twitch_user_id;
            }
        }

        /*
         * Preserve the existing .env operator credentials.
         */

        if (
            !authenticated
        ) {

            const usernameMatches =
                safeCompare(
                    username,
                    config.auth.username
                );

            if (
                usernameMatches
            ) {

                authenticated =
                    await verifyPassword(
                        password,
                        config.auth.passwordHash
                    );

                if (
                    authenticated
                ) {

                    sessionOperator =
                        config.auth.username;
                }
            }
        }

        if (
            !authenticated
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

                req.session.authenticated =
                    true;

                req.session.operator =
                    sessionOperator;

                req.session.twitchUserId =
                    twitchUserId;

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
                            authenticated: true
                        });
                    }
                );
            }
        );
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

                return res.status(
                    200
                ).json({
                    authenticated: true,
                    twitchUserId:
                        req.session.twitchUserId ||
                        null
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
                            "strict",
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
