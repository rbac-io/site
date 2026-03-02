import { describe, it, expect } from "vitest";
import { decodeJwt } from "./jwt";

describe("decodeJwt", () => {
    it("should decode a valid JWT correctly", () => {
        // Header: {"alg":"HS256","typ":"JWT"}
        // Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
        const token =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

        const result = decodeJwt(token);

        expect(result.header).toEqual({ alg: "HS256", typ: "JWT" });
        expect(result.payload).toEqual({
            sub: "1234567890",
            name: "John Doe",
            iat: 1516239022,
        });
    });

    it("should throw an error for non-string input", () => {
        expect(() => decodeJwt(null as unknown as string)).toThrow("Invalid token format");
        expect(() => decodeJwt(undefined as unknown as string)).toThrow("Invalid token format");
        expect(() => decodeJwt("")).toThrow("Invalid token format");
    });

    it("should throw an error if the token does not have 3 parts", () => {
        expect(() => decodeJwt("header.payload")).toThrow("Token must have 3 parts");
        expect(() => decodeJwt("header")).toThrow("Token must have 3 parts");
        expect(() => decodeJwt("header.payload.signature.extra")).toThrow(
            "Token must have 3 parts"
        );
    });

    it("should throw an error if parts are not valid base64url JSON", () => {
        expect(() => decodeJwt("invalid.payload.signature")).toThrow(
            "Invalid token payload or header"
        );
    });
});
