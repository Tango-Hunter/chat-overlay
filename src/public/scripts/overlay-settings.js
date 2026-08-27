/*
 * Name: overlay-settings.js
 * Author: Tango Hunter
 * Date: 8/26/26
 * Description: Client-side settings manager for the Digital Terminal Chat Overlay.
 */


/*==============================================================================
    API CONFIGURATION
==============================================================================*/

const API = {
    settings: "/api/overlay-settings",
    reset: "/api/overlay-settings/reset"
};


/*==============================================================================
    DISPLAY ORDER
==============================================================================*/

const CHAT_GROUP_ORDER = [
    "Typing",
    "Typography",
    "Messages"
];

const EFFECT_GROUP_ORDER = [
    "Scanline Effect",
    "CRT Reboot Effect"
];


/*==============================================================================
    APPLICATION STATE
==============================================================================*/

const chatSettings = new Map();

const APP = {
    settings: [],
    isDirty: false,
    isSaving: false,
    isResetting: false
};


/*==============================================================================
    DOM REFERENCES
==============================================================================*/

const DOM = {
    settingsForm: document.getElementById("settingsForm"),
    chatSettingsContainer: document.getElementById("chatSettingsContainer"),
    effectsSettingsContainer: document.getElementById("effectsSettingsContainer"),
    saveBtn: document.getElementById("saveBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    resetBtn: document.getElementById("resetBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    status: document.getElementById("status"),
    connectionStatus: document.getElementById("connectionStatus")
};


/*==============================================================================
    INITIALIZATION
==============================================================================*/

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {
    registerEvents();
    await loadSettings();
}


/*==============================================================================
    EVENT REGISTRATION
==============================================================================*/

function registerEvents() {

    DOM.saveBtn.addEventListener(
        "click",
        saveSettings
    );

    DOM.cancelBtn.addEventListener(
        "click",
        cancelChanges
    );

    DOM.resetBtn.addEventListener(
        "click",
        resetDefaults
    );

    DOM.settingsForm.addEventListener(
        "input",
        handleFormChange
    );

    DOM.settingsForm.addEventListener(
        "change",
        handleFormChange
    );

    DOM.logoutBtn.addEventListener(
        "click",
        logout
    );
}


/*==============================================================================
    LOGOUT
==============================================================================*/

async function logout() {

    if (
        !window.confirm(
            "Are you sure you want to terminate the operator session?"
        )
    ) {
        return;
    }

    DOM.logoutBtn.disabled = true;

    try {

        const response = await fetch(
            "/api/auth/logout",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Logout failed. Server returned ${response.status}.`
            );
        }

        window.location.href = "/status.html?type=logged-out";

    }
    catch (error) {

        console.error(error);

        DOM.logoutBtn.disabled = false;

        showStatus(
            "Unable to terminate the operator session.",
            "error"
        );
    }
}


/*==============================================================================
    LOAD SETTINGS
==============================================================================*/

async function loadSettings() {

    setConnectionStatus(
        "Loading settings...",
        "loading"
    );

    try {

        const response = await fetch(
            API.settings,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            window.location.href =
                `/authentication.html?return=${encodeURIComponent(
                    window.location.pathname
                )}`;

            return;
        }

        if (!response.ok) {
            throw new Error(
                `Failed to load settings. Server returned ${response.status}.`
            );
}

        const data = await response.json();
        const settings = extractSettings(data);

        if (!Array.isArray(settings)) {
            throw new Error(
                "The server returned an invalid settings response."
            );
        }

        APP.settings = settings;

        populateSettingsMap(settings);
        renderSettings(settings);

        APP.isDirty = false;

        updateButtonState();

        setConnectionStatus(
            "Connected",
            "connected"
        );

        console.log(
            "Overlay settings loaded successfully."
        );

    }
    catch (error) {

        console.error(error);

        setConnectionStatus(
            "Connection Error",
            "error"
        );

        DOM.chatSettingsContainer.innerHTML =
            createErrorState();

        DOM.effectsSettingsContainer.innerHTML = "";

        showStatus(
            error.message,
            "error"
        );
    }
}


/*==============================================================================
    EXTRACT SETTINGS
==============================================================================*/

function extractSettings(data) {

    if (Array.isArray(data)) {
        return data;
    }

    if (
        data &&
        Array.isArray(data.settings)
    ) {
        return data.settings;
    }

    return null;
}


/*==============================================================================
    SETTINGS MAP
==============================================================================*/

function populateSettingsMap(settings) {

    chatSettings.clear();

    settings.forEach(
        setting => {
            chatSettings.set(
                setting.setting_name,
                {...setting}
            );
        }
    );
}


/*==============================================================================
    RENDER SETTINGS
==============================================================================*/

function renderSettings(settings) {

    DOM.chatSettingsContainer.innerHTML = "";
    DOM.effectsSettingsContainer.innerHTML = "";

    if (settings.length === 0) {

        DOM.chatSettingsContainer.innerHTML =
            createEmptyState(
                "No chat settings were found."
            );

        DOM.effectsSettingsContainer.innerHTML =
            createEmptyState(
                "No overlay effects were found."
            );

        return;
    }

    const groups = groupSettings(settings);

    const chatGroups = sortGroups(
        groups,
        CHAT_GROUP_ORDER
    );

    const effectGroups = sortGroups(
        groups,
        EFFECT_GROUP_ORDER
    );

    chatGroups.forEach(
        group => {
            DOM.chatSettingsContainer.appendChild(
                createSettingsGroup(group)
            );
        }
    );

    effectGroups.forEach(
        group => {
            DOM.effectsSettingsContainer.appendChild(
                createSettingsGroup(group)
            );
        }
    );

    if (chatGroups.length === 0) {

        DOM.chatSettingsContainer.innerHTML =
            createEmptyState(
                "No chat settings were found."
            );
    }

    if (effectGroups.length === 0) {

        DOM.effectsSettingsContainer.innerHTML =
            createEmptyState(
                "No overlay effects were found."
            );
    }
}


/*==============================================================================
    GROUP SETTINGS
==============================================================================*/

function groupSettings(settings) {

    const groups = new Map();

    settings.forEach(
        setting => {

            const groupName =
                getSettingGroup(setting);

            if (!groups.has(groupName)) {
                groups.set(
                    groupName,
                    []
                );
            }

            groups.get(groupName).push(
                setting
            );
        }
    );

    return [
        ...groups.entries()
    ].map(
        ([name, settings]) => ({
            name,
            settings
        })
    );
}


/*==============================================================================
    SORT GROUPS
==============================================================================*/

function sortGroups(
    groups,
    order
) {

    const ordered = [];

    order.forEach(
        groupName => {

            const group = groups.find(
                item =>
                    item.name === groupName
            );

            if (group) {
                ordered.push(group);
            }
        }
    );

    return ordered;
}


/*==============================================================================
    SETTING GROUP
==============================================================================*/

function getSettingGroup(setting) {

    const name =
        setting.setting_name.toLowerCase();

    if (
        name === "typing_enabled" ||
        name === "character_delay" ||
        name === "cursor_blink_speed" ||
        name === "show_cursor"
    ) {
        return "Typing";
    }

    if (
        name === "font_family" ||
        name === "font_size" ||
        name === "username_font_size" ||
        name === "line_height"
    ) {
        return "Typography";
    }

    if (
        name === "maximum_visible" ||
        name === "message_spacing" ||
        name === "show_avatar" ||
        name === "avatar_size" ||
        name === "show_username"
    ) {
        return "Messages";
    }

    if (
        name === "scanlines_enabled" ||
        name === "scanlines_frequency" ||
        name === "scanlines_strength"
    ) {
        return "Scanline Effect";
    }

    if (
        name === "reboot_enabled" ||
        name === "reboot_frequency" ||
        name === "reboot_strength"
    ) {
        return "CRT Reboot Effect";
    }

    return "General";
}


/*==============================================================================
    CREATE SETTINGS GROUP
==============================================================================*/

function createSettingsGroup(group) {

    const section =
        document.createElement("div");

    section.className =
        "settings-group";

    const title =
        document.createElement("h3");

    title.className =
        "settings-group-title";

    title.textContent =
        group.name;

    section.appendChild(title);

    const description =
        document.createElement("p");

    description.className =
        "settings-group-description";

    description.textContent =
        getGroupDescription(
            group.name
        );

    section.appendChild(description);

    group.settings.forEach(
        setting => {
            section.appendChild(
                createSettingField(setting)
            );
        }
    );

    return section;
}


/*==============================================================================
    GROUP DESCRIPTION
==============================================================================*/

function getGroupDescription(group) {

    const descriptions = {
        General:
            "General overlay configuration.",

        Typing:
            "Control the terminal-style message typing behavior.",

        Typography:
            "Control the appearance and sizing of chat text.",

        Messages:
            "Control message visibility, spacing, usernames, and avatars.",

        "Scanline Effect":
            "Configure the animated scanline effect.",

        "CRT Reboot Effect":
            "Configure the CRT-style reboot effect."
    };

    return (
        descriptions[group]
        ??
        "Overlay configuration settings."
    );
}


/*==============================================================================
    CREATE SETTING FIELD
==============================================================================*/

function createSettingField(setting) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        `setting-field ${setting.css_class ?? ""}`;

    const label =
        document.createElement("label");

    label.className =
        "setting-label";

    const name =
        document.createElement("span");

    name.className =
        "setting-name";

    name.textContent =
        formatSettingName(
            setting.setting_name
        );

    const key =
        document.createElement("span");

    key.className =
        "setting-key";

    key.textContent =
        setting.setting_name;

    label.appendChild(name);
    label.appendChild(key);

    wrapper.appendChild(label);

    const input =
        createSettingInput(setting);

    wrapper.appendChild(input);

    return wrapper;
}


/*==============================================================================
    CREATE INPUT
==============================================================================*/

function createSettingInput(setting) {

    const formType =
        (
            setting.form_type
            ??
            "text"
        ).toLowerCase();

    switch (formType) {

        case "checkbox":
        case "boolean":
            return createCheckbox(setting);

        case "number":
            return createNumberInput(setting);

        case "select":
            return createSelect(setting);

        case "range":
            return createRange(setting);

        case "text":
        default:
            return createTextInput(setting);
    }
}


/*==============================================================================
    TEXT INPUT
==============================================================================*/

function createTextInput(setting) {

    const input =
        document.createElement("input");

    input.type =
        "text";

    input.className =
        "setting-input";

    input.dataset.settingName =
        setting.setting_name;

    input.value =
        setting.setting_value
        ??
        "";

    return input;
}


/*==============================================================================
    NUMBER INPUT
==============================================================================*/

function createNumberInput(setting) {

    const input =
        document.createElement("input");

    input.type =
        "number";

    input.className =
        "setting-input";

    input.dataset.settingName =
        setting.setting_name;

    input.value =
        setting.setting_value
        ??
        "";

    return input;
}


/*==============================================================================
    CHECKBOX
==============================================================================*/

function createCheckbox(setting) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "checkbox-wrapper";

    const input =
        document.createElement("input");

    input.type =
        "checkbox";

    input.id =
        `setting-${setting.setting_name}`;

    input.dataset.settingName =
        setting.setting_name;

    input.checked =
        isTrue(
            setting.setting_value
        );

    const label =
        document.createElement("label");

    label.htmlFor =
        input.id;

    label.textContent =
        "Enabled";

    wrapper.appendChild(input);
    wrapper.appendChild(label);

    return wrapper;
}


/*==============================================================================
    SELECT
==============================================================================*/

function createSelect(setting) {

    const select =
        document.createElement("select");

    select.className =
        "setting-select";

    select.dataset.settingName =
        setting.setting_name;

    const options =
        getSelectOptions(setting);

    options.forEach(
        option => {

            const element =
                document.createElement("option");

            element.value =
                option.value;

            element.textContent =
                option.label;

            select.appendChild(element);
        }
    );

    select.value =
        setting.setting_value
        ??
        "";

    return select;
}


/*==============================================================================
    SELECT OPTIONS
==============================================================================*/

function getSelectOptions(setting) {

    const name =
        setting.setting_name.toLowerCase();

    /*
     * Effect strength
     */

    if (
        name.includes("strength")
    ) {
        return [
            {
                value: "low",
                label: "Low"
            },
            {
                value: "medium",
                label: "Medium"
            },
            {
                value: "high",
                label: "High"
            }
        ];
    }

    /*
     * Enabled / disabled values
     */

    if (
        name.includes("enabled")
    ) {
        return [
            {
                value: "true",
                label: "Enabled"
            },
            {
                value: "false",
                label: "Disabled"
            }
        ];
    }

    /*
     * Maximum visible messages.
     * Zero means unlimited.
     */

    if (
        name.includes("maximum_visible")
    ) {
        return [
            {
                value: "0",
                label: "Unlimited"
            },
            {
                value: "3",
                label: "3 messages"
            },
            {
                value: "5",
                label: "5 messages"
            },
            {
                value: "7",
                label: "7 messages"
            },
            {
                value: "9",
                label: "9 messages"
            },
            {
                value: "12",
                label: "12 messages"
            }
        ];
    }

    /*
     * Generic fallback.
     */

    return [
        {
            value: setting.setting_value,
            label: setting.setting_value
        }
    ];
}


/*==============================================================================
    RANGE
==============================================================================*/

function createRange(setting) {

    const input =
        document.createElement("input");

    input.type =
        "range";

    input.className =
        "setting-input";

    input.dataset.settingName =
        setting.setting_name;

    input.value =
        setting.setting_value
        ??
        "";

    input.min =
        setting.min_value
        ??
        "0";

    input.max =
        setting.max_value
        ??
        "100";

    input.step =
        setting.step
        ??
        "1";

    return input;
}


/*==============================================================================
    FORMAT SETTING NAME
==============================================================================*/

function formatSettingName(name) {

    if (!name) {
        return "Unnamed Setting";
    }

    return name
        .replace(
            /_/g,
            " "
        )
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );
}


/*==============================================================================
    BOOLEAN VALUE
==============================================================================*/

function isTrue(value) {

    return (
        value === true ||
        value === "true" ||
        value === "1" ||
        value === 1
    );
}


/*==============================================================================
    FORM CHANGE
==============================================================================*/

function handleFormChange() {

    APP.isDirty =
        true;

    updateButtonState();
}


/*==============================================================================
    BUILD FORM SETTINGS
==============================================================================*/

function buildFormSettings() {

    const settings = [];

    APP.settings.forEach(
        setting => {

            const input =
                DOM.settingsForm.querySelector(
                    `[data-setting-name="${CSS.escape(setting.setting_name)}"]`
                );

            if (!input) {
                return;
            }

            let value;

            if (
                input.type === "checkbox"
            ) {
                value =
                    input.checked
                        ? "true"
                        : "false";
            }
            else {
                value =
                    input.value;
            }

            settings.push({
                setting_name:
                    setting.setting_name,

                setting_value:
                    value
            });
        }
    );

    return settings;
}


/*==============================================================================
    CANCEL
==============================================================================*/

function cancelChanges() {

    if (
        !APP.isDirty
    ) {
        showStatus(
            "No changes to cancel.",
            "warning"
        );

        return;
    }

    /*
     * Restore the original values stored in chatSettings.
     */

    chatSettings.forEach(
        setting => {

            const input =
                DOM.settingsForm.querySelector(
                    `[data-setting-name="${CSS.escape(setting.setting_name)}"]`
                );

            if (!input) {
                return;
            }

            if (
                input.type === "checkbox"
            ) {
                input.checked =
                    isTrue(
                        setting.setting_value
                    );
            }
            else {
                input.value =
                    setting.setting_value
                    ??
                    "";
            }
        }
    );

    APP.isDirty =
        false;

    updateButtonState();

    showStatus(
        "Changes cancelled.",
        "success"
    );
}


/*==============================================================================
    SAVE
==============================================================================*/

async function saveSettings() {

    if (
        APP.isSaving
    ) {
        return;
    }

    const settings =
        buildFormSettings();

    if (
        settings.length === 0
    ) {
        showStatus(
            "No settings were available to save.",
            "error"
        );

        return;
    }

    APP.isSaving =
        true;

    updateButtonState();

    showStatus(
        "Saving settings...",
        "warning"
    );

    try {

        const response =
            await fetch(
                API.settings,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            settings
                        })
                }
            );

        if (response.status === 401) {
            window.location.href =
                `/authentication.html?return=${encodeURIComponent(
                    window.location.pathname
                )}`;

            return;
        }

        if (!response.ok) {
            throw new Error(
                `Failed to save settings. Server returned ${response.status}.`
            );
        }

        /*
         * Reload after the database has been updated.
         * This refreshes both APP.settings and chatSettings.
         */

        window.location.reload();

    }
    catch (error) {

        console.error(error);

        APP.isSaving =
            false;

        updateButtonState();

        showStatus(
            error.message,
            "error"
        );
    }
}


/*==============================================================================
    RESET DEFAULTS
==============================================================================*/

async function resetDefaults() {

    if (
        APP.isResetting
    ) {
        return;
    }

    const confirmed =
        window.confirm(
            "Are you sure you want to reset all overlay settings to their default values?"
        );

    if (!confirmed) {
        return;
    }

    APP.isResetting =
        true;

    updateButtonState();

    showStatus(
        "Resetting overlay settings...",
        "warning"
    );

    try {

        const response =
            await fetch(
                API.reset,
                {
                    method: "POST",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        if (response.status === 401) {
            window.location.href =
                `/authentication.html?return=${encodeURIComponent(
                    window.location.pathname
                )}`;

            return;
        }

        if (!response.ok) {
            throw new Error(
                `Failed to reset settings. Server returned ${response.status}.`
            );
        }

        /*
         * Reload after the database has been reset.
         */

        window.location.reload();

    }
    catch (error) {

        console.error(error);

        APP.isResetting =
            false;

        updateButtonState();

        showStatus(
            error.message,
            "error"
        );
    }
}


/*==============================================================================
    BUTTON STATE
==============================================================================*/

function updateButtonState() {

    const disabled =
        APP.isSaving ||
        APP.isResetting;

    DOM.saveBtn.disabled =
        disabled ||
        !APP.isDirty;

    DOM.cancelBtn.disabled =
        disabled ||
        !APP.isDirty;

    DOM.resetBtn.disabled =
        disabled;
}


/*==============================================================================
    CONNECTION STATUS
==============================================================================*/

function setConnectionStatus(
    message,
    state
) {

    DOM.connectionStatus.textContent =
        message;

    DOM.connectionStatus.classList.remove(
        "connected",
        "error"
    );

    if (
        state === "connected"
    ) {
        DOM.connectionStatus.classList.add(
            "connected"
        );
    }

    if (
        state === "error"
    ) {
        DOM.connectionStatus.classList.add(
            "error"
        );
    }
}


/*==============================================================================
    EMPTY / ERROR STATES
==============================================================================*/

function createEmptyState(message) {

    return `
        <div class="loading-state">
            <p>${message}</p>
        </div>
    `;
}


function createErrorState() {

    return `
        <div class="loading-state">
            <p>Unable to load overlay settings.</p>
            <p>Check the server logs and try again.</p>
        </div>
    `;
}


/*==============================================================================
    STATUS MESSAGE
==============================================================================*/

let statusTimeout = null;


function showStatus(
    message,
    type = "success"
) {

    clearTimeout(
        statusTimeout
    );

    DOM.status.textContent =
        message;

    DOM.status.className =
        `status ${type} show`;

    statusTimeout =
        setTimeout(
            () => {
                DOM.status.classList.remove(
                    "show"
                );
            },
            3500
        );
}
