import { triggerAppChange as spaTriggerAppChange } from 'single-spa';
import ilcEvents from '../constants/ilcEvents';

export function triggerAppChange() {
    window.dispatchEvent(new CustomEvent(ilcEvents.BEFORE_ROUTING));
    spaTriggerAppChange();
}
