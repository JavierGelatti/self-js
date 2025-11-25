import {defineConfig} from "vitest/config";
import {webdriverio} from "@vitest/browser-webdriverio";

export default defineConfig({
  test: {
    watch: true,
    name: "client-side",
    include: ["tests/*.test.ts"],
    globalSetup: "tests/setup.webdriverio.ts",
    browser: {
      enabled: true,
      api: {host: "0.0.0.0"},
      provider: webdriverio({
        logLevel: 'warn',
        capabilities: {
          "goog:chromeOptions": {
            args: ["--remote-debugging-port=9229"],
          },
        },
      }),
      instances: [{ browser: "chrome" }],
    },
  },
});
