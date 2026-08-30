/*
 * ============================================================================
 * Name: twitch-eventsub-repository.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: CRUD operations for Twitch EventSub subscriptions.
 * ============================================================================
 */

import config from "../configs/config.js";

const { database } = config;


/*==============================================================================
    CREATE
==============================================================================*/

export async function createSubscription(
    {
        twitchUserId,
        subscriptionId,
        subscriptionType,
        subscriptionVersion,
        condition,
        status
    }
) {

    const result =
        await database.query(
            `
                INSERT INTO
                chat_overlay_twitch_eventsub_subscriptions (
                    twitch_user_id,
                    subscription_id,
                    subscription_type,
                    subscription_version,
                    condition,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5::jsonb,
                    $6
                )
                RETURNING *
            `,
            [
                twitchUserId,
                subscriptionId,
                subscriptionType,
                subscriptionVersion,
                JSON.stringify(
                    condition || {}
                ),
                status
            ]
        );

    return result.rows[0];
}


/*==============================================================================
    READ ONE
==============================================================================*/

export async function getSubscription(
    subscriptionId
) {

    const result =
        await database.query(
            `
                SELECT *
                FROM chat_overlay_twitch_eventsub_subscriptions
                WHERE subscription_id = $1
                LIMIT 1
            `,
            [
                subscriptionId
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    READ USER SUBSCRIPTIONS
==============================================================================*/

export async function getSubscriptionsByUser(
    twitchUserId
) {

    const result =
        await database.query(
            `
                SELECT *
                FROM chat_overlay_twitch_eventsub_subscriptions
                WHERE twitch_user_id = $1
                ORDER BY id
            `,
            [
                twitchUserId
            ]
        );

    return result.rows;
}


/*==============================================================================
    READ USER + TYPE
==============================================================================*/

export async function getSubscriptionByType(
    twitchUserId,
    subscriptionType
) {

    const result =
        await database.query(
            `
                SELECT *
                FROM chat_overlay_twitch_eventsub_subscriptions
                WHERE twitch_user_id = $1
                  AND subscription_type = $2
                LIMIT 1
            `,
            [
                twitchUserId,
                subscriptionType
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    UPDATE SUBSCRIPTION
==============================================================================*/

export async function updateSubscription(
    {
        id,
        subscriptionId,
        subscriptionVersion,
        condition,
        status
    }
) {

    const result =
        await database.query(
            `
                UPDATE
                    chat_overlay_twitch_eventsub_subscriptions
                SET
                    subscription_id = $1,
                    subscription_version = $2,
                    condition = $3::jsonb,
                    status = $4,
                    updated_at = NOW()
                WHERE id = $5
                RETURNING *
            `,
            [
                subscriptionId,
                subscriptionVersion,
                JSON.stringify(
                    condition || {}
                ),
                status,
                id
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    UPDATE STATUS
==============================================================================*/

export async function updateSubscriptionStatus(
    subscriptionId,
    status
) {

    const result =
        await database.query(
            `
                UPDATE
                    chat_overlay_twitch_eventsub_subscriptions
                SET
                    status = $1,
                    updated_at = NOW()
                WHERE subscription_id = $2
                RETURNING *
            `,
            [
                status,
                subscriptionId
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    DELETE
==============================================================================*/

export async function deleteSubscription(
    subscriptionId
) {

    const result =
        await database.query(
            `
                DELETE FROM
                    chat_overlay_twitch_eventsub_subscriptions
                WHERE subscription_id = $1
                RETURNING *
            `,
            [
                subscriptionId
            ]
        );

    return result.rows[0] || null;
}


/*==============================================================================
    DELETE USER SUBSCRIPTIONS
==============================================================================*/

export async function deleteSubscriptionsByUser(
    twitchUserId
) {

    const result =
        await database.query(
            `
                DELETE FROM
                    chat_overlay_twitch_eventsub_subscriptions
                WHERE twitch_user_id = $1
                RETURNING *
            `,
            [
                twitchUserId
            ]
        );

    return result.rows;
}
