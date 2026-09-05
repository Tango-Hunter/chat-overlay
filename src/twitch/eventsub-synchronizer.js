/*
 * ============================================================================
 * Name: eventsub-synchronizer.js
 * Author: Tango Hunter
 * Date Created: 9/5/26
 * Description: Synchronizes required Twitch EventSub subscriptions with the
 *              active EventSub WebSocket session.
 * ============================================================================
 */

import {
    getEnabledTwitchUsers
} from "../database/registered-users-repository.js";

import {
    getSubscriptionByType
} from "../database/twitch-eventsub-repository.js";

import {
    createEventSubSubscription
} from "./eventsub.js";


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const CHAT_MESSAGE_SUBSCRIPTION = {
    type:
        "channel.chat.message",

    version:
        "1",

    requiredScope:
        "user:read:chat"
};


/*==============================================================================
    SYNCHRONIZE EVENTSUB SUBSCRIPTIONS
==============================================================================*/

export async function synchronizeEventSubSubscriptions(
    sessionId
) {

    if (
        !sessionId
    ) {

        throw new Error(
            "An EventSub session ID is required for synchronization."
        );
    }

    const users =
        await getEnabledTwitchUsers();

    console.log(
        `[EventSub Synchronizer] Synchronizing ${users.length} enabled user(s).`
    );

    const results = [];

    for (
        const user of users
    ) {

        const result =
            await synchronizeUserSubscriptions(
                user,
                sessionId
            );

        results.push(
            result
        );
    }

    return results;
}


/*==============================================================================
    SYNCHRONIZE USER SUBSCRIPTIONS
==============================================================================*/

async function synchronizeUserSubscriptions(
    user,
    sessionId
) {

    const twitchUserId =
        user.twitch_user_id;

    const scopes =
        Array.isArray(
            user.twitch_scopes
        )
            ? user.twitch_scopes
            : [];

    const result = {
        twitchUserId,
        created: [],
        skipped: [],
        failed: []
    };

    if (
        !twitchUserId
    ) {

        console.warn(
            "[EventSub Synchronizer] Skipping user without a Twitch user ID."
        );

        result.skipped.push(
            "missing_twitch_user_id"
        );

        return result;
    }

    if (
        !scopes.includes(
            CHAT_MESSAGE_SUBSCRIPTION.requiredScope
        )
    ) {

        console.log(
            `[EventSub Synchronizer] Skipping ${twitchUserId}: missing ${CHAT_MESSAGE_SUBSCRIPTION.requiredScope}.`
        );

        result.skipped.push(
            CHAT_MESSAGE_SUBSCRIPTION.type
        );

        return result;
    }

    try {

        const existingSubscription =
            await getSubscriptionByType(
                twitchUserId,
                CHAT_MESSAGE_SUBSCRIPTION.type
            );

        const subscription =
            await createEventSubSubscription({
                twitchUserId,
                sessionId,

                type:
                    CHAT_MESSAGE_SUBSCRIPTION.type,

                version:
                    CHAT_MESSAGE_SUBSCRIPTION.version,

                condition: {
                    broadcaster_user_id:
                        twitchUserId,

                    user_id:
                        twitchUserId
                },

                existingSubscription
            });

        result.created.push(
            subscription.type
        );

        console.log(
            `[EventSub Synchronizer] ${subscription.type} synchronized for ${twitchUserId}.`
        );

    } catch (error) {

        console.error(
            `[EventSub Synchronizer] Failed to synchronize channel.chat.message for ${twitchUserId}.`,
            error
        );

        result.failed.push({
            type:
                CHAT_MESSAGE_SUBSCRIPTION.type,

            error:
                error.message
        });
    }

    return result;
}
