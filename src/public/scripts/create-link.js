/*
 * ============================================================================
 * Title: create-link.js
 * Author: Tango Hunter
 * Date Created: 8/30/26
 * Description: Registration-link management interface.
 * ============================================================================
 */

const links =
    new Map();

const MAX_LINKS =
    3;

const LINK_LIFETIME =
    10 * 60 * 1000;

const REFRESH_INTERVAL =
    5000;

const createUserButton =
    document.getElementById(
        "create-user-link-button"
    );

const createSynaraButton =
    document.getElementById(
        "create-synara-link-button"
    );

const logoutButton =
    document.getElementById(
        "logout-button"
    );

const linksContainer =
    document.getElementById(
        "links-container"
    );

const emptyState =
    document.getElementById(
        "empty-state"
    );

const linkCount =
    document.getElementById(
        "link-count"
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
        4000
    );
}


/*==============================================================================
    FORMAT TIME
==============================================================================*/

function formatRemaining(
    expiresAt
) {

    const remaining =
        Math.max(
            0,
            expiresAt -
                Date.now()
        );

    const seconds =
        Math.ceil(
            remaining /
                1000
        );

    const minutes =
        Math.floor(
            seconds /
                60
        );

    const remainder =
        seconds %
        60;

    return `${minutes}:${String(
        remainder
    ).padStart(
        2,
        "0"
    )}`;
}


/*==============================================================================
    LINK TYPE LABEL
==============================================================================*/

function getLinkTypeLabel(
    registrationType
) {

    return registrationType ===
        "synara"
        ? "SYNARA User Registration"
        : "User Registration";
}


/*==============================================================================
    RENDER LINKS
==============================================================================*/

function renderLinks() {

    linksContainer.innerHTML =
        "";

    if (
        links.size ===
        0
    ) {

        linksContainer.appendChild(
            emptyState
        );

        emptyState.style.display =
            "block";

    } else {

        emptyState.style.display =
            "none";
    }

    for (
        const link
        of links.values()
    ) {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "registration-link";

        card.innerHTML = `
            <div class="registration-link-content">
                <div class="registration-link-type"></div>
                <div class="registration-link-url"></div>
                <div class="registration-link-expiration"></div>
            </div>
            <div class="registration-link-actions">
                <button class="btn-secondary copy-button" type="button">
                    Copy
                </button>
            </div>
        `;

        card.querySelector(
            ".registration-link-type"
        ).textContent =
            getLinkTypeLabel(
                link.registrationType
            );

        card.querySelector(
            ".registration-link-url"
        ).textContent =
            link.url;

        card.querySelector(
            ".registration-link-expiration"
        ).textContent =
            `Expires in ${formatRemaining(
                link.expiresAt
            )}`;

        card.querySelector(
            ".copy-button"
        ).addEventListener(
            "click",
            () => copyLink(
                link.url
            )
        );

        linksContainer.appendChild(
            card
        );
    }

    linkCount.textContent =
        `${links.size} / ${MAX_LINKS} Active`;

    const disabled =
        links.size >=
        MAX_LINKS;

    createUserButton.disabled =
        disabled;

    createSynaraButton.disabled =
        disabled;
}


/*==============================================================================
    LOAD ACTIVE LINKS
==============================================================================*/

async function loadLinks() {

    try {

        const response =
            await fetch(
                "/api/registration/links",
                {
                    method: "GET",
                    credentials: "same-origin"
                }
            );

        if (
            response.status ===
            401
        ) {

            window.location.href =
                "/authentication";

            return;
        }

        if (!response.ok) {

            throw new Error(
                "Unable to retrieve active registration links."
            );
        }

        const data =
            await response.json();

        links.clear();

        for (
            const link
            of data.links || []
        ) {

            links.set(
                link.token,
                link
            );
        }

        removeExpiredLinks();
        renderLinks();

    } catch (error) {

        console.error(
            "Failed to load registration links:",
            error
        );

        showStatus(
            "Unable to retrieve active registration links.",
            "error"
        );
    }
}


/*==============================================================================
    CREATE LINK
==============================================================================*/

async function createLink(
    registrationType
) {

    createUserButton.disabled =
        true;

    createSynaraButton.disabled =
        true;

    if (
        registrationType ===
        "synara"
    ) {

        const confirmed =
            window.confirm(
                "SYNARA User Registration grants Twitch permission for this user to send chat messages. Continue?"
            );

        if (!confirmed) {

            renderLinks();

            return;
        }
    }

    try {

        const response =
            await fetch(
                "/api/registration/create-link",
                {
                    method: "POST",

                    credentials:
                        "same-origin",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            registrationType
                        })
                }
            );

        if (
            response.status ===
            401
        ) {

            window.location.href =
                "/authentication";

            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to create registration link."
            );
        }

        links.set(
            data.token,
            {
                token:
                    data.token,

                registrationType:
                    data.registrationType,

                url:
                    data.url,

                expiresAt:
                    data.expiresAt ||
                    (
                        Date.now() +
                        LINK_LIFETIME
                    )
            }
        );

        renderLinks();

        showStatus(
            registrationType ===
                "synara"
                ? "SYNARA registration link created."
                : "User registration link created."
        );

    } catch (error) {

        console.error(
            "Failed to create registration link:",
            error
        );

        showStatus(
            error.message,
            "error"
        );

        renderLinks();
    }
}


/*==============================================================================
    COPY LINK
==============================================================================*/

async function copyLink(
    url
) {

    try {

        await navigator.clipboard.writeText(
            url
        );

        showStatus(
            "Registration link copied to clipboard."
        );

    } catch (error) {

        console.error(
            "Failed to copy registration link:",
            error
        );

        showStatus(
            "Unable to copy registration link.",
            "error"
        );
    }
}


/*==============================================================================
    REMOVE EXPIRED LINKS
==============================================================================*/

function removeExpiredLinks() {

    const now =
        Date.now();

    for (
        const [
            token,
            link
        ] of links
    ) {

        if (
            link.expiresAt <=
            now
        ) {

            links.delete(
                token
            );
        }
    }
}


/*==============================================================================
    EXPIRATION TIMER
==============================================================================*/

function updateExpirationTimers() {

    removeExpiredLinks();
    renderLinks();
}


/*==============================================================================
    LOGOUT
==============================================================================*/

async function logout() {

    logoutButton.disabled =
        true;

    try {

        const response =
            await fetch(
                "/api/auth/logout",
                {
                    method: "POST",
                    credentials: "same-origin"
                }
            );

        if (!response.ok) {
            throw new Error(
                "Logout failed."
            );
        }

        window.location.href =
            "/status?type=logged-out";

    } catch (error) {

        console.error(
            "Logout failed:",
            error
        );

        logoutButton.disabled =
            false;

        showStatus(
            "Logout failed. Please try again.",
            "error"
        );
    }
}


/*==============================================================================
    EVENTS
==============================================================================*/

createUserButton.addEventListener(
    "click",
    () => createLink(
        "user"
    )
);

createSynaraButton.addEventListener(
    "click",
    () => createLink(
        "synara"
    )
);

logoutButton.addEventListener(
    "click",
    logout
);


/*==============================================================================
    INITIALIZATION
==============================================================================*/

loadLinks();

setInterval(
    loadLinks,
    REFRESH_INTERVAL
);

setInterval(
    updateExpirationTimers,
    1000
);
