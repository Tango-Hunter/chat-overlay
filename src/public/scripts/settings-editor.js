/*
 * ============================================================================
 * Name: settings-editor.js
 * Author: Tango Hunter
 * Date Created: 8/26/26
 * Description: Browser-side settings editor for the Chat Overlay.
 * ============================================================================
 */


/*==============================================================================
    CONSTANTS
==============================================================================*/

const SETTINGS_ENDPOINT =
    "/api/overlay-settings";


const OVERLAY_BASE_URL =
    "https://overlay.tangohunter.com/";

const CATEGORY_ORDER = [
    "typography",
    "messages",
    "background",
    "typing",
    "effects",
    "synara"
];


/*==============================================================================
    APPLICATION STATE
==============================================================================*/

const state = {

    settings:
        new Map(),

    originalValues:
        new Map(),

    defaults:
        new Map(),

    user:
        null,

    fontOptions:
        null

};


/*==============================================================================
    DOM
==============================================================================*/

const DOM = {

    settingsContainer:
        document.getElementById(
            "settingsContainer"
        ),

    settingsForm:
        document.getElementById(
            "settingsForm"
        ),

    saveBtn:
        document.getElementById(
            "saveBtn"
        ),

    cancelBtn:
        document.getElementById(
            "cancelBtn"
        ),

    resetBtn:
        document.getElementById(
            "resetBtn"
        ),

    logoutBtn:
        document.getElementById(
            "logoutBtn"
        ),

    connectionStatus:
        document.getElementById(
            "connectionStatus"
        ),

    status:
        document.getElementById(
            "status"
        ),

    twitchDisplayName:
        document.getElementById(
            "twitchDisplayName"
        ),

    overlayLink:
        document.getElementById(
            "overlayLink"
        ),

    copyOverlayLinkBtn:
        document.getElementById(
            "copyOverlayLinkBtn"
        )

};


/*==============================================================================
    INITIALIZATION
==============================================================================*/

document.addEventListener(
    "DOMContentLoaded",
    initializeSettingsEditor
);


async function initializeSettingsEditor() {

    try {

        setConnectionStatus(
            "Loading settings..."
        );

        await loadSettings();

        renderSettings();

        setConnectionStatus(
            "Settings loaded"
        );

    } catch (error) {

        console.error(
            "[Settings Editor] Initialization failed.",
            error
        );

        setConnectionStatus(
            "Unable to load settings"
        );

        showStatus(
            error.message ||
            "Unable to load overlay settings.",
            "error"
        );
    }
}


/*==============================================================================
    LOAD SETTINGS
==============================================================================*/

async function loadSettings() {

    const response =
        await fetch(
            SETTINGS_ENDPOINT
        );

    if (
        !response.ok
    ) {

        const data =
            await response.json()
                .catch(
                    () => ({})
                );

        throw new Error(
            data.error ||
            "Unable to load overlay settings."
        );
    }

    const data =
        await response.json();


    if (
        !Array.isArray(
            data.settings
        )
    ) {

        throw new Error(
            "Invalid settings response."
        );
    }


    state.settings.clear();

    state.originalValues.clear();

    state.defaults.clear();


    for (
        const setting of data.settings
    ) {

        /*
         * SYNARA settings should only be displayed when the
         * broadcaster has granted user:write:chat.
         */

        if (
            isSynaraSetting(
                setting
            ) &&

            !hasSynaraScope(
                data.user?.twitchScopes
            )
        ) {

            continue;
        }

        state.settings.set(
            setting.setting_name,
            setting
        );

        state.originalValues.set(
            setting.setting_name,
            String(
                setting.setting_value
            )
        );

        state.defaults.set(
            setting.setting_name,
            String(
                setting.setting_default
            )
        );
    }


    state.user =
        data.user || null;


    updateUserInterface();

    await loadGoogleFonts();
}


/*==============================================================================
    USER INTERFACE
==============================================================================*/

function updateUserInterface() {

    const twitchDisplayName =
        state.user?.twitchDisplayName ||
        "Unknown User";


    const twitchUserId =
        state.user?.twitchUserId;


    DOM.twitchDisplayName.textContent =
        twitchDisplayName;


    if (
        twitchUserId
    ) {

        DOM.overlayLink.value =
            `${OVERLAY_BASE_URL}?id=${encodeURIComponent(
                twitchUserId
            )}`;

    } else {

        DOM.overlayLink.value =
            "Unable to generate overlay link.";
    }
}


/*==============================================================================
    SYNARA SCOPE
==============================================================================*/

function hasSynaraScope(
    scopes
) {

    if (
        !Array.isArray(
            scopes
        )
    ) {

        return false;
    }

    return scopes.includes(
        "user:write:chat"
    );
}


function isSynaraSetting(
    setting
) {

    return (
        String(
            setting.category ||
            ""
        ).toLowerCase() ===
        "synara"
    );
}


/*==============================================================================
    GOOGLE FONTS
==============================================================================*/

async function loadGoogleFonts() {

    const fontSetting =
        Array.from(
            state.settings.values()
        ).find(
            setting =>
                setting.form_type ===
                "font"
        );


    if (
        !fontSetting
    ) {

        return;
    }


    const fontOptions =
        parseFormOptions(
            fontSetting.form_options
        );


    if (
        !fontOptions ||
        typeof fontOptions !==
            "object"
    ) {

        return;
    }


    state.fontOptions =
        fontOptions;


    const fonts =
        new Set();


    Object.values(
        fontOptions
    ).forEach(
        categoryFonts => {

            if (
                !Array.isArray(
                    categoryFonts
                )
            ) {

                return;
            }


            categoryFonts.forEach(
                font => {

                    fonts.add(
                        font
                    );
                }
            );
        }
    );


    if (
        fonts.size ===
        0
    ) {

        return;
    }


    const families =
        Array.from(
            fonts
        ).map(
            font =>
                `family=${encodeURIComponent(
                    font
                ).replace(
                    /%20/g,
                    "+"
                )}:wght@400;500;600;700`
        );


    const googleFontsUrl =
        `https://fonts.googleapis.com/css2?${families.join(
            "&"
        )}&display=swap`;


    let fontLink =
        document.getElementById(
            "overlay-google-fonts"
        );


    if (
        !fontLink
    ) {

        fontLink =
            document.createElement(
                "link"
            );

        fontLink.id =
            "overlay-google-fonts";

        fontLink.rel =
            "stylesheet";

        document.head.appendChild(
            fontLink
        );
    }


    fontLink.href =
        googleFontsUrl;
}


/*==============================================================================
    RENDER SETTINGS
==============================================================================*/

function renderSettings() {

    DOM.settingsContainer.innerHTML =
        "";


    const groupedSettings =
        new Map();


    for (
        const setting of
        state.settings.values()
    ) {

        const category =
            String(
                setting.category ||
                "general"
            ).toLowerCase();


        if (
            !groupedSettings.has(
                category
            )
        ) {

            groupedSettings.set(
                category,
                []
            );
        }


        groupedSettings
            .get(
                category
            )
            .push(
                setting
            );
    }


    /*
     * Render known categories in the intended
     * application order.
     */
    const orderedCategories =
        CATEGORY_ORDER.filter(
            category =>
                groupedSettings.has(
                    category
                )
        );


    /*
     * Any future categories that are added to the
     * database will still render instead of being
     * silently excluded.
     */
    const additionalCategories =
        Array.from(
            groupedSettings.keys()
        )
            .filter(
                category =>
                    !CATEGORY_ORDER.includes(
                        category
                    )
            )
            .sort();


    for (
        const category of [
            ...orderedCategories,
            ...additionalCategories
        ]
    ) {

        const settings =
            groupedSettings.get(
                category
            );


        settings.sort(
            (
                a,
                b
            ) =>
                Number(
                    a.sort_order || 0
                ) -
                Number(
                    b.sort_order || 0
                )
        );


        const section =
            createCategorySection(
                category,
                settings
            );


        DOM.settingsContainer.appendChild(
            section
        );
    }
}


/*==============================================================================
    CATEGORY SECTION
==============================================================================*/

function createCategorySection(
    category,
    settings
) {

    const section =
        document.createElement(
            "section"
        );

    section.className =
        "settings-column";


    const header =
        document.createElement(
            "div"
        );

    header.className =
        "column-header";


    const title =
        document.createElement(
            "h2"
        );

    title.textContent =
        formatCategoryName(
            category
        );


    const description =
        document.createElement(
            "p"
        );

    description.textContent =
        getCategoryDescription(
            category
        );


    header.append(
        title,
        description
    );


    const container =
        document.createElement(
            "div"
        );

    container.className =
        "settings-container";


    for (
        const setting of settings
    ) {

        const field =
            createSettingField(
                setting
            );

        container.appendChild(
            field
        );
    }


    section.append(
        header,
        container
    );


    return section;
}


/*==============================================================================
    SETTING FIELD
==============================================================================*/

function createSettingField(
    setting
) {

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "setting-field";

    wrapper.dataset.settingName =
        setting.setting_name;


    const label =
        document.createElement(
            "label"
        );

    label.className =
        "setting-label";

    label.textContent =
        setting.display_name;

    wrapper.appendChild(
        label
    );


    if (
        setting.description
    ) {

        const description =
            document.createElement(
                "p"
            );

        description.className =
            "setting-description";

        description.textContent =
            setting.description;

        wrapper.appendChild(
            description
        );
    }


    const control =
        createControl(
            setting
        );

    wrapper.appendChild(
        control
    );

    return wrapper;
}


/*==============================================================================
    CONTROL FACTORY
==============================================================================*/

function createControl(
    setting
) {

    switch (
        setting.form_type
    ) {

        case "checkbox":

            return createCheckbox(
                setting
            );


        case "select":

            return createCustomSelect(
                setting
            );


        case "font":

            return createFontSelector(
                setting
            );


        case "color":

            return createColorControl(
                setting
            );


        case "number":

            return createNumberInput(
                setting
            );


        default:

            return createTextInput(
                setting
            );
    }
}


/*==============================================================================
    CHECKBOX
==============================================================================*/

function createCheckbox(
    setting
) {

    const container =
        document.createElement(
            "label"
        );

    container.className =
        "custom-checkbox";


    const input =
        document.createElement(
            "input"
        );

    input.type =
        "checkbox";

    input.checked =
        String(
            setting.setting_value
        ) ===
        "true";


    input.dataset.settingName =
        setting.setting_name;


    input.addEventListener(
        "change",
        () => {

            updateSettingValue(
                setting.setting_name,
                String(
                    input.checked
                )
            );
        }
    );


    const visual =
        document.createElement(
            "span"
        );

    visual.className =
        "checkbox-visual";


    container.append(
        input,
        visual
    );


    return container;
}


/*==============================================================================
    NUMBER INPUT
==============================================================================*/

function createNumberInput(
    setting
) {

    const input =
        document.createElement(
            "input"
        );

    input.type =
        "number";

    input.className =
        "settings-input";


    input.value =
        setting.setting_value;


    input.dataset.settingName =
        setting.setting_name;


    input.addEventListener(
        "input",
        () => {

            updateSettingValue(
                setting.setting_name,
                input.value
            );
        }
    );


    return input;
}


/*==============================================================================
    TEXT INPUT
==============================================================================*/

function createTextInput(
    setting
) {

    const input =
        document.createElement(
            "input"
        );

    input.type =
        "text";

    input.className =
        "settings-input";


    input.value =
        setting.setting_value;


    input.dataset.settingName =
        setting.setting_name;


    input.addEventListener(
        "input",
        () => {

            updateSettingValue(
                setting.setting_name,
                input.value
            );
        }
    );


    return input;
}


/*==============================================================================
    COLOR CONTROL
==============================================================================*/

function createColorControl(
    setting
) {

    const container =
        document.createElement(
            "div"
        );

    container.className =
        "color-control";


    const colorInput =
        document.createElement(
            "input"
        );

    colorInput.type =
        "color";

    colorInput.value =
        normalizeColor(
            setting.setting_value
        );


    const textInput =
        document.createElement(
            "input"
        );

    textInput.type =
        "text";

    textInput.className =
        "settings-input";

    textInput.value =
        setting.setting_value;


    colorInput.addEventListener(
        "input",
        () => {

            textInput.value =
                colorInput.value;

            updateSettingValue(
                setting.setting_name,
                colorInput.value
            );
        }
    );


    textInput.addEventListener(
        "input",
        () => {

            updateSettingValue(
                setting.setting_name,
                textInput.value
            );

            if (
                isValidHexColor(
                    textInput.value
                )
            ) {

                colorInput.value =
                    textInput.value;
            }
        }
    );


    container.append(
        colorInput,
        textInput
    );


    return container;
}


/*==============================================================================
    CUSTOM SELECT
==============================================================================*/

function createCustomSelect(
    setting
) {

    const options =
        parseFormOptions(
            setting.form_options
        );

    const selector =
        createSelector(
            setting.setting_name,
            setting.setting_value,
            Array.isArray(
                options
            )
                ? options
                : []
        );

    return selector.element;
}


/*==============================================================================
    FONT SELECTOR
==============================================================================*/

function createFontSelector(
    setting
) {

    const options =
        parseFormOptions(
            setting.form_options
        );


    if (
        !options ||
        typeof options !==
            "object"
    ) {

        return document.createTextNode(
            "Font options unavailable."
        );
    }


    const container =
        document.createElement(
            "div"
        );

    container.className =
        "font-selector-group";


    const categories =
        Object.keys(
            options
        );


    const selectedFont =
        setting.setting_value;


    const selectedCategory =
        categories.find(
            category =>

                options[
                    category
                ].includes(
                    selectedFont
                )
        ) ||

        categories[0];


    const categorySelector =
        createSelector(
            null,
            selectedCategory,
            categories,
            {
                formatLabels:
                    false,

                onChange:
                    category => {

                        const fonts =
                            options[
                                category
                            ] || [];


                        const nextFont =
                            fonts[0] ||
                            "";


                        /*
                        * Replace the available fonts with the fonts
                        * belonging to the newly selected category.
                        */
                        fontSelector.setOptions(
                            fonts
                        );


                        /*
                        * Select the first font from the new category.
                        */
                        fontSelector.setValue(
                            nextFont
                        );


                        updateSettingValue(
                            setting.setting_name,
                            nextFont
                        );
                    }
            }
        );


    const fontSelector =
        createSelector(
            setting.setting_name,
            selectedFont,
            options[
                selectedCategory
            ] || [],
            {
                fontPreview:
                    true,

                formatLabels:
                    false
            }
        );


    container.append(
        categorySelector.element,
        fontSelector.element
    );


    return container;
}


/*==============================================================================
    REUSABLE SELECTOR
==============================================================================*/

function createSelector(
    settingName,
    selectedValue,
    options,
    configuration = {}
) {

    const container =
        document.createElement(
            "div"
        );

    container.className =
        "custom-selector";


    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.className =
        "custom-selector-button";


    const value =
        document.createElement(
            "span"
        );

    value.className =
        "custom-selector-value";


    const arrow =
        document.createElement(
            "span"
        );

    arrow.className =
        "custom-selector-arrow";

    arrow.textContent =
        "▼";


    button.append(
        value,
        arrow
    );


    const menu =
        document.createElement(
            "div"
        );

    menu.className =
        "custom-selector-menu";


    container.append(
        button,
        menu
    );


    function applyValue(
        nextValue,
        notify = false
    ) {

        value.textContent =
            configuration.formatLabels === false
                ? nextValue
                : formatSelectorLabel(
                    nextValue
                );


        if (
            configuration.fontPreview
        ) {

            value.style.fontFamily =
                `"${nextValue}", sans-serif`;

        } else {

            value.style.fontFamily =
                "";
        }


        menu
            .querySelectorAll(
                ".custom-selector-option"
            )
            .forEach(
                option => {

                    option.classList.toggle(
                        "selected",
                        option.dataset.value ===
                        nextValue
                    );
                }
            );


        if (
            settingName &&
            notify
        ) {

            updateSettingValue(
                settingName,
                nextValue
            );
        }


        if (
            configuration.onChange &&
            notify
        ) {

            configuration.onChange(
                nextValue
            );
        }
    }


    function renderOptions(
        nextOptions
    ) {

        menu.innerHTML =
            "";


        options =
            nextOptions;


        for (
            const optionValue of options
        ) {

            const option =
                document.createElement(
                    "button"
                );

            option.type =
                "button";

            option.className =
                "custom-selector-option";

            option.dataset.value =
                optionValue;

            option.textContent =
                configuration.formatLabels === false
                    ? optionValue
                    : formatSelectorLabel(
                        optionValue
                    );


            if (
                configuration.fontPreview
            ) {

                option.style.fontFamily =
                    `"${optionValue}", sans-serif`;
            }


            option.addEventListener(
                "click",
                () => {

                    applyValue(
                        optionValue,
                        true
                    );

                    closeAllSelectors();
                }
            );


            menu.appendChild(
                option
            );
        }


        if (
            !options.includes(
                selectedValue
            )
        ) {

            selectedValue =
                options[0] ||
                "";
        }


        applyValue(
            selectedValue,
            false
        );
    }


    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            const isOpen =
                container.classList.contains(
                    "open"
                );


            closeAllSelectors();


            if (
                !isOpen
            ) {

                container.classList.add(
                    "open"
                );
            }
        }
    );


    renderOptions(
        options
    );


    return {

        element:
            container,

        setValue(
            nextValue
        ) {

            selectedValue =
                nextValue;

            applyValue(
                nextValue,
                false
            );
        },

        setOptions(
            nextOptions
        ) {

            renderOptions(
                nextOptions
            );
        }

    };
}


/*==============================================================================
    CLOSE CUSTOM SELECTORS
==============================================================================*/

document.addEventListener(
    "click",
    closeAllSelectors
);


function closeAllSelectors() {

    document
        .querySelectorAll(
            ".custom-selector.open"
        )
        .forEach(
            selector => {

                selector.classList.remove(
                    "open"
                );
            }
        );
}


/*==============================================================================
    UPDATE SETTING VALUE
==============================================================================*/

function updateSettingValue(
    settingName,
    value
) {

    const setting =
        state.settings.get(
            settingName
        );


    if (
        !setting
    ) {

        return;
    }


    setting.setting_value =
        String(
            value
        );
}


/*==============================================================================
    SAVE SETTINGS
==============================================================================*/

DOM.saveBtn.addEventListener(
    "click",
    saveSettings
);


async function saveSettings() {

    const changedSettings =
        [];


    for (
        const [
            settingName,
            setting
        ] of state.settings
    ) {

        const originalValue =
            state.originalValues.get(
                settingName
            );


        if (
            String(
                setting.setting_value
            ) !==
            String(
                originalValue
            )
        ) {

            changedSettings.push({
                setting_name:
                    settingName,

                setting_value:
                    setting.setting_value
            });
        }
    }


    if (
        changedSettings.length ===
        0
    ) {

        showStatus(
            "No changes to save.",
            "info"
        );

        return;
    }


    setButtonsDisabled(
        true
    );


    try {

        const response =
            await fetch(
                SETTINGS_ENDPOINT,
                {
                    method:
                        "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            settings:
                                changedSettings
                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Unable to save settings."
            );
        }


        for (
            const setting of
            data.settings || []
        ) {

            const current =
                state.settings.get(
                    setting.setting_name
                );


            if (
                current
            ) {

                current.setting_value =
                    String(
                        setting.setting_value
                    );
            }


            state.originalValues.set(
                setting.setting_name,
                String(
                    setting.setting_value
                )
            );
        }


        showStatus(
            "Settings saved successfully.",
            "success"
        );

        setConnectionStatus(
            "Settings saved"
        );

    } catch (error) {

        console.error(
            "[Settings Editor] Save failed.",
            error
        );

        showStatus(
            error.message ||
            "Unable to save settings.",
            "error"
        );

    } finally {

        setButtonsDisabled(
            false
        );
    }
}


/*==============================================================================
    CANCEL CHANGES
==============================================================================*/

DOM.cancelBtn.addEventListener(
    "click",
    () => {

        for (
            const [
                settingName,
                setting
            ] of state.settings
        ) {

            setting.setting_value =
                state.originalValues.get(
                    settingName
                );
        }


        renderSettings();


        showStatus(
            "Changes discarded.",
            "info"
        );
    }
);


/*==============================================================================
    RESET TO DEFAULTS
==============================================================================*/

DOM.resetBtn.addEventListener(
    "click",
    () => {

        for (
            const [
                settingName,
                setting
            ] of state.settings
        ) {

            setting.setting_value =
                state.defaults.get(
                    settingName
                );
        }


        renderSettings();


        showStatus(
            "Default values loaded. Click Save to keep them.",
            "info"
        );
    }
);


/*==============================================================================
    COPY OVERLAY LINK
==============================================================================*/

DOM.copyOverlayLinkBtn.addEventListener(
    "click",
    copyOverlayLink
);


async function copyOverlayLink() {

    const link =
        DOM.overlayLink.value;


    if (
        !link ||
        link ===
        "Loading..."
    ) {

        return;
    }


    try {

        await navigator.clipboard.writeText(
            link
        );

        const originalText =
            DOM.copyOverlayLinkBtn.textContent;


        DOM.copyOverlayLinkBtn.textContent =
            "Copied!";


        setTimeout(
            () => {

                DOM.copyOverlayLinkBtn.textContent =
                    originalText;

            },
            2000
        );

    } catch (error) {

        console.error(
            "[Settings Editor] Unable to copy overlay link.",
            error
        );

        DOM.overlayLink.select();

        document.execCommand(
            "copy"
        );

        showStatus(
            "Overlay link copied.",
            "success"
        );
    }
}


/*==============================================================================
    LOGOUT
==============================================================================*/

DOM.logoutBtn.addEventListener(
    "click",
    logout
);


async function logout() {

    try {

        await fetch(
            "/api/auth/logout",
            {
                method:
                    "POST"
            }
        );

    } catch (error) {

        console.error(
            "[Settings Editor] Logout request failed.",
            error
        );
    }


    window.location.href =
        "/authentication";
}


/*==============================================================================
    STATUS
==============================================================================*/

function setConnectionStatus(
    message
) {

    DOM.connectionStatus.textContent =
        message;
}


function showStatus(
    message,
    type = "info"
) {

    DOM.status.textContent =
        message;

    DOM.status.className =
        `status ${type}`;


    if (
        type ===
        "success"
    ) {

        setTimeout(
            () => {

                if (
                    DOM.status.textContent ===
                    message
                ) {

                    DOM.status.textContent =
                        "";

                    DOM.status.className =
                        "status";
                }

            },
            4000
        );
    }
}


function setButtonsDisabled(
    disabled
) {

    DOM.saveBtn.disabled =
        disabled;

    DOM.cancelBtn.disabled =
        disabled;

    DOM.resetBtn.disabled =
        disabled;
}


/*==============================================================================
    HELPERS
==============================================================================*/

function parseFormOptions(
    formOptions
) {

    if (
        !formOptions
    ) {

        return null;
    }


    if (
        typeof formOptions ===
        "object"
    ) {

        return formOptions;
    }


    try {

        return JSON.parse(
            formOptions
        );

    } catch {

        return null;
    }
}


function formatCategoryName(
    category
) {

    return String(
        category
    )

        .replace(
            /[_-]/g,
            " "
        )

        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );
}


function getCategoryDescription(
    category
) {

    const descriptions = {

        messages:
            "Configure how chat messages are displayed.",

        typography:
            "Configure fonts, colors, and text appearance.",

        background:
            "Configure the appearance of the overlay background.",

        typing:
            "Configure message animation behavior.",

        effects:
            "Configure visual effects for the overlay.",

        synara:
            "Configure SYNARA's chat response behavior."

    };


    return (
        descriptions[
            String(
                category
            ).toLowerCase()
        ] ||

        "Configure these overlay settings."
    );
}


function normalizeColor(
    value
) {

    const color =
        String(
            value || ""
        ).trim();


    if (
        isValidHexColor(
            color
        )
    ) {

        return color;
    }


    return "#00ff78";
}


function isValidHexColor(
    value
) {

    return (
        /^#[0-9A-Fa-f]{6}$/.test(
            String(
                value
            ).trim()
        )
    );
}


function formatSelectorLabel(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /[_-]+/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim()

        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );
}
