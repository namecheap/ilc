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
        workerSrc: 'worker-src',
        frameSrc: 'frame-src',
        reportUri: 'report-uri'
    }

    #reportingDirectives = [this.#cspDirectiveMap.reportUri]
    #spaceSeparator = ' '
    #semiColonSeparator = '; '
    #cspMode = {
        strict: 'content-security-policy',
        report: 'content-security-policy-report-only',
    }


    constructor(cspJson, isStrict = false) {
        if(cspJson) {
            this.#cspJson = cspJson;
            this.#cspEnabled = true;
            this.#strictCsp = isStrict;
        }
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
                return `${cspDirectiveName} ${this.#cspJson[cspDirective].join(this.#spaceSeparator)}`
            }).join(this.#semiColonSeparator);

        return value;
    }

    #getCspHeaderName() {
        return this.#strictCsp ? this.#cspMode.strict : this.#cspMode.report;
    }

    #buildHeader() {
        const name = this.#getCspHeaderName();
        const value = [this.#buildCheckingDirectives(), this.#buildReportingDirectives()].join(this.#semiColonSeparator);

        return { name, value }
    }

    setHeader(res) {
        if(this.#cspEnabled) {
            const { name, value } = this.#buildHeader();
            res.setHeader(name, value);
        }
        return res;
    }
}
