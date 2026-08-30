/*
 * ============================================================================
 * Name: twitch-auth.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: Twitch OAuth token encryption, storage, validation, and refresh.
 * ============================================================================
 */

import crypto from "node:crypto";

import config from "../configs/config.js";

const { database } = config;

import {
    validateAccessToken,
    refreshAccessToken
} from "./twitch-api.js";


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const encryptionKey =
    getEncryptionKey();

const refreshOperations =
    new Map();


/*==============================================================================
    ENCRYPTION KEY
==============================================================================*/

function getEncryptionKey() {

    const value =
        config.twitch.tokenEncryptionKey;

    if (!value) {
        throw new Error(
            "TWITCH_TOKEN_ENCRYPTION_KEY is not configured."
        );
    }

    if (
        /^[0-9a-fA-F]{64}$/.test(
            value
        )
    ) {

        return Buffer.from(
            value,
            "hex"
        );
    }

    const key =
        Buffer.from(
            value,
            "base64"
        );

    if (
        key.length !==
        32
    ) {

        throw new Error(
            "TWITCH_TOKEN_ENCRYPTION_KEY must represent exactly 32 bytes."
        );
    }

    return key;
}


/*==============================================================================
    TOKEN ENCRYPTION
==============================================================================*/

export function encryptToken(
    token
) {

    if (
        typeof token !==
        "string" ||
        !token
    ) {
        throw new Error(
            "Cannot encrypt an empty Twitch token."
        );
    }

    const iv =
        crypto.randomBytes(
            12
        );

    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            encryptionKey,
            iv
        );

    const encrypted =
        Buffer.concat([
            cipher.update(
                token,
                "utf8"
            ),
            cipher.final()
        ]);

    const authTag =
        cipher.getAuthTag();

    return [
        iv.toString("base64"),
        authTag.toString("base64"),
        encrypted.toString("base64")
    ].join(".");
}


/*==============================================================================
    TOKEN DECRYPTION
==============================================================================*/

export function decryptToken(
    value
) {

    const [
        ivEncoded,
        authTagEncoded,
        encryptedEncoded
    ] =
        value.split(".");

    if (
        !ivEncoded ||
        !authTagEncoded ||
        !encryptedEncoded
    ) {
        throw new Error(
            "Invalid encrypted Twitch token."
        );
    }

    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            encryptionKey,
            Buffer.from(
                ivEncoded,
                "base64"
            )
        );

    decipher.setAuthTag(
        Buffer.from(
            authTagEncoded,
            "base64"
        )
    );

    return Buffer.concat([
        decipher.update(
            Buffer.from(
                encryptedEncoded,
                "base64"
            )
        ),
        decipher.final()
    ]).toString("utf8");
}


/*==============================================================================
    STORE INITIAL AUTHORIZATION
==============================================================================*/

export async function storeAuthorization(
    twitchUserId,
    authorization
) {

    const accessToken =
        encryptToken(
            authorization.accessToken
        );

    const refreshToken =
        encryptToken(
            authorization.refreshToken
        );

    const scopes =
        Array.isArray(
            authorization.scopes
        )
            ? authorization.scopes
            : [];

    await database.query(
        `
            UPDATE chat_overlay_registered_users
            SET
                twitch_access_token = $1,
                twitch_refresh_token = $2,
                twitch_scopes = $3,
                updated_at = NOW()
            WHERE twitch_user_id = $4
        `,
        [
            accessToken,
            refreshToken,
            scopes,
            twitchUserId
        ]
    );

    return {
        twitchUserId,
        scopes
    };
}


/*==============================================================================
    LOAD STORED AUTHORIZATION
==============================================================================*/

async function getStoredTokens(
    twitchUserId
) {

    const result =
        await database.query(
            `
                SELECT
                    twitch_access_token,
                    twitch_refresh_token,
                    twitch_scopes
                FROM chat_overlay_registered_users
                WHERE twitch_user_id = $1
                  AND enabled = TRUE
                LIMIT 1
            `,
            [
                twitchUserId
            ]
        );

    if (
        result.rows.length !==
        1
    ) {

        throw new Error(
            "No enabled Twitch authorization exists for this user."
        );
    }

    return result.rows[0];
}


/*==============================================================================
    STORE REFRESHED TOKENS
==============================================================================*/

async function storeRefreshedTokens(
    twitchUserId,
    tokenData,
    previousRefreshToken
) {

    const accessToken =
        encryptToken(
            tokenData.access_token
        );

    const refreshToken =
        encryptToken(
            tokenData.refresh_token ||
            previousRefreshToken
        );

    const scopes =
        Array.isArray(
            tokenData.scope
        )
            ? tokenData.scope
            : null;

    if (scopes) {

        await database.query(
            `
                UPDATE chat_overlay_registered_users
                SET
                    twitch_access_token = $1,
                    twitch_refresh_token = $2,
                    twitch_scopes = $3,
                    updated_at = NOW()
                WHERE twitch_user_id = $4
            `,
            [
                accessToken,
                refreshToken,
                scopes,
                twitchUserId
            ]
        );

        return {
            accessToken:
                tokenData.access_token,

            scopes
        };
    }

    await database.query(
        `
            UPDATE chat_overlay_registered_users
            SET
                twitch_access_token = $1,
                twitch_refresh_token = $2,
                updated_at = NOW()
            WHERE twitch_user_id = $3
        `,
        [
            accessToken,
            refreshToken,
            twitchUserId
        ]
    );

    return {
        accessToken:
            tokenData.access_token
    };
}


/*==============================================================================
    REFRESH USER TOKEN
==============================================================================*/

async function refreshUserToken(
    twitchUserId,
    refreshToken
) {

    const existing =
        refreshOperations.get(
            twitchUserId
        );

    if (existing) {
        return existing;
    }

    const operation =
        (async () => {

            const tokenData =
                await refreshAccessToken(
                    refreshToken
                );

            return storeRefreshedTokens(
                twitchUserId,
                tokenData,
                refreshToken
            );
        })();

    refreshOperations.set(
        twitchUserId,
        operation
    );

    try {
        return await operation;

    } finally {

        refreshOperations.delete(
            twitchUserId
        );
    }
}


/*==============================================================================
    GET VALID ACCESS TOKEN
==============================================================================*/

export async function getValidAccessToken(
    twitchUserId
) {

    const stored =
        await getStoredTokens(
            twitchUserId
        );

    const accessToken =
        decryptToken(
            stored.twitch_access_token
        );

    try {

        await validateAccessToken(
            accessToken
        );

        return accessToken;

    } catch (error) {

        if (
            error.status !==
            401
        ) {
            throw error;
        }
    }

    const refreshToken =
        decryptToken(
            stored.twitch_refresh_token
        );

    const refreshed =
        await refreshUserToken(
            twitchUserId,
            refreshToken
        );

    return refreshed.accessToken;
}


/*==============================================================================
    GET STORED SCOPES
==============================================================================*/

export async function getTwitchScopes(
    twitchUserId
) {

    const result =
        await database.query(
            `
                SELECT twitch_scopes
                FROM chat_overlay_registered_users
                WHERE twitch_user_id = $1
                  AND enabled = TRUE
                LIMIT 1
            `,
            [
                twitchUserId
            ]
        );

    if (
        result.rows.length !==
        1
    ) {
        return [];
    }

    return (
        result.rows[0].twitch_scopes ||
        []
    );
}
