import Editor from "@monaco-editor/react";
import { Settings2, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { getInitialCELConfig, updateCELConfig } from "../../lib/cel-eval";

export const ConfigEditor = ({ onSaved }: { onSaved: () => void }) => {
    const [config, setConfig] = useState<string>(() => getInitialCELConfig());
    const [lastSavedConfig, setLastSavedConfig] = useState<string>(() => getInitialCELConfig());
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSave = () => {
        setError(null);
        setSuccessMessage(null);
        const result = updateCELConfig(config);
        if (result.success) {
            setLastSavedConfig(config);
            setSuccessMessage("Config saved and WASM reloaded!");
            onSaved();
            setTimeout(() => setSuccessMessage(null), 3000);
        } else {
            setError(result.error || "Failed to save config");
        }
    };

    const handleUndo = () => {
        setConfig(lastSavedConfig);
        setError(null);
        setSuccessMessage(null);
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-color)" }}>
            <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    <Settings2 size={16} />
                    CEL Environment Config (YAML)
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        onClick={handleUndo}
                        disabled={config === lastSavedConfig}
                        className="action-button"
                        style={{
                            display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.6rem", fontSize: "0.75rem",
                            background: "rgba(255, 255, 255, 0.1)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", cursor: config === lastSavedConfig ? "not-allowed" : "pointer"
                        }}
                    >
                        <RotateCcw size={12} /> Undo
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={config === lastSavedConfig}
                        className="action-button"
                        style={{
                            display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.6rem", fontSize: "0.75rem",
                            background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "4px", cursor: config === lastSavedConfig ? "not-allowed" : "pointer"
                        }}
                    >
                        <Save size={12} /> Save & Apply
                    </button>
                </div>
            </div>
            {error && <div style={{ padding: "0.5rem 1rem", background: "rgba(239, 68, 68, 0.1)", color: "#f87171", fontSize: "0.75rem", borderBottom: "1px solid rgba(239, 68, 68, 0.2)" }}>{error}</div>}
            {successMessage && <div style={{ padding: "0.5rem 1rem", background: "rgba(16, 185, 129, 0.1)", color: "#34d399", fontSize: "0.75rem", borderBottom: "1px solid rgba(16, 185, 129, 0.2)" }}>{successMessage}</div>}
            <div style={{ flex: 1 }}>
                <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={config}
                    onChange={(val) => setConfig(val || "")}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineNumbers: "on",
                        roundedSelection: true,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                    }}
                />
            </div>
        </div>
    );
};
