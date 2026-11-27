import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The Registry server, which serves the API and the built UI from client/dist
const registryUrl = process.env.REGISTRY_URL ?? 'http://localhost:4001';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    // The Registry serves the UI from its root, relative URLs also work when it is mounted under a path
    base: './',
    server: {
        host: true,
        // `pnpm dev` serves the UI with hot reload and sends the server routes to the Registry
        proxy: {
            '/api': registryUrl,
            '/auth': registryUrl,
            '/oauth': registryUrl,
        },
    },
    build: {
        sourcemap: true,
        target: ['chrome100', 'firefox101', 'safari16'],
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        include: ['src/**/*.spec.{ts,tsx}'],
        restoreMocks: true,
        unstubGlobals: true,
        testTimeout: 60000,
        coverage: {
            // Every source file counts, also one that no spec imports
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.spec.{ts,tsx}', 'src/setupTests.ts', 'src/testUtils.tsx', 'src/vite-env.d.ts'],
            // json-summary is what the coverage diff of a pull request reads
            reporter: ['text', 'html', 'json-summary'],
            thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
        },
    },
});
