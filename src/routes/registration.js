/*
 * ============================================================================
 * Name: registration.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: Broadcaster account registration workflow and link management.
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
    createUser,
    getUserByUsername,
    getUserByTwitchId,
    deleteUser
} from "../database/registered-users-repository.js";

import {
    createDefaultSettings
} from "../database/settings-repository.js";

import {
    getPendingTwitchAuthorization,
    consumePendingTwitchAuthorization
} from "./twitch.js";


/*==============================================================================
    ROUTER
==============================================================================*/

const router =
    express.Router();


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const REGISTRATION_LINK_LIFETIME =
    10 * 60 * 1000;

const MAX_REGISTRATION_LINKS =
    3;

const scryptAsync =
    promisify(
        crypto.scrypt
    );


/*==============================================================================
    REGISTRATION LINKS
==============================================================================*/

const registrationLinks =
    new Map();


/*==============================================================================
    HELPERS
==============================================================================*/

function removeExpiredRegistrationLinks() {

    const now =
        Date.now();

    for (
        const [
            token,
            link
        ] of registrationLinks
    ) {

        if (
            link.expiresAt <=
            now
        ) {

            registrationLinks.delete(
                token
            );
        }
    }
}


function generateRegistrationToken() {

    return crypto.randomBytes(
        32
    ).toString("hex");
}


function getRegistrationLinkUrl(
    token
) {

    const domain =
        config.app.url;

    return `${domain}/registration?token=${encodeURIComponent(token)}`;
}


function normalizeRegistrationType(
    value
) {

    return value ===
        "synara"
        ? "synara"
        : "user";
}


async function hashPassword(
    password
) {

    const N =
        16384;

    const r =
        8;

    const p =
        1;

    const keyLength =
        64;

    const salt =
        crypto.randomBytes(
            16
        ).toString(
            "hex"
        );

    const derivedKey =
        await scryptAsync(
            password,
            salt,
            keyLength,
            {
                N,
                r,
                p
            }
        );

    return [
        "scrypt",
        N,
        r,
        p,
        salt,
        Buffer.from(
            derivedKey
        ).toString(
            "hex"
        )
    ].join(
        "$"
    );
}


/*==============================================================================
    ADMINISTRATOR CHECK
==============================================================================*/

function isAdministrator(
    req
) {

    if (
        !isSessionAuthenticated(
            req.session
        )
    ) {

        return false;
    }

    /*
     * TEMPORARY BOOTSTRAP OVERRIDE.
     *
     * Restore the administrator Twitch ID check after the first
     * successful registered account has been created.
     */

    const twitchUserId =
        req.session.twitchUserId;

    return (
        //twitchUserId ===
        //config.auth.administrator
        true
    );
}


/*==============================================================================
    GET ACTIVE LINKS
==============================================================================*/

router.get(
    "/links",
    (req, res) => {

        if (
            !isAdministrator(
                req
            )
        ) {

            return res.status(
                401
            ).json({
                authenticated: false,
                message:
                    "Administrator authentication required."
            });
        }

        removeExpiredRegistrationLinks();

        const links = [];

        for (
            const [
                token,
                link
            ] of registrationLinks
        ) {

            links.push({
                token,

                registrationType:
                    link.registrationType,

                url:
                    getRegistrationLinkUrl(
                        token
                    ),

                createdAt:
                    link.createdAt,

                expiresAt:
                    link.expiresAt
            });
        }

        return res.status(
            200
        ).json({
            links
        });
    }
);


/*==============================================================================
    CREATE LINK
==============================================================================*/

router.post(
    "/create-link",
    (req, res) => {

        if (
            !isAdministrator(
                req
            )
        ) {

            return res.status(
                401
            ).json({
                authenticated: false,
                message:
                    "Administrator authentication required."
            });
        }

        removeExpiredRegistrationLinks();

        if (
            registrationLinks.size >=
            MAX_REGISTRATION_LINKS
        ) {

            return res.status(
                409
            ).json({
                message:
                    "The maximum number of active registration links has been reached."
            });
        }

        const registrationType =
            normalizeRegistrationType(
                req.body?.registrationType
            );

        const token =
            generateRegistrationToken();

        const createdAt =
            Date.now();

        const expiresAt =
            createdAt +
            REGISTRATION_LINK_LIFETIME;

        registrationLinks.set(
            token,
            {
                registrationType,
                createdAt,
                expiresAt
            }
        );

        const url =
            getRegistrationLinkUrl(
                token
            );

        console.log(
            `Registration link created: ${registrationType}.`
        );

        return res.status(
            201
        ).json({
            token,
            registrationType,
            url,
            createdAt,
            expiresAt
        });
    }
);


/*==============================================================================
    GET REGISTRATION LINK
==============================================================================*/

export function getRegistrationLink(
    token
) {

    removeExpiredRegistrationLinks();

    if (
        typeof token !==
            "string" ||
        !token
    ) {

        return null;
    }

    const link =
        registrationLinks.get(
            token
        );

    if (!link) {
        return null;
    }

    if (
        link.expiresAt <=
        Date.now()
    ) {

        registrationLinks.delete(
            token
        );

        return null;
    }

    return {
        token,
        ...link
    };
}


/*==============================================================================
    VALIDATE REGISTRATION LINK
==============================================================================*/

router.get(
    "/validate",
    (req, res) => {

        const link =
            getRegistrationLink(
                req.query.token
            );

        if (!link) {

            return res.status(
                410
            ).json({
                valid: false,
                message:
                    "This registration link is invalid or has expired."
            });
        }

        return res.status(
            200
        ).json({
            valid: true,
            registrationType:
                link.registrationType,
            expiresAt:
                link.expiresAt
        });
    }
);


/*==============================================================================
    PREPARE REGISTRATION
==============================================================================*/

router.post(
    "/prepare",
    async (req, res) => {

        const {
            token,
            username,
            password
        } = req.body || {};

        if (
            typeof token !== "string" ||
            typeof username !== "string" ||
            typeof password !== "string"
        ) {

            return res.status(
                400
            ).json({
                message:
                    "Username, password, and registration token are required."
            });
        }

        const registrationLink =
            getRegistrationLink(
                token
            );

        if (!registrationLink) {

            return res.status(
                410
            ).json({
                message:
                    "This registration link is invalid or has expired."
            });
        }

        const normalizedUsername =
            username.trim();

        if (
            normalizedUsername.length < 3 ||
            normalizedUsername.length > 50
        ) {

            return res.status(
                400
            ).json({
                message:
                    "Username must be between 3 and 50 characters."
            });
        }

        if (
            password.length < 12
        ) {

            return res.status(
                400
            ).json({
                message:
                    "Password must be at least 12 characters."
            });
        }

        try {

            const existingUsername =
                await getUserByUsername(
                    normalizedUsername
                );

            if (
                existingUsername
            ) {

                return res.status(
                    409
                ).json({
                    message:
                        "That username is already registered."
                });
            }

            const passwordHash =
                await hashPassword(
                    password
                );

            req.session.registrationToken =
                token;

            req.session.registrationType =
                registrationLink.registrationType;

            req.session.registrationUsername =
                normalizedUsername;

            req.session.registrationPasswordHash =
                passwordHash;

            req.session.registrationExpiresAt =
                Date.now() +
                REGISTRATION_LINK_LIFETIME;

            await new Promise(
                (
                    resolve,
                    reject
                ) => {

                    req.session.save(
                        error => {

                            if (
                                error
                            ) {
                                reject(
                                    error
                                );
                            } else {
                                resolve();
                            }
                        }
                    );

                }
            );

            return res.status(
                200
            ).json({
                success: true
            });

        } catch (error) {

            console.error(
                "Failed to prepare registration.",
                error
            );

            return res.status(
                500
            ).json({
                message:
                    "Unable to prepare account registration."
            });
        }
    }
);


/*==============================================================================
    CREATE REGISTERED USER
==============================================================================*/

router.post(
    "/create",
    async (req, res) => {

        const {
            registrationToken,
            registrationType,
            registrationUsername,
            registrationPasswordHash,
            registrationExpiresAt
        } = req.session;

        if (
            !registrationToken ||
            !registrationType ||
            !registrationUsername ||
            !registrationPasswordHash ||
            !registrationExpiresAt
        ) {

            return res.status(
                400
            ).json({
                message:
                    "Registration session is missing or invalid. Please restart registration."
            });
        }

        if (
            Date.now() >
            Number(registrationExpiresAt)
        ) {

            return res.status(
                410
            ).json({
                message:
                    "The registration session has expired. Please restart registration."
            });
        }

        const token =
            registrationToken;

        const username =
            registrationUsername;

        const registrationLink =
            getRegistrationLink(
                token
            );

        if (
            !registrationLink
        ) {
            return res.status(
                410
            ).json({
                message:
                    "The registration link is invalid or has expired."
            });
        }

        const pendingAuthorization =
            getPendingTwitchAuthorization(
                req
            );

        if (!pendingAuthorization) {

            return res.status(
                400
            ).json({
                message:
                    "A valid Twitch authorization is required before registration can be completed."
            });
        }

        if (
            pendingAuthorization.registrationToken !==
            token
        ) {

            return res.status(
                400
            ).json({
                message:
                    "The Twitch authorization does not match this registration link."
            });
        }

        if (
            pendingAuthorization.registrationType !==
            registrationType
        ) {

            return res.status(
                400
            ).json({
                message:
                    "The Twitch authorization does not match this registration type."
            });
        }

        try {

            const existingUsername =
                await getUserByUsername(
                    username
                );

            if (
                existingUsername
            ) {

                return res.status(
                    409
                ).json({
                    message:
                        "That username is already registered."
                });
            }

            const existingTwitchUser =
                await getUserByTwitchId(
                    pendingAuthorization.twitchUserId
                );

            if (
                existingTwitchUser
            ) {

                return res.status(
                    409
                ).json({
                    message:
                        "That Twitch account is already registered."
                });
            }

            const passwordHash =
                registrationPasswordHash;

            const user =
                await createUser({
                    username:
                        username,

                    passwordHash,

                    twitchUserId:
                        pendingAuthorization.twitchUserId,

                    twitchUsername:
                        pendingAuthorization.twitchUsername,

                    twitchDisplayName:
                        pendingAuthorization.twitchDisplayName,

                    twitchAccessToken:
                        pendingAuthorization.accessToken,

                    twitchRefreshToken:
                        pendingAuthorization.refreshToken,

                    twitchScopes:
                        pendingAuthorization.scopes
                });

            try {

                await createDefaultSettings(
                    pendingAuthorization.twitchUserId,
                    pendingAuthorization.scopes
                );

            } catch (settingsError) {

                console.error(
                    "Failed to create default user settings.",
                    settingsError
                );

                await deleteUser(
                    user.id
                );

                throw settingsError;
            }

            /*
             * Only consume the pending authorization after the
             * database account and settings have been created.
             */

            consumePendingTwitchAuthorization(
                req
            );

            consumeRegistrationLink(
                token
            );

            /*
             * Log the newly registered user in immediately.
             */

            await new Promise(
                (
                    resolve,
                    reject
                ) => {

                    req.session.regenerate(
                        error => {

                            if (
                                error
                            ) {

                                reject(
                                    error
                                );

                                return;
                            }

                            req.session.authenticated =
                                true;

                            req.session.operator =
                                user.username;

                            req.session.twitchUserId =
                                user.twitch_user_id;

                            req.session.createdAt =
                                Date.now();

                            req.session.lastActivity =
                                Date.now();

                            req.session.save(
                                saveError => {

                                    if (
                                        saveError
                                    ) {

                                        reject(
                                            saveError
                                        );

                                        return;
                                    }

                                    resolve();
                                }
                            );
                        }
                    );
                }
            );

            console.log(
                `Registered user created: ${user.username} (${user.twitch_username}).`
            );

            return res.status(
                201
            ).json({
                username:
                    user.username,

                twitchUserId:
                    user.twitch_user_id,

                twitchUsername:
                    user.twitch_username,

                twitchDisplayName:
                    user.twitch_display_name
            });

        } catch (error) {

            console.error(
                "Failed to create registered user.",
                error
            );

            if (
                error.code ===
                "23505"
            ) {

                return res.status(
                    409
                ).json({
                    message:
                        "The username or Twitch account is already registered."
                });
            }

            return res.status(
                500
            ).json({
                message:
                    "Unable to complete account registration."
            });
        }
    }
);


/*==============================================================================
    CONSUME REGISTRATION LINK
==============================================================================*/

export function consumeRegistrationLink(
    token
) {

    const link =
        getRegistrationLink(
            token
        );

    if (!link) {
        return null;
    }

    registrationLinks.delete(
        token
    );

    console.log(
        `Registration link consumed: ${link.registrationType}.`
    );

    return link;
}


/*==============================================================================
    EXPORT
==============================================================================*/

export default router;
