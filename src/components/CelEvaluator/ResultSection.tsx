import { Terminal, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { EvaluationResult } from "../../lib/cel-eval";

interface ResultSectionProps {
    result: EvaluationResult | null;
}

export const ResultSection = ({ result }: ResultSectionProps) => {
    if (!result) {
        return (
            <div className="glass-panel" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                <p>Enter an expression to see results</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="section-header" style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Terminal size={16} />
                    Evaluation Result
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {result.duration !== undefined && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" }}>
                            <Clock size={12} />
                            {result.duration}ms
                        </div>
                    )}
                    <span className={`status-badge ${result.success ? 'status-success' : 'status-error'}`}>
                        {result.success ? "SUCCESS" : "ERROR"}
                    </span>
                </div>
            </div>

            <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
                {result.success ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                            <CheckCircle2 size={20} color="var(--success)" style={{ marginTop: "0.25rem" }} />
                            <div>
                                <pre className="code-font" style={{
                                    background: "rgba(0,0,0,0.2)",
                                    padding: "1rem",
                                    borderRadius: "8px",
                                    fontSize: "1.125rem",
                                    color: "var(--accent-primary)",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all"
                                }}>
                                    {JSON.stringify(result.value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)}
                                </pre>
                            </div>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            Type: {typeof result.value}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <XCircle size={20} color="var(--error)" style={{ marginTop: "0.25rem" }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Evaluation Error</div>
                            <div style={{
                                background: "rgba(239, 68, 68, 0.15)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                padding: "1rem",
                                borderRadius: "8px",
                                color: "#ff8a8a",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "0.875rem",
                                lineHeight: "1.4"
                            }}>
                                {result.error}
                            </div>
                            {result.location && (
                                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--error)" }}>
                                    Error at Line {result.location.line}, Column {result.location.column}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
