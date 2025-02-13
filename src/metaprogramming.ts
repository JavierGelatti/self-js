export function isRevokedProxy(aValue: unknown) {
    if (typeof aValue !== "object" || aValue === null) return false;

    try {
        Reflect.has(aValue, "");
        return false;
    } catch (error) {
        return error instanceof TypeError && error.message.includes("revoked");
    }
}