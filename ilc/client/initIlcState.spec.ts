import { expect } from 'chai';
import initIlcState from './initIlcState';

describe('initIlcState', () => {
    let createdScripts: HTMLScriptElement[] = [];

    it('should return empty object when no ilc-state script exists', () => {
        const result = initIlcState();

        expect(result).to.deep.equal({});
    });

    it('should parse and return state from ilc-state script', () => {
        const stateData = {
            locale: 'en-US',
            currency: 'USD',
            routeId: 123,
        };

        const script = document.createElement('script');
        script.type = 'ilc-state';
        script.innerHTML = JSON.stringify(stateData);
        document.body.appendChild(script);
        createdScripts.push(script);

        const result = initIlcState();

        expect(result).to.deep.equal(stateData);
    });

    it('should remove ilc-state script from DOM after parsing', () => {
        const stateData = { test: 'value' };

        const script = document.createElement('script');
        script.type = 'ilc-state';
        script.innerHTML = JSON.stringify(stateData);
        document.body.appendChild(script);
        createdScripts.push(script);

        initIlcState();

        const remainingScript = document.querySelector('script[type="ilc-state"]');
        expect(remainingScript).to.be.null;
    });

    it('should handle complex nested state object', () => {
        const complexState = {
            user: {
                id: 1,
                name: 'John Doe',
                roles: ['admin', 'user'],
            },
            settings: {
                theme: 'dark',
                notifications: {
                    email: true,
                    push: false,
                },
            },
            apps: ['@portal/primary', '@portal/secondary'],
        };

        const script = document.createElement('script');
        script.type = 'ilc-state';
        script.innerHTML = JSON.stringify(complexState);
        document.body.appendChild(script);
        createdScripts.push(script);

        const result = initIlcState();

        expect(result).to.deep.equal(complexState);
    });

    it('should handle empty state object', () => {
        const script = document.createElement('script');
        script.type = 'ilc-state';
        script.innerHTML = JSON.stringify({});
        document.body.appendChild(script);
        createdScripts.push(script);

        const result = initIlcState();

        expect(result).to.deep.equal({});
    });
});
