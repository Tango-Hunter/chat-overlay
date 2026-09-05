/*
 * Name: eventsub-websocket-manager.js
 * Author: Tango Hunter
 * Date Created: 9/5/26
 * Description: Persistent Twitch EventSub WebSocket connection manager.
 */

import WebSocket from "ws";

import {
    handleEventSubNotification
} from "./eventsub-handler.js";

import {
    updateSubscriptionStatus
} from "../database/twitch-eventsub-repository.js";


/*==============================================================================
    CONFIGURATION
==============================================================================*/

const EVENTSUB_URL =
    "wss://eventsub.wss.twitch.tv/ws";

const RECONNECT_DELAY =
    5000;

const KEEPALIVE_BUFFER =
    5000;


/*==============================================================================
    CONNECTION STATE
==============================================================================*/

const connection = {
    socket: null,
    sessionId: null,
    keepaliveTimeout: null,
    lastMessageAt: null,
    intentionallyDisconnected: false,
    reconnecting: false,
    reconnectTimer: null,
    keepaliveTimer: null
};


/*==============================================================================
    CONNECT
==============================================================================*/

export async function connectEventSubWebSocket() {

    if (
        connection.socket &&
        connection.socket.readyState ===
        WebSocket.OPEN
    ) {
        return connection;
    }

    connection.intentionallyDisconnected =
        false;

    await openConnection(
        EVENTSUB_URL
    );

    return connection;
}


/*==============================================================================
    OPEN CONNECTION
==============================================================================*/

async function openConnection(
    url
) {

    const socket =
        new WebSocket(
            url
        );

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
                        "[EventSub WebSocket] Connected to Twitch."
                    );
                }
            );

            socket.on(
                "message",
                async data => {

                    try {

                        connection.lastMessageAt =
                            Date.now();

                        const message =
                            JSON.parse(
                                data.toString()
                            );

                        await handleMessage(
                            socket,
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

                            resolve(
                                connection
                            );
                        }

                    } catch (error) {

                        console.error(
                            "[EventSub WebSocket] Failed to process message.",
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
                        "[EventSub WebSocket] Socket error.",
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
                (
                    code,
                    reason
                ) => {

                    handleSocketClose(
                        socket,
                        code,
                        reason
                    );
                }
            );
        }
    );
}


/*==============================================================================
    HANDLE MESSAGE
==============================================================================*/

async function handleMessage(
    socket,
    message
) {

    const type =
        message.metadata
            ?.message_type;

    switch (type) {

        case "session_welcome":

            await handleWelcome(
                socket,
                message
            );

            break;

        case "session_keepalive":

            handleKeepalive();

            break;

        case "session_reconnect":

            await handleReconnect(
                socket,
                message
            );

            break;

        case "notification":

            await handleNotification(
                message
            );

            break;

        case "revocation":

            await handleRevocation(
                message
            );

            break;

        default:

            console.warn(
                `[EventSub WebSocket] Unknown message type: ${type}`
            );
    }
}


/*==============================================================================
    SESSION WELCOME
==============================================================================*/

async function handleWelcome(
    socket,
    message
) {

    const session =
        message.payload
            ?.session;

    if (
        !session?.id
    ) {

        throw new Error(
            "Twitch EventSub welcome message did not include a session ID."
        );
    }

    const previousSocket =
        connection.socket;

    connection.socket =
        socket;

    connection.sessionId =
        session.id;

    connection.keepaliveTimeout =
        session.keepalive_timeout_seconds ||
        null;

    connection.lastMessageAt =
        Date.now();

    connection.reconnecting =
        false;

    startKeepaliveMonitor();

    console.log(
        `[EventSub WebSocket] Session established: ${connection.sessionId}`
    );

    if (
        previousSocket &&
        previousSocket !== socket &&
        previousSocket.readyState ===
        WebSocket.OPEN
    ) {

        previousSocket.close();

        console.log(
            "[EventSub WebSocket] Previous connection closed after session migration."
        );
    }
}


/*==============================================================================
    KEEPALIVE
==============================================================================*/

function handleKeepalive() {

    console.debug(
        "[EventSub WebSocket] Keepalive received."
    );
}


/*==============================================================================
    KEEPALIVE MONITOR
==============================================================================*/

function startKeepaliveMonitor() {

    stopKeepaliveMonitor();

    if (
        !connection.keepaliveTimeout
    ) {
        return;
    }

    const timeout =
        (
            connection.keepaliveTimeout *
            1000
        ) +
        KEEPALIVE_BUFFER;

    connection.keepaliveTimer =
        setInterval(
            () => {

                if (
                    !connection.lastMessageAt
                ) {
                    return;
                }

                const elapsed =
                    Date.now() -
                    connection.lastMessageAt;

                if (
                    elapsed <=
                    timeout
                ) {
                    return;
                }

                console.warn(
                    "[EventSub WebSocket] Keepalive timeout detected."
                );

                if (
                    connection.socket
                ) {

                    connection.socket.terminate();
                }
            },
            Math.max(
                5000,
                Math.floor(
                    timeout / 2
                )
            )
        );
}


/*==============================================================================
    STOP KEEPALIVE MONITOR
==============================================================================*/

function stopKeepaliveMonitor() {

    if (
        connection.keepaliveTimer
    ) {

        clearInterval(
            connection.keepaliveTimer
        );

        connection.keepaliveTimer =
            null;
    }
}


/*==============================================================================
    RECONNECT REQUEST
==============================================================================*/

async function handleReconnect(
    socket,
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
            "[EventSub WebSocket] Twitch requested a reconnect without providing a URL."
        );

        return;
    }

    if (
        connection.reconnecting
    ) {
        return;
    }

    connection.reconnecting =
        true;

    console.log(
        "[EventSub WebSocket] Twitch requested a session migration."
    );

    try {

        await openConnection(
            reconnectUrl
        );

    } catch (error) {

        console.error(
            "[EventSub WebSocket] Twitch reconnect failed.",
            error
        );

        connection.reconnecting =
            false;

        if (
            socket ===
            connection.socket
        ) {

            scheduleReconnect();
        }
    }
}


/*==============================================================================
    NOTIFICATION
==============================================================================*/

async function handleNotification(
    message
) {

    await handleEventSubNotification(
        message
    );
}


/*==============================================================================
    REVOCATION
==============================================================================*/

async function handleRevocation(
    message
) {

    const subscription =
        message.payload
            ?.subscription;

    if (
        !subscription?.id
    ) {

        console.warn(
            "[EventSub WebSocket] Received a revocation without a subscription ID."
        );

        return;
    }

    console.warn(
        `[EventSub WebSocket] Subscription revoked: ${subscription.id} (${subscription.status})`
    );

    await updateSubscriptionStatus(
        subscription.id,
        subscription.status
    );
}


/*==============================================================================
    SOCKET CLOSE
==============================================================================*/

function handleSocketClose(
    socket,
    code,
    reason
) {

    const reasonText =
        reason?.toString() ||
        "No reason provided.";

    console.warn(
        `[EventSub WebSocket] Connection closed. Code: ${code}. Reason: ${reasonText}`
    );

    if (
        connection.socket ===
        socket
    ) {

        connection.socket =
            null;

        connection.sessionId =
            null;

        stopKeepaliveMonitor();
    }

    if (
        connection.intentionallyDisconnected
    ) {
        return;
    }

    if (
        connection.reconnecting
    ) {
        return;
    }

    scheduleReconnect();
}


/*==============================================================================
    SCHEDULE RECONNECT
==============================================================================*/

function scheduleReconnect() {

    if (
        connection.intentionallyDisconnected ||
        connection.reconnectTimer
    ) {
        return;
    }

    connection.reconnecting =
        true;

    console.log(
        `[EventSub WebSocket] Reconnecting in ${RECONNECT_DELAY / 1000} seconds.`
    );

    connection.reconnectTimer =
        setTimeout(
            async () => {

                connection.reconnectTimer =
                    null;

                connection.reconnecting =
                    false;

                try {

                    await connectEventSubWebSocket();

                } catch (error) {

                    console.error(
                        "[EventSub WebSocket] Reconnection attempt failed.",
                        error
                    );

                    connection.reconnecting =
                        false;

                    scheduleReconnect();
                }
            },
            RECONNECT_DELAY
        );
}


/*==============================================================================
    DISCONNECT
==============================================================================*/

export function disconnectEventSubWebSocket() {

    connection.intentionallyDisconnected =
        true;

    connection.reconnecting =
        false;

    connection.sessionId =
        null;

    stopKeepaliveMonitor();

    if (
        connection.reconnectTimer
    ) {

        clearTimeout(
            connection.reconnectTimer
        );

        connection.reconnectTimer =
            null;
    }

    if (
        connection.socket
    ) {

        connection.socket.close();

        connection.socket =
            null;
    }

    console.log(
        "[EventSub WebSocket] Disconnected intentionally."
    );
}


/*==============================================================================
    GET SESSION ID
==============================================================================*/

export function getEventSubSessionId() {

    return connection.sessionId;
}


/*==============================================================================
    GET CONNECTION STATUS
==============================================================================*/

export function getEventSubConnectionStatus() {

    return {
        connected:
            connection.socket
                ?.readyState ===
            WebSocket.OPEN,

        sessionId:
            connection.sessionId,

        reconnecting:
            connection.reconnecting,

        lastMessageAt:
            connection.lastMessageAt,

        keepaliveTimeout:
            connection.keepaliveTimeout
    };
}
