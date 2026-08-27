/*
 * Name: status.js
 * Author: Tango Hunter
 * Date Created: 8/27/26
 * Description: Client-side controller for Digital Terminal status messages.
 */


/*==============================================================================
    STATUS DEFINITIONS
==============================================================================*/

const STATUS = {
    "access-terminated": {
        heading: "Access Terminated",
        description: "Authentication was not completed.",
        message: "Please close the window."
    },

    "logged-out": {
        heading: "Session Terminated",
        description: "The Primary Operator session has ended.",
        message: "Please close the window."
    },

    "session-expired": {
        heading: "Session Expired",
        description: "The Primary Operator session is no longer valid.",
        message: "Please authenticate again to continue."
    },

    "access-denied": {
        heading: "Access Denied",
        description: "The requested interface requires authentication.",
        message: "Please authenticate before continuing."
    },

    "server-error": {
        heading: "Application Error",
        description: "The server was unable to complete the requested operation.",
        message: "Please close the window and try again later."
    },

    "default": {
        heading: "Digital Terminal Status",
        description: "The requested operation could not be completed.",
        message: "Please close the window."
    }
};


/*==============================================================================
    DOM
==============================================================================*/

const DOM = {
    title: document.getElementById("statusTitle"),
    description: document.getElementById("statusDescription"),
    heading: document.getElementById("statusHeading"),
    message: document.getElementById("statusMessage")
};


/*==============================================================================
    INITIALIZATION
==============================================================================*/

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type") || "default";
    const status = STATUS[type] || STATUS.default;

    DOM.title.textContent = "Digital Terminal Status";
    DOM.description.textContent = status.description;
    DOM.heading.textContent = status.heading;
    DOM.message.textContent = status.message;
}
