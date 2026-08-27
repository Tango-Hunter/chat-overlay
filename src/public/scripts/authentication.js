/*
 * Name: authentication.js
 * Author: Tango Hunter
 * Date Created: 8/27/26
 * Description: Client-side controller for Primary Operator authentication.
 */


/*==============================================================================
    API
==============================================================================*/

const API = {
    login: "/api/auth/login",
    status: "/api/auth/status"
};


/*==============================================================================
    DOM
==============================================================================*/

const DOM = {
    form: document.getElementById("authenticationForm"),
    username: document.getElementById("username"),
    password: document.getElementById("password"),
    authenticateBtn: document.getElementById("authenticateBtn"),
    exitBtn: document.getElementById("exitBtn"),
    message: document.getElementById("authenticationMessage")
};


/*==============================================================================
    INITIALIZATION
==============================================================================*/

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
    registerEvents();
    DOM.username.focus();

    try {
        const response = await fetch(API.status, {
            method: "GET",
            headers: { "Accept": "application/json" },
            credentials: "same-origin",
            cache: "no-store"
        });

        if (response.ok) {
            redirectToRequestedPage();
        }
    } catch (error) {
        console.error("Unable to determine authentication status.", error);
    }
}


/*==============================================================================
    EVENTS
==============================================================================*/

function registerEvents() {
    DOM.form.addEventListener("submit", handleAuthentication);
    DOM.exitBtn.addEventListener("click", handleExit);
}


/*==============================================================================
    AUTHENTICATION
==============================================================================*/

async function handleAuthentication(event) {
    event.preventDefault();
    clearMessage();

    const username = DOM.username.value.trim();
    const password = DOM.password.value;

    if (!username || !password) {
        showMessage("Username and password are required.", "error");
        return;
    }

    setFormState(true);
    showMessage("Authenticating...", "success");

    try {
        const response = await fetch(API.login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({ username, password })
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.authenticated) {
            throw new Error(data?.message || "Authentication failed.");
        }

        showMessage(
            "Authentication successful. Loading requested interface...",
            "success"
        );

        setTimeout(redirectToRequestedPage, 150);

    } catch (error) {
        console.error("Authentication request failed.", error);
        showMessage(error.message || "Authentication failed.", "error");
        DOM.password.value = "";
        DOM.password.focus();
        setFormState(false);
    }
}


/*==============================================================================
    RETURN PATH
==============================================================================*/

function getReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get("return");

    if (
        !returnUrl ||
        !returnUrl.startsWith("/") ||
        returnUrl.startsWith("//")
    ) {
        return "/";
    }

    return returnUrl;
}

function redirectToRequestedPage() {
    window.location.assign(getReturnUrl());
}


/*==============================================================================
    EXIT
==============================================================================*/

function handleExit() {
    window.location.assign("/status.html?type=access-terminated");
}


/*==============================================================================
    FORM STATE
==============================================================================*/

function setFormState(disabled) {
    DOM.authenticateBtn.disabled = disabled;
    DOM.username.disabled = disabled;
    DOM.password.disabled = disabled;
    DOM.exitBtn.disabled = disabled;
}


/*==============================================================================
    MESSAGE
==============================================================================*/

function showMessage(message, type = "") {
    DOM.message.textContent = message;
    DOM.message.className = `authentication-message ${type}`;
}

function clearMessage() {
    DOM.message.textContent = "";
    DOM.message.className = "authentication-message";
}
