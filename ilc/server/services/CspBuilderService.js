module.exports = class CspBuilderService {
    #cspEnabled = false;
    #cspJson = null;
    #strictCsp = false;
    #cspDirectiveMap = {
        defaultSrc: 'default-src',
        connectSrc: 'connect-src',
        scriptSrc: 'script-src',
        styleSrc: 'style-src',
        fontSrc: 'font-src',
        imgSrc: 'img-src',
        workerSrc: 'worker-src',
        frameSrc: 'frame-src',
        reportUri: 'report-uri',
        mediaSrc: 'media-src',
        childSrc: 'child-src',
        formAction: 'form-action',
        manifestSrc: 'manifest-src',
        objectSrc: 'object-src',
        scriptSrcAttr: 'script-src-attr',
        scriptSrcElem: 'script-src-elem',
        baseUri: 'base-uri',
        frameAncestors: 'frame-ancestors',
        sandbox: 'sandbox',
        upgradeInsecureRequests: 'upgrade-insecure-requests',
    };

    #reportingDirectives = [this.#cspDirectiveMap.reportUri];
    #spaceSeparator = ' ';
    #semiColonSeparator = '; ';
    #cspMode = {
        strict: 'content-security-policy',
        report: 'content-security-policy-report-only',
    };
    #localEnv = false;
    #trustedLocalHosts = [];

    constructor(cspJson, isStrict = false, localEnv = false, trustedLocalHosts = []) {
        if (cspJson) {
            this.#cspJson = cspJson;
            this.#cspEnabled = true;
            this.#strictCsp = isStrict;
            this.#localEnv = localEnv;
            this.#trustedLocalHosts = trustedLocalHosts || [];
        }
    }

    setHeader(res) {
        if (this.#cspEnabled) {
            const { name, value } = this.#buildHeader();
            res.setHeader(name, value);
        }
        return res;
    }

    #filterOutReportingDirectives(cspDirective) {
        return !this.#reportingDirectives.includes(this.#cspDirectiveMap[cspDirective]);
    }

    #buildReportingDirectives() {
        return `${this.#cspDirectiveMap.reportUri} ${this.#cspJson.reportUri}`;
    }

    #buildCheckingDirectives() {
        const value = Object.keys(this.#cspJson)
            .filter(this.#filterOutReportingDirectives.bind(this))
            .map((cspDirective) => {
                const cspDirectiveName = this.#cspDirectiveMap[cspDirective];
                const cspDirectiveValue = this.#cspJson[cspDirective];

                if (cspDirectiveValue === true) {
                    return cspDirectiveName;
                }

                const cspDirectiveValueFinal = this.#localEnv
                    ? cspDirectiveValue.concat(this.#getLocalhosts())
                    : cspDirectiveValue;

                return `${cspDirectiveName} ${cspDirectiveValueFinal.join(this.#spaceSeparator)}`;
            })
            .join(this.#semiColonSeparator);

        return value;
    }

    #getCspHeaderName() {
        return this.#strictCsp ? this.#cspMode.strict : this.#cspMode.report;
    }

    #buildHeader() {
        const name = this.#getCspHeaderName();
        const value = [this.#buildCheckingDirectives(), this.#buildReportingDirectives()].join(
            this.#semiColonSeparator,
        );

        return { name, value };
    }

    #getLocalhosts() {
        return this.#trustedLocalHosts;
    }
};
