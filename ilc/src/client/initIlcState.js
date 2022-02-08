export default function initIlcState() {
    const stateScript = document.querySelector('script[type="ilc-state"]');
    if (stateScript === null) {
        return {};
    }

    const state = JSON.parse(stateScript.innerHTML);

    stateScript.parentNode.removeChild(stateScript);

    return state;
}
