/*
 * ============================================================================
 * Name: registered-users-repository.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: CRUD operations for registered broadcaster accounts.
 * ============================================================================
 */

import config from "../configs/config.js";

const { database } = config;


/*==============================================================================
    CREATE USER
==============================================================================*/

export async function createUser(
    {
        username,
        passwordHash,
        twitchUserId,
        twitchUsername,
        twitchDisplayName,
        twitchAccessToken,
        twitchRefreshToken,
        twitchScopes = []
    }
) {

    const result =
        await database.query(
            `
                INSERT INTO
                chat_overlay_registered_users (
                    username,
                    password_hash,
                    twitch_user_id,
                    twitch_username,
                    twitch_display_name,
                    twitch_access_token,
                    twitch_refresh_token,
                    twitch_scopes
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8
                )
                RETURNING
                    id,
                    username,
                    twitch_user_id,
                    twitch_username,
                    twitch_display_name,
                    twitch_scopes,
                    enabled,
                    created_at,
                    updated_at
            `,
            [
                username,
                passwordHash,
                twitchUserId,
                twitchUsername,
                twitchDisplayName,
                twitchAccessToken,
                twitchRefreshToken,
                twitchScopes
            ]
        );

    return result.rows[0];
}


/*==============================================================================
    GET USER BY ID
==============================================================================*/

export async function getUserById(
    id
) {

    const result =
        await database.query(
            `
                SELECT *
                FROM chat_overlay_registered_users
                WHERE id = $1
                LIMIT 1
            `,
            [
                id
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    GET USER BY USERNAME
==============================================================================*/

export async function getUserByUsername(
    username
) {

    const result =
        await database.query(
            `
                SELECT *
                FROM chat_overlay_registered_users
                WHERE username = $1
                LIMIT 1
            `,
            [
                username
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    GET USER BY TWITCH ID
==============================================================================*/

export async function getUserByTwitchId(
    twitchUserId
) {

    const result =
        await database.query(
            `
                SELECT *
                FROM chat_overlay_registered_users
                WHERE twitch_user_id = $1
                LIMIT 1
            `,
            [
                twitchUserId
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    GET ALL USERS
==============================================================================*/

export async function getUsers() {

    const result =
        await database.query(
            `
                SELECT
                    id,
                    username,
                    twitch_user_id,
                    twitch_username,
                    twitch_display_name,
                    twitch_scopes,
                    enabled,
                    created_at,
                    updated_at
                FROM chat_overlay_registered_users
                ORDER BY id
            `
        );

    return result.rows;
}


/*==============================================================================
    UPDATE USER
==============================================================================*/

export async function updateUser(
    id,
    updates
) {

    if (
        !updates ||
        typeof updates !==
            "object"
    ) {
        throw new TypeError(
            "User updates must be provided as an object."
        );
    }

    const allowedFields = {
        username:
            "username",

        passwordHash:
            "password_hash",

        twitchUserId:
            "twitch_user_id",

        twitchUsername:
            "twitch_username",

        twitchDisplayName:
            "twitch_display_name",

        twitchAccessToken:
            "twitch_access_token",

        twitchRefreshToken:
            "twitch_refresh_token",

        twitchScopes:
            "twitch_scopes",

        enabled:
            "enabled"
    };

    const entries =
        Object.entries(
            updates
        ).filter(
            (
                [
                    key
                ]
            ) =>
                Object.hasOwn(
                    allowedFields,
                    key
                )
        );

    if (
        entries.length ===
        0
    ) {
        throw new TypeError(
            "No valid user fields were provided for update."
        );
    }

    const values = [];

    const assignments =
        entries.map(
            (
                [
                    key,
                    value
                ],
                index
            ) => {

                values.push(
                    value
                );

                return (
                    `${allowedFields[key]} = $${index + 1}`
                );
            }
        );

    values.push(
        id
    );

    const idParameter =
        values.length;

    const query = `
        UPDATE
            chat_overlay_registered_users
        SET
            ${assignments.join(
                ",\n            "
            )},
            updated_at = NOW()
        WHERE id = $${idParameter}
        RETURNING
            id,
            username,
            twitch_user_id,
            twitch_username,
            twitch_display_name,
            twitch_scopes,
            enabled,
            created_at,
            updated_at;
    `;

    const result =
        await database.query(
            query,
            values
        );

    return result.rows[0] || null;
}


/*==============================================================================
    UPDATE PASSWORD
==============================================================================*/

export async function updateUserPassword(
    id,
    passwordHash
) {

    return updateUser(
        id,
        {
            passwordHash
        }
    );
}


/*==============================================================================
    ENABLE / DISABLE USER
==============================================================================*/

export async function setUserEnabled(
    id,
    enabled
) {

    return updateUser(
        id,
        {
            enabled:
                Boolean(enabled)
        }
    );
}


/*==============================================================================
    DELETE USER
==============================================================================*/

export async function deleteUser(
    id
) {

    const result =
        await database.query(
            `
                DELETE FROM
                    chat_overlay_registered_users
                WHERE id = $1
                RETURNING
                    id,
                    username,
                    twitch_user_id,
                    twitch_username,
                    twitch_display_name,
                    twitch_scopes,
                    enabled,
                    created_at,
                    updated_at
            `,
            [
                id
            ]
        );

    return result.rows[0] || null;
}
