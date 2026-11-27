import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import Cookies from 'js-cookie';
import { afterEach } from 'vitest';

// A page of the admin takes longer than the default second to load when every spec file runs at once, as in CI
configure({ asyncUtilTimeout: 15000 });

// Testing Library only unmounts by itself when the test globals are on
afterEach(() => {
    cleanup();
    // The session of the user a spec signed in
    Cookies.remove('ilcUserInfo');
});
