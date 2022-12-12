export class GlobalSpinner {
    #spinnerConfig;
    #spinnerTimeout;
    #globalSpinner;
    #spinnerClass = 'ilcSpinnerWrapper';

    constructor(spinnerConfig) {
        const defaultSpinnerConfig = {
            enabled: true,
            customHTML: '',
            showAfter: 300,
            minimumVisible: 500,
        };

        this.#spinnerConfig = Object.assign({}, defaultSpinnerConfig, spinnerConfig);
    }

    /**
     * @method start
     * @return void
     */
    start({ onBeforeStart }) {
        console.log('start .... ');
        this.#spinnerTimeout = setTimeout(() => {
            onBeforeStart &&
                onBeforeStart({
                    minimumVisibleTime: this.#spinnerConfig.minimumVisible,
                });

            if (!this.#spinnerConfig.customHTML) {
                this.#runDefaultSpinner();
            } else {
                this.#runCustomSpinner();
            }
        }, this.#spinnerConfig.showAfter);
    }

    stop() {
        if (this.#globalSpinner) {
            this.#globalSpinner.remove();
            this.#globalSpinner = null;
        }

        clearTimeout(this.#spinnerTimeout);
        this.#spinnerTimeout = null;
    }

    /**
     * @method isEnabled
     * @returns {boolean}
     */
    isEnabled() {
        return !!this.#spinnerConfig.enabled;
    }

    /**
     * @method isInProgress
     * @returns {boolean}
     */
    isInProgress() {
        return !!this.#spinnerTimeout;
    }

    #runDefaultSpinner() {
        this.#globalSpinner = document.createElement('dialog');
        this.#globalSpinner.setAttribute('class', this.#spinnerClass);
        this.#globalSpinner.innerHTML = 'loading....';
        document.body.appendChild(this.#globalSpinner);
        this.#globalSpinner.showModal();
    }

    #runCustomSpinner() {
        this.#globalSpinner = document.createElement('div');
        this.#globalSpinner.classList.add(this.#spinnerClass);
        this.#globalSpinner.innerHTML = this.#spinnerConfig.customHTML;
        document.body.appendChild(this.#globalSpinner);

        // run script tags
        this.#globalSpinner.querySelectorAll('script').forEach((oldScript) => {
            const newScript = document.createElement('script');

            newScript.innerHTML = oldScript.innerHTML;

            oldScript.parentNode.insertBefore(newScript, oldScript);
            oldScript.remove();
        });
    }
}
