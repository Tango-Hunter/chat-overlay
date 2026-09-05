/*
 * Name: eventsub-handler.js
 * Author: Tango Hunter
 * Date Created 9/5/26
 * Description: Processes Twitch EventSub notifications.
 */


/*==============================================================================
    EVENTSUB NOTIFICATION
==============================================================================*/

export async function handleEventSubNotification(
    message
) {

    const subscription =
        message.payload
            ?.subscription;

    const event =
        message.payload
            ?.event;

    if (
        !subscription ||
        !event
    ) {

        throw new Error(
            "Invalid Twitch EventSub notification."
        );
    }

    console.log(
        `[EventSub Handler] Received ${subscription.type}.`
    );

    switch (
        subscription.type
    ) {

        case "channel.chat.message":

            return handleChatMessage(
                subscription,
                event,
                message.metadata
            );

        default:

            console.warn(
                `[EventSub Handler] No handler exists for ${subscription.type}.`
            );

            return {
                handled: false,
                subscription,
                event
            };
    }
}


/*==============================================================================
    CHANNEL CHAT MESSAGE
==============================================================================*/

function handleChatMessage(
    subscription,
    event,
    metadata
) {

    const chatMessage = {
        eventType:
            subscription.type,

        eventVersion:
            subscription.version,

        eventId:
            metadata?.message_id ||
            null,

        subscriptionId:
            subscription.id,

        broadcasterId:
            event.broadcaster_user_id,

        broadcasterLogin:
            event.broadcaster_user_login,

        broadcasterDisplayName:
            event.broadcaster_user_name,

        chatterId:
            event.chatter_user_id,

        chatterLogin:
            event.chatter_user_login,

        chatterDisplayName:
            event.chatter_user_name,

        messageId:
            event.message_id,

        messageText:
            event.message?.text ||
            "",

        message:
            event.message,

        color:
            event.color,

        badges:
            event.badges ||
            [],

        emotes:
            event.message?.fragments
                ?.filter(
                    fragment =>
                        fragment.type ===
                        "emote"
                ) ||
            [],

        receivedAt:
            new Date()
                .toISOString()
    };

    console.log(
        `[EventSub Handler] ${chatMessage.broadcasterDisplayName} | ${chatMessage.chatterDisplayName}: ${chatMessage.messageText}`
    );

    return {
        handled: true,
        type:
            "channel.chat.message",

        event:
            chatMessage
    };
}
