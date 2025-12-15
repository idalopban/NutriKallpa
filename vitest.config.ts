import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/tests/**/*.test.ts'],
        globals: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    css: {
        // Disable CSS processing in tests to avoid Tailwind 4 / PostCSS conflicts
        postcss: {
            plugins: [],
        },
    },
});
