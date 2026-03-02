import Editor from "@monaco-editor/react";
import { Database } from "lucide-react";

interface ContextEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
}

export const ContextEditor = ({ value, onChange }: ContextEditorProps) => {
    return (
        <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="section-header" style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)" }}>
                <Database size={16} />
                Context (JSON)
            </div>
            <div style={{ flex: 1 }}>
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={value}
                    onChange={onChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        theme: "vs-dark",
                        padding: { top: 12, bottom: 12 },
                    }}
                />
            </div>
        </div>
    );
};
