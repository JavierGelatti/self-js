const originalConsoleWarn = console.warn;

export default function setup() {
    console.warn = function (...data) {
        if (isKnownDeprecationNotice(data[0])) return;

        return originalConsoleWarn.apply(console, data);
    }
}

// See https://github.com/vitest-dev/vitest/issues/6804
function isKnownDeprecationNotice(logLine: unknown) {
    return typeof logLine === "string" &&
        logLine.startsWith(`⚠️ [WEBDRIVERIO DEPRECATION NOTICE] The "switchToFrame" command is deprecated`);
}
