/*
 * ============================================================================
 * Name: twitch.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: Twitch OAuth routes for broadcaster registration.
 * ============================================================================
 */

import express from "express";
import crypto from "node:crypto";

import {
    getRegistrationLink
} from "./registration.js";

import {
    createAuthorizationUrl,
    exchangeAuthorizationCode,
    validateAccessToken,
    getAuthenticatedUser
} from "../twitch/twitch-api.js";

import {
    encryptToken
} from "../twitch/twitch-auth.js";


/*==============================================================================
    ROUTER
==============================================================================*/

const router =
    express.Router();


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const OAUTH_STATE_LIFETIME =
    10 * 60 * 1000;


/*==============================================================================
    PENDING AUTHORIZATIONS
==============================================================================*/

const pendingAuthorizations =
    new Map();


/*==============================================================================
    HELPERS
==============================================================================*/

function removeExpiredAuthorizations() {

    const now =
        Date.now();

    for (
        const [
            state,
            authorization
        ] of pendingAuthorizations
    ) {

        if (
            authorization.expiresAt <=
            now
        ) {

            pendingAuthorizations.delete(
                state
            );
        }
    }
}


function generateState() {

    return crypto.randomBytes(
        32
    ).toString(
        "hex"
    );
}


/*==============================================================================
    START TWITCH OAUTH
==============================================================================*/

router.get(
    "/oauth/start",
    async (req, res) => {

        removeExpiredAuthorizations();

        const token =
            req.query.token;

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

        const state =
            generateState();

        req.session.twitchOAuthState =
            state;

        req.session.registrationToken =
            token;

        req.session.registrationType =
            registrationLink.registrationType;

        try {

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

            const authorizationUrl =
                createAuthorizationUrl(
                    state,
                    registrationLink.registrationType
                );

            return res.redirect(
                authorizationUrl
            );

        } catch (error) {

            console.error(
                "Failed to begin Twitch OAuth.",
                error
            );

            return res.status(
                500
            ).json({
                message:
                    "Unable to begin Twitch authorization."
            });
        }
    }
);


/*==============================================================================
    TWITCH OAUTH CALLBACK
==============================================================================*/

router.get(
    "/oauth/callback",
    async (req, res) => {

        const {
            code,
            state,
            error
        } = req.query;

        const registrationToken =
            req.session.registrationToken;

        if (
            error
        ) {

            console.warn(
                "Twitch OAuth authorization denied:",
                error
            );

            return res.redirect(
                `/registration?token=${encodeURIComponent(
                    registrationToken || ""
                )}&oauth=denied`
            );
        }

        if (
            typeof code !==
                "string" ||
            typeof state !==
                "string"
        ) {

            return res.redirect(
                `/registration?token=${encodeURIComponent(
                    registrationToken || ""
                )}&oauth=invalid`
            );
        }

        const expectedState =
            req.session.twitchOAuthState;

        const registrationType =
            req.session.registrationType;

        delete req.session.twitchOAuthState;
        delete req.session.registrationToken;
        delete req.session.registrationType;

        if (
            !expectedState ||
            state !==
                expectedState ||
            !registrationToken ||
            !registrationType
        ) {

            console.warn(
                "Twitch OAuth state validation failed."
            );

            return res.status(
                403
            ).send(
                "Twitch authorization could not be verified."
            );
        }

        const registrationLink =
            getRegistrationLink(
                registrationToken
            );

        if (
            !registrationLink ||
            registrationLink.registrationType !==
                registrationType
        ) {

            return res.status(
                410
            ).send(
                "The registration link is invalid or has expired."
            );
        }

        try {

            const tokenData =
                await exchangeAuthorizationCode(
                    code
                );

            const validation =
                await validateAccessToken(
                    tokenData.access_token
                );

            const twitchUser =
                await getAuthenticatedUser(
                    tokenData.access_token
                );

            if (
                validation.user_id !==
                twitchUser.id
            ) {

                throw new Error(
                    "Twitch identity validation failed."
                );
            }

            const scopes =
                Array.isArray(
                    validation.scopes
                )
                    ? validation.scopes
                    : [];

            const expectedScopes =
                registrationType ===
                    "synara"
                    ? [
                        "user:read:chat",
                        "user:write:chat"
                    ]
                    : [
                        "user:read:chat"
                    ];

            const missingScopes =
                expectedScopes.filter(
                    scope =>
                        !scopes.includes(
                            scope
                        )
                );

            if (
                missingScopes.length
            ) {

                throw new Error(
                    `Twitch authorization did not grant all required scopes: ${missingScopes.join(", ")}`
                );
            }

            pendingAuthorizations.set(
                state,
                {
                    registrationToken,
                    registrationType,

                    expiresAt:
                        Date.now() +
                        OAUTH_STATE_LIFETIME,

                    accessToken:
                        encryptToken(
                            tokenData.access_token
                        ),

                    refreshToken:
                        encryptToken(
                            tokenData.refresh_token
                        ),

                    twitchUserId:
                        twitchUser.id,

                    twitchUsername:
                        twitchUser.login,

                    twitchDisplayName:
                        twitchUser.display_name,

                    scopes
                }
            );

            req.session.pendingTwitchOAuth =
                state;

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

            return res.redirect(
                `/registration?token=${encodeURIComponent(
                    registrationToken
                )}&oauth=success`
            );

        } catch (error) {

            console.error(
                "Twitch OAuth callback failed.",
                error
            );

            return res.redirect(
                `/registration?token=${encodeURIComponent(
                    registrationToken || ""
                )}&oauth=failed`
            );
        }
    }
);


/*==============================================================================
    GET PENDING TWITCH AUTHORIZATION
==============================================================================*/

router.get(
    "/oauth/pending",
    (req, res) => {

        const authorization =
            getPendingTwitchAuthorization(
                req
            );

        if (!authorization) {

            return res.status(
                404
            ).json({
                connected: false,
                message:
                    "No pending Twitch authorization."
            });
        }

        return res.status(
            200
        ).json({
            connected: true,

            registrationType:
                authorization.registrationType,

            registrationUsername:
                req.session.registrationUsername,

            twitchUserId:
                authorization.twitchUserId,

            twitchUsername:
                authorization.twitchUsername,

            twitchDisplayName:
                authorization.twitchDisplayName,

            scopes:
                authorization.scopes,

            expiresAt:
                authorization.expiresAt
        });
    }
);


/*==============================================================================
    GET PENDING TWITCH AUTHORIZATION
==============================================================================*/

export function getPendingTwitchAuthorization(
    req
) {

    removeExpiredAuthorizations();

    const state =
        req.session.pendingTwitchOAuth;

    if (!state) {
        return null;
    }

    const authorization =
        pendingAuthorizations.get(
            state
        );

    if (!authorization) {

        delete req.session.pendingTwitchOAuth;

        return null;
    }

    const registrationLink =
        getRegistrationLink(
            authorization.registrationToken
        );

    if (!registrationLink) {

        pendingAuthorizations.delete(
            state
        );

        delete req.session.pendingTwitchOAuth;

        return null;
    }

    return authorization;
}


/*==============================================================================
    CONSUME PENDING TWITCH AUTHORIZATION
==============================================================================*/

export function consumePendingTwitchAuthorization(
    req
) {

    const authorization =
        getPendingTwitchAuthorization(
            req
        );

    if (!authorization) {
        return null;
    }

    const state =
        req.session.pendingTwitchOAuth;

    pendingAuthorizations.delete(
        state
    );

    delete req.session.pendingTwitchOAuth;

    return authorization;
}


/*==============================================================================
    CANCEL PENDING AUTHORIZATION
==============================================================================*/

router.delete(
    "/oauth/pending",
    (req, res) => {

        const state =
            req.session.pendingTwitchOAuth;

        if (
            state
        ) {

            pendingAuthorizations.delete(
                state
            );
        }

        delete req.session.pendingTwitchOAuth;

        return res.status(
            204
        ).send();
    }
);


/*==============================================================================
    EXPORT
==============================================================================*/

export default router;
