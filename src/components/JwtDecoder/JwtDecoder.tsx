import React, { useState, useEffect } from "react";
import { decodeJwt, type JwtDecodeResult } from "../../lib/jwt";

export const JwtDecoder: React.FC = () => {
    const [tokenInput, setTokenInput] = useState<string>("");
    const [debouncedToken, setDebouncedToken] = useState<string>("");

    // Compute decodedResult and errorMsg directly during render
    let currentDecodedResult: JwtDecodeResult | null = null;
    let currentErrorMsg: string | null = null;

    if (debouncedToken.trim()) {
        try {
            currentDecodedResult = decodeJwt(debouncedToken.trim());
        } catch (err: unknown) {
            currentErrorMsg = (err instanceof Error) ? err.message : "Failed to decode JWT";
        }
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedToken(tokenInput);
        }, 200);

        return () => {
            clearTimeout(handler);
        };
    }, [tokenInput]);

    return (
        <div className="page-content">
            <div className="page-header">
                <h2 className="page-title">JWT Decoder</h2>
                <p className="page-description">Inspect and validate JSON Web Tokens directly in the browser.</p>
            </div>
            <div className="showcase-grid">
                <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3>Encoded Token</h3>
                    <textarea
                        placeholder="Paste your JWT here..."
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        style={{
                            width: "100%",
                            height: "100%",
                            minHeight: "300px",
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--border-light)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-main)",
                            padding: "1rem",
                            fontFamily: "monospace",
                            resize: "vertical",
                            wordBreak: "break-all"
                        }}
                    />
                </div>
                <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3>Decoded Payload</h3>
                    <div style={{ flex: 1, minHeight: "300px", margin: 0, fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {currentErrorMsg ? (
                            <div style={{ color: "var(--danger)" }}>Error: {currentErrorMsg}</div>
                        ) : currentDecodedResult ? (
                            <>
                                <div>
                                    <h4 style={{ color: "var(--text-muted)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>HEADER</h4>
                                    <pre style={{ margin: 0, color: "var(--text-main)", overflowX: "auto" }}>
                                        {JSON.stringify(currentDecodedResult.header, null, 2)}
                                    </pre>
                                </div>
                                <div>
                                    <h4 style={{ color: "var(--text-muted)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>PAYLOAD</h4>
                                    <pre style={{ margin: 0, color: "var(--text-main)", overflowX: "auto" }}>
                                        {JSON.stringify(currentDecodedResult.payload, null, 2)}
                                    </pre>
                                </div>
                            </>
                        ) : (
                            <pre style={{ margin: 0, color: "var(--text-muted)" }}>
                                {`{
  "alg": "HS256",
  "typ": "JWT"
}

...

// Payload will appear here`}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
