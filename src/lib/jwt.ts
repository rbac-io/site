export interface JwtDecodeResult {
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
}

export function decodeJwt(token: string): JwtDecodeResult {
    if (!token || typeof token !== "string") {
        throw new Error("Invalid token format");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new Error("Token must have 3 parts");
    }

    try {
        const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

        return { header, payload };
    } catch {
        throw new Error("Invalid token payload or header");
    }
}
