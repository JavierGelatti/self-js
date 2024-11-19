import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
    {
        test: {
            name: 'client-side',
            include: ['tests/*.test.ts'],
            browser: {
                enabled: true,
                api: {
                    host: '0.0.0.0',
                },
                name: 'chrome',
                provider: 'webdriverio',
                providerOptions: {
                    capabilities: {
                        browserName: 'chrome',
                        'goog:chromeOptions': {
                            args: ['--remote-debugging-port=9229'],
                        },
                    },
                },
            },
        },
    },
]);
