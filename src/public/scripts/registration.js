/*
 * ============================================================================
 * Name: registration.js
 * Author: Tango Hunter
 * Date: 8/30/26
 * Description: Broadcaster account registration workflow.
 * ============================================================================
 */

const params =
    new URLSearchParams(
        window.location.search
    );

const token =
    params.get(
        "token"
    );

const oauthState =
    params.get(
        "oauth"
    );


/*==============================================================================
    ELEMENTS
==============================================================================*/

const description =
    document.getElementById(
        "registration-description"
    );

const invalidState =
    document.getElementById(
        "invalid-state"
    );

const invalidMessage =
    document.getElementById(
        "invalid-message"
    );

const registrationForm =
    document.getElementById(
        "registration-form"
    );

const connectTwitchButton =
    document.getElementById(
        "connect-twitch-button"
    );

const twitchState =
    document.getElementById(
        "twitch-state"
    );

const twitchMessage =
    document.getElementById(
        "twitch-message"
    );

const completionState =
    document.getElementById(
        "completion-state"
    );

const completionMessage =
    document.getElementById(
        "completion-message"
    );

const completeRegistrationButton =
    document.getElementById(
        "complete-registration-button"
    );

const successState =
    document.getElementById(
        "success-state"
    );

const successDetails =
    document.getElementById(
        "success-details"
    );

const status =
    document.getElementById(
        "status"
    );


/*==============================================================================
    STATUS
==============================================================================*/

function showStatus(
    message,
    type = "success"
) {

    status.textContent =
        message;

    status.className =
        `status ${type} show`;

    setTimeout(
        () => {

            status.classList.remove(
                "show"
            );

        },
        5000
    );
}


/*==============================================================================
    SHOW INVALID
==============================================================================*/

function showInvalid(
    message
) {

    registrationForm.style.display =
        "none";

    twitchState.style.display =
        "none";

    completionState.style.display =
        "none";

    successState.style.display =
        "none";

    invalidMessage.textContent =
        message;

    invalidState.style.display =
        "block";
}


/*==============================================================================
    VALIDATE LINK
==============================================================================*/

async function validateRegistrationLink() {

    if (!token) {

        showInvalid(
            "No registration token was provided."
        );

        return null;
    }

    try {

        const response =
            await fetch(
                `/api/registration/validate?token=${encodeURIComponent(
                    token
                )}`,
                {
                    credentials:
                        "same-origin"
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.valid
        ) {

            showInvalid(
                data.message ||
                "This registration link is invalid or has expired."
            );

            return null;
        }

        return data;

    } catch (error) {

        console.error(
            "Failed to validate registration link:",
            error
        );

        showInvalid(
            "Unable to validate this registration link."
        );

        return null;
    }
}


/*==============================================================================
    DISPLAY REGISTRATION TYPE
==============================================================================*/

function displayRegistrationType(
    registrationType
) {

    if (
        registrationType ===
        "synara"
    ) {

        description.textContent =
            "Create your broadcaster account with SYNARA support enabled.";

        return;
    }

    description.textContent =
        "Create your broadcaster account.";
}


/*==============================================================================
    START TWITCH OAUTH
==============================================================================*/

async function startTwitchOAuth() {

    if (!token) {

        showInvalid(
            "The registration token is missing."
        );

        return;
    }

    const username =
        document.getElementById(
            "username"
        ).value.trim();

    const password =
        document.getElementById(
            "password"
        ).value;

    const confirmPassword =
        document.getElementById(
            "confirm-password"
        ).value;

    if (
        username.length <
            3 ||
        username.length >
            50
    ) {

        showStatus(
            "Username must be between 3 and 50 characters.",
            "error"
        );

        return;
    }

    if (
        password.length <
        12
    ) {

        showStatus(
            "Password must be at least 12 characters.",
            "error"
        );

        return;
    }

    if (
        password !==
        confirmPassword
    ) {

        showStatus(
            "Passwords do not match.",
            "error"
        );

        return;
    }

    connectTwitchButton.disabled =
        true;

    twitchState.style.display =
        "block";

    twitchMessage.textContent =
        "Preparing registration...";

    try {

        const response =
            await fetch(
                "/api/registration/prepare",
                {
                    method:
                        "POST",

                    credentials:
                        "same-origin",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            token,
                            username,
                            password
                        })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok
        ) {

            throw new Error(
                data.message ||
                "Unable to prepare registration."
            );
        }

        twitchMessage.textContent =
            "Redirecting to Twitch for authorization...";

        registrationForm.style.display =
            "none";

        window.location.href =
            `/api/twitch/oauth/start?token=${encodeURIComponent(
                token
            )}`;

    } catch (error) {

        console.error(
            "Failed to prepare registration:",
            error
        );

        showStatus(
            error.message,
            "error"
        );

        connectTwitchButton.disabled =
            false;

        twitchState.style.display =
            "none";
    }
}


/*==============================================================================
    GET PENDING OAUTH
==============================================================================*/

async function getPendingAuthorization() {

    try {

        const response =
            await fetch(
                "/api/twitch/oauth/pending",
                {
                    credentials:
                        "same-origin"
                }
            );

        if (
            response.status ===
            404
        ) {

            return null;
        }

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.connected
        ) {

            return null;
        }

        return data;

    } catch (error) {

        console.error(
            "Failed to retrieve pending Twitch authorization:",
            error
        );

        return null;
    }
}


/*==============================================================================
    DISPLAY TWITCH AUTHORIZATION
==============================================================================*/

function showTwitchAuthorization(
    authorization
) {

    registrationForm.style.display =
        "none";

    invalidState.style.display =
        "none";

    twitchState.style.display =
        "none";

    completionState.style.display =
        "block";

    const displayName =
        authorization.twitchDisplayName ||
        authorization.twitchUsername;

    completionMessage.textContent =
        `Twitch account @${displayName} has been authorized.`;
}


/*==============================================================================
    COMPLETE REGISTRATION
==============================================================================*/

async function completeRegistration() {

    completeRegistrationButton.disabled =
        true;

    try {

        const response =
            await fetch(
                "/api/registration/create",
                {
                    method:
                        "POST",

                    credentials:
                        "same-origin",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        const data =
            await response.json();

        if (
            !response.ok
        ) {

            throw new Error(
                data.message ||
                "Unable to complete registration."
            );
        }

        completionState.style.display =
            "none";

        successState.style.display =
            "block";

        successDetails.textContent =
            `Welcome, ${data.username}. Your Twitch account ${data.twitchDisplayName} is now connected.`;

        showStatus(
            "Registration completed successfully."
        );

    } catch (error) {

        console.error(
            "Registration failed:",
            error
        );

        showStatus(
            error.message,
            "error"
        );

        completeRegistrationButton.disabled =
            false;
    }
}


/*==============================================================================
    FORM
==============================================================================*/

registrationForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        startTwitchOAuth();
    }
);


/*==============================================================================
    COMPLETE BUTTON
==============================================================================*/

completeRegistrationButton.addEventListener(
    "click",
    completeRegistration
);


/*==============================================================================
    INITIALIZATION
==============================================================================*/

async function initialize() {

    const registration =
        await validateRegistrationLink();

    if (!registration) {
        return;
    }

    displayRegistrationType(
        registration.registrationType
    );

    /*
     * Twitch just returned us from OAuth.
     */

    if (
        oauthState ===
        "success"
    ) {

        twitchState.style.display =
            "block";

        twitchMessage.textContent =
            "Verifying Twitch authorization...";

        const authorization =
            await getPendingAuthorization();

        if (!authorization) {

            showInvalid(
                "The Twitch authorization could not be recovered. Please restart registration."
            );

            return;
        }

        if (
            authorization.registrationType !==
            registration.registrationType
        ) {

            showInvalid(
                "The Twitch authorization does not match this registration link."
            );

            return;
        }

        showTwitchAuthorization(
            authorization
        );

        return;
    }

    if (
        oauthState ===
        "denied"
    ) {

        showStatus(
            "Twitch authorization was cancelled.",
            "error"
        );
    }

    if (
        oauthState ===
        "failed"
    ) {

        showStatus(
            "Twitch authorization failed. Please try again.",
            "error"
        );
    }

    registrationForm.style.display =
        "block";
}


initialize();
