/*
 * ============================================================================
 * Name: twitch-api.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: Twitch OAuth and API communication utilities.
 * ============================================================================
 */

import config from "../configs/config.js";


/*==============================================================================
    ENDPOINTS
==============================================================================*/

const TWITCH_AUTHORIZE_URL =
    "https://id.twitch.tv/oauth2/authorize";

const TWITCH_TOKEN_URL =
    "https://id.twitch.tv/oauth2/token";

const TWITCH_VALIDATE_URL =
    "https://id.twitch.tv/oauth2/validate";

const TWITCH_USERS_URL =
    "https://api.twitch.tv/helix/users";


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const {
    clientId,
    clientSecret,
    redirectUri
} = config.twitch;


/*==============================================================================
    TWITCH SCOPES
==============================================================================*/

export const TWITCH_SCOPES = {
    readChat: "user:read:chat",
    writeChat: "user:write:chat"
};


/*==============================================================================
    REGISTRATION SCOPES
==============================================================================*/

export function getRegistrationScopes(
    registrationType = "user"
) {

    const scopes = [
        TWITCH_SCOPES.readChat
    ];

    if (
        registrationType ===
        "synara"
    ) {
        scopes.push(
            TWITCH_SCOPES.writeChat
        );
    }

    return scopes;
}


/*==============================================================================
    AUTHORIZATION URL
==============================================================================*/

export function createAuthorizationUrl(
    state,
    registrationType = "user"
) {

    const scopes =
        getRegistrationScopes(
            registrationType
        );

    const params =
        new URLSearchParams({
            client_id:
                clientId,

            redirect_uri:
                redirectUri,

            response_type:
                "code",

            scope:
                scopes.join(" "),

            state
        });

    return `${TWITCH_AUTHORIZE_URL}?${params}`;
}


/*==============================================================================
    AUTHORIZATION CODE EXCHANGE
==============================================================================*/

export async function exchangeAuthorizationCode(
    code
) {

    const body =
        new URLSearchParams({
            client_id:
                clientId,

            client_secret:
                clientSecret,

            code,

            grant_type:
                "authorization_code",

            redirect_uri:
                redirectUri
        });

    const response =
        await fetch(
            TWITCH_TOKEN_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        const error =
            new Error(
                "Twitch authorization code exchange failed."
            );

        error.status =
            response.status;

        error.details =
            data;

        throw error;
    }

    return data;
}


/*==============================================================================
    VALIDATE ACCESS TOKEN
==============================================================================*/

export async function validateAccessToken(
    accessToken
) {

    const response =
        await fetch(
            TWITCH_VALIDATE_URL,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `OAuth ${accessToken}`
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        const error =
            new Error(
                "Twitch access token is invalid."
            );

        error.status =
            response.status;

        error.details =
            data;

        throw error;
    }

    return data;
}


/*==============================================================================
    GET AUTHENTICATED USER
==============================================================================*/

export async function getAuthenticatedUser(
    accessToken
) {

    const response =
        await fetch(
            TWITCH_USERS_URL,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,

                    "Client-Id":
                        clientId
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        const error =
            new Error(
                "Failed to retrieve Twitch user."
            );

        error.status =
            response.status;

        error.details =
            data;

        throw error;
    }

    if (
        !Array.isArray(
            data.data
        ) ||
        data.data.length !== 1
    ) {

        throw new Error(
            "Twitch did not return the authenticated user."
        );
    }

    return data.data[0];
}


/*==============================================================================
    REFRESH ACCESS TOKEN
==============================================================================*/

export async function refreshAccessToken(
    refreshToken
) {

    const body =
        new URLSearchParams({
            client_id:
                clientId,

            client_secret:
                clientSecret,

            grant_type:
                "refresh_token",

            refresh_token:
                refreshToken
        });

    const response =
        await fetch(
            TWITCH_TOKEN_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        const error =
            new Error(
                "Twitch access token refresh failed."
            );

        error.status =
            response.status;

        error.details =
            data;

        throw error;
    }

    return data;
}
