/*
 * Name: eventsub.js
 * Author: Tango Hunter
 * Date Created: 8/30/26
 * Description: Twitch EventSub subscription management.
 */

import config from "../configs/config.js";

import {
    getValidAccessToken
} from "./twitch-auth.js";

import {
    createSubscription,
    updateSubscription
} from "../database/twitch-eventsub-repository.js";


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const EVENTSUB_SUBSCRIPTIONS_URL =
    "https://api.twitch.tv/helix/eventsub/subscriptions";


/*==============================================================================
    CREATE SUBSCRIPTION
==============================================================================*/

export async function createEventSubSubscription(
    {
        twitchUserId,
        sessionId,
        type,
        version = "1",
        condition = {},
        existingSubscription = null
    }
) {

    if (
        !twitchUserId
    ) {

        throw new Error(
            "Twitch user ID is required."
        );
    }

    if (
        !sessionId
    ) {

        throw new Error(
            "EventSub session ID is required."
        );
    }

    if (
        !type
    ) {

        throw new Error(
            "EventSub subscription type is required."
        );
    }

    const accessToken =
        await getValidAccessToken(
            twitchUserId
        );

    const response =
        await fetch(
            EVENTSUB_SUBSCRIPTIONS_URL,
            {
                method:
                    "POST",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,

                    "Client-Id":
                        config.twitch.clientId,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        type,
                        version,
                        condition,

                        transport: {
                            method:
                                "websocket",

                            session_id:
                                sessionId
                        }
                    })
            }
        );

    const data =
        await response.json()
            .catch(
                () => null
            );

    if (
        !response.ok
    ) {

        const error =
            new Error(
                "Failed to create Twitch EventSub subscription."
            );

        error.status =
            response.status;

        error.details =
            data;

        throw error;
    }

    const subscription =
        data?.data?.[0];

    if (
        !subscription
    ) {

        throw new Error(
            "Twitch did not return an EventSub subscription."
        );
    }

    if (
        existingSubscription
    ) {

        await updateSubscription({
            id:
                existingSubscription.id,

            subscriptionId:
                subscription.id,

            subscriptionVersion:
                subscription.version,

            condition:
                subscription.condition,

            status:
                subscription.status
        });

    } else {

        await createSubscription({
            twitchUserId,

            subscriptionId:
                subscription.id,

            subscriptionType:
                subscription.type,

            subscriptionVersion:
                subscription.version,

            condition:
                subscription.condition,

            status:
                subscription.status
        });
    }

    console.log(
        `[EventSub] Created ${subscription.type} subscription for ${twitchUserId}.`
    );

    return subscription;
}
