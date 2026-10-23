import { locate } from 'codeceptjs';

import { loginToRegistry } from '../helpers/registryAuth';
import { registryUrl } from '../helpers/registryEnv';

const { I } = inject();

// Material UI renders button labels uppercase with CSS, so text locators go through XPath (DOM text)
// rather than ARIA role locators, which the Puppeteer helper matches against the rendered innerText.
export const profileButton = 'button[aria-label="Profile"]';
export const notification = '[role="alert"]';
export const confirmDialog = '[role="dialog"]';
export const optionsList = '[role="listbox"]';
export const tabs = '[role="tablist"]';

export function login(user: { username: string; password: string }) {
    loginToRegistry(I, user);
}

/**
 * Loads an admin UI route from scratch. Opening the route the browser is already on is only a hash change,
 * which keeps showing data fetched before a scenario prepared its records over the API.
 */
export function open(path: string) {
    I.amOnPage(`${registryUrl}/#/${path}`);
    I.refreshPage();
}

/**
 * A Material UI button, which React Admin renders as <a> when it navigates (Create, Edit, Show).
 */
export function button(text: string) {
    return locate({ xpath: buttonXPath(text) });
}

export function disabledButton(text: string) {
    return locate({ xpath: `${buttonXPath(text)}[@aria-disabled='true']` });
}

export function enabledButton(text: string) {
    return locate({ xpath: `${buttonXPath(text)}[not(@aria-disabled='true')]` });
}

function buttonXPath(text: string) {
    return `//*[self::button or self::a][contains(., '${text}')]`;
}

export function row(text: string) {
    return locate('tr').withText(text);
}

export function showRow(text: string) {
    I.waitForElement(row(text), 10);
    I.click(row(text));
}

export function editRow(text: string) {
    I.waitForElement(row(text), 10);
    I.click('Edit', row(text));
}

export function seeNotification(text: string) {
    I.waitForText(text, 10, notification);
}

export function openTab(name: string) {
    I.click(name, tabs);
}

/**
 * Picks an option of a Material UI select, which renders a button and a popup list instead of a <select>.
 * React Admin gives the button the id of the field source.
 */
export function selectOption(source: string, option: string) {
    I.click(`#${source}`);
    I.waitForElement(optionsList, 10);
    I.click(locate('li').withText(option), optionsList);
    I.waitForInvisible(optionsList, 10);
}

/**
 * Types into an autocomplete input and picks the suggestion with the given text.
 */
export function pickAutocompleteOption(field: string, option: string) {
    I.fillField(field, option);
    I.waitForElement(suggestion(option), 10);
    I.click(suggestion(option));
}

function suggestion(text: string) {
    return locate('[role="option"]').withText(text);
}

/**
 * Sets the value of a JSON editor field. The editor is an Ace instance, so typing would fight its auto-closing brackets.
 */
export function fillJsonField(label: string, value: unknown) {
    I.executeScript(
        ({ label, json }: { label: string; json: string }) => {
            const labelElement = Array.from(document.querySelectorAll('label')).find((element) =>
                element.textContent?.includes(label),
            );
            const editorElement = labelElement
                ?.closest('[class*="MuiFormControl"]')
                ?.querySelector<
                    HTMLElement & { env: { editor: { setValue(value: string, cursor: number): void } } }
                >('.ace_editor');

            if (!editorElement) {
                throw new Error(`JSON field "${label}" not found`);
            }

            editorElement.env.editor.setValue(json, 1);
        },
        { label, json: JSON.stringify(value) },
    );
}

export function save() {
    I.click('button[aria-label="Save"]');
}

export function deleteRecord() {
    I.click(button('Delete'));
    I.click(button('Confirm'), confirmDialog);
    seeNotification('Element deleted');
}

/**
 * Names the records a scenario creates, so that they can't clash with seeded data or earlier runs.
 */
export function uniqueName(prefix: string) {
    return `${prefix}-e2e-${Date.now().toString(36)}`;
}
