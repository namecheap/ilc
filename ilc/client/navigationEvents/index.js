import { triggerAppChange as spaTriggerAppChange } from 'single-spa';

export function triggerAppChange() {
    window.dispatchEvent(new CustomEvent('ilc:before-routing'));
    spaTriggerAppChange();
}
