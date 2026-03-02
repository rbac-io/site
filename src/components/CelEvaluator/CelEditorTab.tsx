import { useState, useEffect, useCallback } from "react";
import { CELEditor } from "./Editor";
import { ContextEditor } from "./ContextEditor";
import { ResultSection } from "./ResultSection";
import { evaluateCELWithGo, ensureWasmLoaded } from "../../lib/cel-eval";
import type { EvaluationResult } from "../../lib/cel-eval";
import { Zap, Github, Settings } from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";

const ResizeHandle = ({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) => {
    return (
        <PanelResizeHandle
            className="resize-handle"
            style={{
                width: direction === "horizontal" ? "12px" : "100%",
                height: direction === "vertical" ? "12px" : "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: direction === "horizontal" ? "col-resize" : "row-resize",
                transition: "background-color 0.2s ease"
            }}
        >
            <div style={{
                backgroundColor: "var(--border-color)",
                borderRadius: "4px",
                width: direction === "horizontal" ? "4px" : "32px",
                height: direction === "vertical" ? "4px" : "32px",
            }} />
        </PanelResizeHandle>
    );
};

const EXAMPLES = [
    {
        name: "Role & Permissions",
        expression: 'user.role == "admin" && "write" in user.permissions'
    },
    {
        name: "Positive Items",
        expression: 'items.all(i, i > 0)'
    },
    {
        name: "Filter & Map",
        expression: 'items.filter(i, int(i) % 2 == 0).map(i, i * i)'
    },
    {
        name: "Name starts with",
        expression: 'user.name.startsWith("Al") ? user.name : "Unknown"'
    }
];

const INITIAL_CONTEXT = `{
  "user": {
    "name": "Alice",
    "role": "admin",
    "permissions": ["read", "write"]
  },
  "items": [1, 2, 3, 4, 5]
}`;

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== "undefined") {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);
        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", handler);
            return () => mediaQuery.removeEventListener("change", handler);
        } else {
            // Fallback for older browsers (e.g., Safari < 14)
            mediaQuery.addListener(handler);
            return () => mediaQuery.removeListener(handler);
        }
    }, [query]);

    return matches;
}

export function CelEditorTab() {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [expression, setExpression] = useState(EXAMPLES[0].expression);
    const [contextStr, setContextStr] = useState(INITIAL_CONTEXT);
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [isWasmLoading, setIsWasmLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
    const [tempApiKey, setTempApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");

    useEffect(() => {
        let mounted = true;
        ensureWasmLoaded().then(() => {
            if (mounted) setIsWasmLoading(false);
        }).catch(e => {
            console.error("WASM load failed", e);
            if (mounted) setIsWasmLoading(false);
        });

        return () => { mounted = false; };
    }, []);

    const handleSaveSettings = () => {
        setGeminiApiKey(tempApiKey);
        localStorage.setItem("gemini_api_key", tempApiKey);
        setIsSettingsOpen(false);
    };

    const handleEvaluate = useCallback(() => {
        let context = {};
        try {
            context = JSON.parse(contextStr);
        } catch (e) {
            setResult({
                success: false,
                error: "Invalid JSON in Context: " + (e as Error).message,
            });
            return;
        }

        const evalResult = evaluateCELWithGo(expression, context);
        setResult(evalResult);
    }, [expression, contextStr]);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleEvaluate();
        }, 300);
        return () => clearTimeout(timer);
    }, [handleEvaluate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', width: '100%' }}>
            <header className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{
                            background: "linear-gradient(135deg, var(--accent-primary, #6366f1), var(--accent-secondary, #a855f7))",
                            padding: "0.5rem",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <Zap size={20} color="white" fill="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "1.25rem", margin: 0 }}>CEL Playground</h1>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Common Expression Language Evaluator</p>
                        </div>
                    </div>

                    <div style={{ height: "1.5rem", width: "1px", background: "var(--border-color, #334155)", marginLeft: "0.5rem", marginRight: "0.5rem" }}></div>

                    <select
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        style={{
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.875rem",
                            borderRadius: "6px",
                            border: "1px solid var(--border-color, #334155)",
                            background: "rgba(0,0,0,0.2)",
                            color: "var(--text-primary, #f8fafc)",
                            cursor: "pointer",
                            outline: "none",
                            fontFamily: "inherit"
                        }}
                    >
                        <option disabled value="">Select an example...</option>
                        {EXAMPLES.map((ex, idx) => (
                            <option key={idx} value={ex.expression} style={{ background: "var(--bg-color, #0f172a)" }}>
                                {ex.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {isWasmLoading && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            WASM Loading...
                        </div>
                    )}
                    <button
                        onClick={() => {
                            setTempApiKey(geminiApiKey);
                            setIsSettingsOpen(true);
                        }}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-secondary, #94a3b8)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.4rem",
                            borderRadius: "6px",
                            transition: "all 0.2s"
                        }}
                        className="action-button"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            <div style={{ flex: 1, minHeight: 0 }}>
                {isMobile ? (
                    <PanelGroup orientation="vertical">
                        <Panel defaultSize={25} minSize={20}>
                            <CELEditor
                                value={expression}
                                onChange={(v) => setExpression(v || "")}
                                result={result}
                                onConfigSaved={handleEvaluate}
                                apiKey={geminiApiKey}
                            />
                        </Panel>
                        <ResizeHandle direction="vertical" />
                        <Panel defaultSize={25} minSize={20}>
                            <ContextEditor value={contextStr} onChange={(v) => setContextStr(v || "")} />
                        </Panel>
                        <ResizeHandle direction="vertical" />
                        <Panel defaultSize={25} minSize={20}>
                            <ResultSection result={result} />
                        </Panel>
                        <ResizeHandle direction="vertical" />
                        <Panel defaultSize={25} minSize={20}>
                            <div className="glass-panel" style={{ padding: "1.5rem", overflow: "auto", height: "100%" }}>
                                <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "1rem" }}>Quick Tips</h3>
                                <ul style={{ fontSize: "0.825rem", color: "var(--text-secondary, #94a3b8)", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                                    <li>CEL expressions are fast and safe.</li>
                                    <li>Use <code className="code-font" style={{ color: "var(--accent-primary, #6366f1)" }}>.all()</code> or <code className="code-font" style={{ color: "var(--accent-primary, #6366f1)" }}>.exists()</code> for macros.</li>
                                    <li>The strings extension is enabled by default.</li>
                                    <li>Boolean results are common for policy checks.</li>
                                </ul>

                                <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "1rem" }}>Resources</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                                    <a href="https://github.com/google/cel-go" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary, #94a3b8)", textDecoration: "none" }}>
                                        <Github size={16} />
                                        cel-go
                                    </a>
                                    <a href="https://github.com/google/cel-spec" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary, #94a3b8)", textDecoration: "none" }}>
                                        <Github size={16} />
                                        cel-spec
                                    </a>
                                </div>
                            </div>
                        </Panel>
                    </PanelGroup>
                ) : (
                    <PanelGroup orientation="horizontal">
                        <Panel defaultSize={60} minSize={30}>
                            <PanelGroup orientation="vertical">
                                <Panel defaultSize={60} minSize={20}>
                                    <CELEditor
                                        value={expression}
                                        onChange={(v) => setExpression(v || "")}
                                        result={result}
                                        onConfigSaved={handleEvaluate}
                                        apiKey={geminiApiKey}
                                    />
                                </Panel>
                                <ResizeHandle direction="vertical" />
                                <Panel defaultSize={40} minSize={20}>
                                    <ResultSection result={result} />
                                </Panel>
                            </PanelGroup>
                        </Panel>
                        <ResizeHandle direction="horizontal" />
                        <Panel defaultSize={40} minSize={20}>
                            <PanelGroup orientation="vertical">
                                <Panel defaultSize={60} minSize={20}>
                                    <ContextEditor value={contextStr} onChange={(v) => setContextStr(v || "")} />
                                </Panel>
                                <ResizeHandle direction="vertical" />
                                <Panel defaultSize={40} minSize={20}>
                                    <div className="glass-panel" style={{ padding: "1.5rem", overflow: "auto", height: "100%" }}>
                                        <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "1rem" }}>Quick Tips</h3>
                                        <ul style={{ fontSize: "0.825rem", color: "var(--text-secondary, #94a3b8)", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                                            <li>CEL expressions are fast and safe.</li>
                                            <li>Use <code className="code-font" style={{ color: "var(--accent-primary, #6366f1)" }}>.all()</code> or <code className="code-font" style={{ color: "var(--accent-primary, #6366f1)" }}>.exists()</code> for macros.</li>
                                            <li>The strings extension is enabled by default.</li>
                                            <li>Boolean results are common for policy checks.</li>
                                        </ul>

                                        <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "1rem" }}>Resources</h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                                            <a href="https://github.com/google/cel-go" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary, #94a3b8)", textDecoration: "none" }}>
                                                <Github size={16} />
                                                cel-go
                                            </a>
                                            <a href="https://github.com/google/cel-spec" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary, #94a3b8)", textDecoration: "none" }}>
                                                <Github size={16} />
                                                cel-spec
                                            </a>
                                        </div>
                                    </div>
                                </Panel>
                            </PanelGroup>
                        </Panel>
                    </PanelGroup>
                )}
            </div>

            {isSettingsOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
                    <div className="glass-panel" style={{ padding: "1.5rem", width: "400px", maxWidth: "90%", display: "flex", flexDirection: "column", gap: "1.25rem", background: "var(--bg-color, #0f172a)" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary, #f8fafc)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Settings size={18} />
                            Settings
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label style={{ fontSize: "0.875rem", color: "var(--text-secondary, #94a3b8)" }}>Gemini API Key</label>
                            <input
                                type="password"
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                placeholder="AIza..."
                                style={{
                                    padding: "0.75rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color, #334155)",
                                    borderRadius: "6px", color: "var(--text-primary, #f8fafc)", fontSize: "0.875rem", fontFamily: "inherit"
                                }}
                            />
                            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-secondary, #94a3b8)" }}>
                                Required for AI generation features. Stored locally in your browser.
                            </p>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                style={{
                                    padding: "0.5rem 1rem", fontSize: "0.8rem", background: "transparent", color: "var(--text-secondary, #94a3b8)",
                                    border: "1px solid var(--border-color, #334155)", borderRadius: "6px", cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                style={{
                                    padding: "0.5rem 1rem", fontSize: "0.8rem", background: "var(--accent-primary, #6366f1)", color: "white",
                                    border: "none", borderRadius: "6px", cursor: "pointer"
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
