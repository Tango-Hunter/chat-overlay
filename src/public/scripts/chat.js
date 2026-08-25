/**
 * Title: chat.js
 * Author: Tango Hunter
 * Date Created: 8/24/26
 * Description: Digital Terminal Chat Overlay Script
 *
 * This file currently handles the visual chat behavior only.
 * Twitch connectivity will be added later.
 *
 * The centralized configuration file will be added separately.
 */

const CHAT = {
    typingSpeed: 35,
    maximumMessages: 9
};

/*
 * Add a chat message to the terminal.
 *
 * Expected message object:
 *
 * {
 *     username: "ViewerName",
 *     avatar: "https://example.com/avatar.png",
 *     message: "Hello Tango!",
 *     color: "#00ff78"
 * }
 */

function addChatMessage(data = {}) {
    const chat = document.getElementById("chat");

    if (!chat) {
        console.error("Chat container was not found.");
        return;
    }

    const username = String(data.username || "Unknown");
    const message = String(data.message || "");
    const avatar = String(data.avatar || "");
    const color = data.color || "#00ff78";

    /*
     * Create message container.
     */
    const messageElement = document.createElement("article");
    messageElement.className = "chat-message";

    /*
     * Create header.
     */
    const header = document.createElement("div");
    header.className = "chat-header";

    /*
     * Create avatar.
     */
    const avatarElement = createAvatar(username, avatar);

    /*
     * Create username.
     */
    const usernameElement = document.createElement("span");
    usernameElement.className = "chat-username";
    usernameElement.textContent = username;
    usernameElement.style.color = color;

    header.appendChild(avatarElement);
    header.appendChild(usernameElement);

    /*
     * Create message body.
     */
    const body = document.createElement("div");
    body.className = "chat-body";

    const prompt = document.createElement("span");
    prompt.className = "chat-prompt";
    prompt.textContent = ">";

    const textElement = document.createElement("span");
    textElement.className = "chat-text";

    const cursor = document.createElement("span");
    cursor.className = "chat-cursor";
    cursor.setAttribute("aria-hidden", "true");

    body.appendChild(prompt);
    body.appendChild(textElement);
    body.appendChild(cursor);

    messageElement.appendChild(header);
    messageElement.appendChild(body);

    /*
     * Add the message to the terminal.
     */
    chat.appendChild(messageElement);

    /*
     * Remove the oldest messages when the history exceeds
     * the configured maximum.
     */
    while (chat.children.length > CHAT.maximumMessages) {
        chat.removeChild(chat.firstElementChild);
    }

    /*
     * Start the typewriter effect after the message has
     * entered the DOM.
     */
    typeMessage(
        textElement,
        message,
        CHAT.typingSpeed,
        cursor
    );

    return messageElement;
}

/*
 * Create a viewer avatar.
 *
 * If an avatar URL is unavailable or fails to load, the
 * viewer's first initial is displayed instead.
 */
function createAvatar(username, avatarURL) {
    if (!avatarURL) {
        return createAvatarFallback(username);
    }

    const avatar = document.createElement("img");

    avatar.className = "chat-avatar";
    avatar.src = avatarURL;
    avatar.alt = "";

    avatar.addEventListener("error", () => {
        avatar.replaceWith(createAvatarFallback(username));
    }, { once: true });

    return avatar;
}

function createAvatarFallback(username) {
    const fallback = document.createElement("span");

    fallback.className = "chat-avatar-fallback";

    fallback.textContent =
        username.charAt(0).toUpperCase();

    return fallback;
}

/*
 * Type the message one character at a time.
 *
 * The cursor remains visible and blinking until the final
 * character has been written.
 */
function typeMessage(textElement, message, speed, cursor) {
    let characterIndex = 0;

    function typeNextCharacter() {
        if (characterIndex >= message.length) {
            cursor.classList.add("finished");
            return;
        }

        textElement.textContent +=
            message.charAt(characterIndex);

        characterIndex++;

        window.setTimeout(
            typeNextCharacter,
            speed
        );
    }

    typeNextCharacter();
}

/*
 * Temporary browser-console test helper.
 *
 * This lets us test the overlay before Twitch integration
 * exists.
 *
 * Example:
 *
 * addChatMessage({
 *     username: "PixelGhost",
 *     message: "Hello Tango!",
 *     color: "#00ff78"
 * });
 */

window.addChatMessage = addChatMessage;
