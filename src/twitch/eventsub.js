/*
 * ============================================================================
 * Name: eventsub.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: Twitch EventSub WebSocket connection and subscription manager.
 * ============================================================================
 */

import WebSocket from "ws";

import config from "../configs/config.js";

import {
    getValidAccessToken
} from "./twitch-auth.js";

import {
    createSubscription,
    getSubscriptionsByUser,
    updateSubscription,
    updateSubscriptionStatus,
    deleteSubscription
} from "../database/twitch-eventsub-repository.js";


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const EVENTSUB_URL =
    "wss://eventsub.wss.twitch.tv/ws";

const RECONNECT_DELAY =
    5000;

const connections =
    new Map();


/*==============================================================================
    CONNECTION
==============================================================================*/

export async function connectEventSub(
    twitchUserId
) {

    if (
        connections.has(
            twitchUserId
        )
    ) {
        return connections.get(
            twitchUserId
        );
    }

    const connection = {
        twitchUserId,
        socket: null,
        sessionId: null,
        reconnecting: false,
        intentionallyDisconnected: false,
        subscriptions: new Map()
    };

    connections.set(
        twitchUserId,
        connection
    );

    await openConnection(
        connection
    );

    return connection;
}


/*==============================================================================
    OPEN CONNECTION
==============================================================================*/

async function openConnection(
    connection,
    url = EVENTSUB_URL
) {

    if (
        connection.intentionallyDisconnected
    ) {
        return;
    }

    const socket =
        new WebSocket(
            url
        );

    connection.socket =
        socket;

    return new Promise(
        (
            resolve,
            reject
        ) => {

            let settled =
                false;

            socket.on(
                "open",
                () => {

                    console.log(
                        `EventSub WebSocket connected for ${connection.twitchUserId}.`
                    );
                }
            );

            socket.on(
                "message",
                async data => {

                    try {

                        const message =
                            JSON.parse(
                                data.toString()
                            );

                        await handleMessage(
                            connection,
                            message
                        );

                        if (
                            message.metadata
                                ?.message_type ===
                            "session_welcome" &&
                            !settled
                        ) {

                            settled =
                                true;

                            resolve();
                        }

                    } catch (error) {

                        console.error(
                            "Failed to process EventSub message.",
                            error
                        );

                        if (!settled) {

                            settled =
                                true;

                            reject(
                                error
                            );
                        }
                    }
                }
            );

            socket.on(
                "error",
                error => {

                    console.error(
                        `EventSub WebSocket error for ${connection.twitchUserId}.`,
                        error
                    );

                    if (!settled) {

                        settled =
                            true;

                        reject(
                            error
                        );
                    }
                }
            );

            socket.on(
                "close",
                () => {

                    console.warn(
                        `EventSub WebSocket closed for ${connection.twitchUserId}.`
                    );

                    if (
                        connection.socket ===
                        socket
                    ) {

                        connection.socket =
                            null;
                    }

                    if (
                        !connection.intentionallyDisconnected &&
                        !connection.reconnecting
                    ) {

                        scheduleReconnect(
                            connection
                        );
                    }
                }
            );
        }
    );
}


/*==============================================================================
    HANDLE MESSAGE
==============================================================================*/

async function handleMessage(
    connection,
    message
) {

    const type =
        message.metadata
            ?.message_type;

    switch (type) {

        case "session_welcome":

            await handleWelcome(
                connection,
                message
            );

            break;

        case "session_keepalive":

            break;

        case "session_reconnect":

            await handleReconnect(
                connection,
                message
            );

            break;

        case "notification":

            await handleNotification(
                connection,
                message
            );

            break;

        case "revocation":

            await handleRevocation(
                connection,
                message
            );

            break;

        default:

            console.warn(
                `Unknown EventSub message type: ${type}`
            );
    }
}


/*==============================================================================
    WELCOME
==============================================================================*/

async function handleWelcome(
    connection,
    message
) {

    const session =
        message.payload.session;

    connection.sessionId =
        session.id;

    console.log(
        `EventSub session established for ${connection.twitchUserId}: ${session.id}`
    );

    await restoreSubscriptions(
        connection
    );
}


/*==============================================================================
    RESTORE SUBSCRIPTIONS
==============================================================================*/

async function restoreSubscriptions(
    connection
) {

    const subscriptions =
        await getSubscriptionsByUser(
            connection.twitchUserId
        );

    for (
        const subscription
        of subscriptions
    ) {

        /*
         * A Twitch WebSocket session cannot reuse the old subscription.
         *
         * We therefore create a new Twitch subscription using the stored
         * type, version, and condition.
         */

        if (
            subscription.status ===
            "enabled"
        ) {

            try {

                await subscribeToEvent(
                    connection,
                    {
                        type:
                            subscription.subscription_type,

                        version:
                            subscription.subscription_version,

                        condition:
                            subscription.condition,

                        existingSubscription:
                            subscription
                    }
                );

            } catch (error) {

                console.error(
                    `Failed to restore EventSub subscription ${subscription.subscription_type} for ${connection.twitchUserId}.`,
                    error
                );
            }
        }
    }
}


/*==============================================================================
    SUBSCRIBE
==============================================================================*/

export async function subscribeToEvent(
    connection,
    {
        type,
        version = "1",
        condition = {},
        existingSubscription = null
    }
) {

    if (
        !connection.sessionId
    ) {

        throw new Error(
            "EventSub session is not ready."
        );
    }

    const accessToken =
        await getValidAccessToken(
            connection.twitchUserId
        );

    const response =
        await fetch(
            "https://api.twitch.tv/helix/eventsub/subscriptions",
            {
                method: "POST",

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
                                connection.sessionId
                        }
                    })
            }
        );

    const data =
        await response.json();

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
        data.data?.[0];

    if (!subscription) {

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
            twitchUserId:
                connection.twitchUserId,

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

    connection.subscriptions.set(
        subscription.id,
        subscription
    );

    return subscription;
}


/*==============================================================================
    NOTIFICATION
==============================================================================*/

async function handleNotification(
    connection,
    message
) {

    const subscription =
        message.payload.subscription;

    const event =
        message.payload.event;

    console.log(
        "Twitch EventSub notification:",
        subscription.type
    );

    console.debug(
        "EventSub event:",
        event
    );

    /*
     * Event routing will be connected to the application services next.
     */
}


/*==============================================================================
    REVOCATION
==============================================================================*/

async function handleRevocation(
    connection,
    message
) {

    const subscription =
        message.payload.subscription;

    console.warn(
        `EventSub subscription revoked: ${subscription.id} (${subscription.status})`
    );

    await updateSubscriptionStatus(
        subscription.id,
        subscription.status
    );

    connection.subscriptions.delete(
        subscription.id
    );
}


/*==============================================================================
    RECONNECT
==============================================================================*/

async function handleReconnect(
    connection,
    message
) {

    const reconnectUrl =
        message.payload
            ?.session
            ?.reconnect_url;

    if (
        !reconnectUrl
    ) {

        console.error(
            "Twitch requested EventSub reconnect without a reconnect URL."
        );

        return;
    }

    connection.reconnecting =
        true;

    const newSocket =
        new WebSocket(
            reconnectUrl
        );

    newSocket.on(
        "open",
        () => {

            console.log(
                `EventSub reconnect established for ${connection.twitchUserId}.`
            );
        }
    );

    newSocket.on(
        "message",
        async data => {

            try {

                const nextMessage =
                    JSON.parse(
                        data.toString()
                    );

                const type =
                    nextMessage.metadata
                        ?.message_type;

                if (
                    type ===
                    "session_welcome"
                ) {

                    const oldSocket =
                        connection.socket;

                    connection.socket =
                        newSocket;

                    connection.sessionId =
                        nextMessage.payload
                            .session
                            .id;

                    connection.reconnecting =
                        false;

                    if (
                        oldSocket &&
                        oldSocket !==
                            newSocket
                    ) {

                        oldSocket.close();
                    }

                    console.log(
                        `EventSub session migrated for ${connection.twitchUserId}.`
                    );
                }

                await handleMessage(
                    connection,
                    nextMessage
                );

            } catch (error) {

                console.error(
                    "Failed to process EventSub reconnect message.",
                    error
                );
            }
        }
    );

    newSocket.on(
        "error",
        error => {

            console.error(
                "EventSub reconnect failed.",
                error
            );

            connection.reconnecting =
                false;

            scheduleReconnect(
                connection
            );
        }
    );

    newSocket.on(
        "close",
        () => {

            if (
                connection.socket ===
                newSocket
            ) {

                connection.socket =
                    null;
            }

            if (
                !connection.intentionallyDisconnected &&
                !connection.reconnecting
            ) {

                scheduleReconnect(
                    connection
                );
            }
        }
    );
}


/*==============================================================================
    SCHEDULE RECONNECT
==============================================================================*/

function scheduleReconnect(
    connection
) {

    if (
        connection.reconnecting ||
        connection.intentionallyDisconnected
    ) {
        return;
    }

    connection.reconnecting =
        true;

    setTimeout(
        async () => {

            try {

                connection.reconnecting =
                    false;

                await openConnection(
                    connection
                );

            } catch (error) {

                console.error(
                    `EventSub reconnect failed for ${connection.twitchUserId}.`,
                    error
                );

                connection.reconnecting =
                    false;

                scheduleReconnect(
                    connection
                );
            }
        },
        RECONNECT_DELAY
    );
}


/*==============================================================================
    DISCONNECT
==============================================================================*/

export function disconnectEventSub(
    twitchUserId
) {

    const connection =
        connections.get(
            twitchUserId
        );

    if (!connection) {
        return false;
    }

    connection.intentionallyDisconnected =
        true;

    connection.reconnecting =
        false;

    if (
        connection.socket
    ) {

        connection.socket.close();
    }

    connections.delete(
        twitchUserId
    );

    return true;
}


/*==============================================================================
    EXPORTS
==============================================================================*/

export {
    connections
};
