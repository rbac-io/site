import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Sparkles, Code2, Pencil } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { EvaluationResult } from "../../lib/cel-eval";
import { getCELPrompt } from "../../lib/cel-eval";
import { ConfigEditor } from "./ConfigEditor";

interface CELEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    result: EvaluationResult | null;
    onConfigSaved?: () => void;
    apiKey?: string;
}

export const CELEditor = ({ value, onChange, result, onConfigSaved, apiKey }: CELEditorProps) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPromptDialog, setShowPromptDialog] = useState(false);
    const [promptInput, setPromptInput] = useState("");

    const handleGenerateSubmit = async () => {
        if (!promptInput.trim()) return;
        if (!apiKey) {
            alert("Please configure your Gemini API Key in the Settings menu first.");
            return;
        }

        setIsGenerating(true);

        try {
            const rawPrompt = getCELPrompt(promptInput);
            console.log("SENDING TO LLM: ", rawPrompt);
            const { generateCELExpression } = await import("../../lib/gemini");
            const generatedExpression = await generateCELExpression(apiKey, rawPrompt);

            onChange(generatedExpression);
            setIsGenerating(false);
            setShowPromptDialog(false);
            setPromptInput("");
        } catch (e: unknown) {
            console.error("Generation error:", e);
            const msg = e instanceof Error ? e.message : String(e);
            alert("Failed to generate expression: " + msg);
            setIsGenerating(false);
        }
    };

    const handleFormat = async () => {
        const { formatCEL } = await import("../../lib/cel-format");
        const formatted = formatCEL(value);
        onChange(formatted);
    };

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // Register custom theme
        monacoInstance.editor.defineTheme('celTheme', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '569cd6' },
                { token: 'string', foreground: 'ce9178' },
                { token: 'number', foreground: 'b5cea8' },
            ],
            colors: {
                'editor.background': '#1e1e1e',
            }
        });

        // Set the custom theme
        monacoInstance.editor.setTheme('celTheme');

        // Update markers if there's an error
        const model = editor.getModel();
        if (result && !result.success && result.location && model) {
            const markers = [{
                message: result.error || 'Evaluation error',
                severity: monacoInstance.MarkerSeverity.Error,
                startLineNumber: result.location.line,
                startColumn: result.location.column,
                endLineNumber: result.location.line,
                endColumn: result.location.column + 1,
            }];
            monacoInstance.editor.setModelMarkers(model, 'cel', markers);
        }
    };

    useEffect(() => {
        if (editorRef.current && monacoRef.current) {
            const editor = editorRef.current;
            const monaco = monacoRef.current;
            const model = editor.getModel();

            if (result && !result.success && result.location) {
                let endColumn = result.location.column + 1;

                if (model) {
                    // Simple check for word end if it's an identifier
                    const lineContent = model.getLineContent(result.location.line);
                    const remainingLine = lineContent.substring(result.location.column - 1);
                    const wordMatch = remainingLine.match(/^[a-zA-Z0-9_]+/);
                    if (wordMatch) {
                        endColumn = result.location.column + wordMatch[0].length;
                    }

                    // If endColumn exceeds line length, cap it
                    endColumn = Math.min(endColumn, lineContent.length + 1);
                }

                monaco.editor.setModelMarkers(model!, "cel", [
                    {
                        startLineNumber: result.location.line,
                        startColumn: result.location.column,
                        endLineNumber: result.location.line,
                        endColumn: endColumn,
                        message: result.error || "Evaluation error",
                        severity: monaco.MarkerSeverity.Error,
                    },
                ]);
            } else {
                monaco.editor.setModelMarkers(model, "cel", []);
            }
        }
    }, [result]);

    return (
        <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="section-header" style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Code2 size={16} />
                        CEL Expression
                    </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        onClick={handleFormat}
                        className="action-button"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.75rem",
                            background: "rgba(59, 130, 246, 0.1)",
                            color: "#60a5fa",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        Format
                    </button>
                    <button
                        className="action-button"
                        title="Generate Expression"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            padding: 0,
                            background: "rgba(168, 85, 247, 0.1)",
                            color: "#c084fc",
                            border: "1px solid rgba(168, 85, 247, 0.2)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                        onClick={() => {
                            setShowPromptDialog(true);
                        }}
                    >
                        <Sparkles size={14} />
                    </button>
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className="action-button"
                        title={isConfigOpen ? "Hide Config" : "Edit Config"}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            padding: 0,
                            background: isConfigOpen ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.05)",
                            color: isConfigOpen ? "#34d399" : "var(--text-secondary)",
                            border: "1px solid " + (isConfigOpen ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)"),
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        <Pencil size={14} />
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, position: "relative" }}>
                <div style={{ display: isConfigOpen ? "none" : "block", height: "100%" }}>
                    <Editor
                        height="100%"
                        defaultLanguage="proto"
                        value={value}
                        onChange={onChange}
                        onMount={handleEditorDidMount}
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
                {isConfigOpen && (
                    <div style={{ height: "100%" }}>
                        <ConfigEditor onSaved={() => onConfigSaved && onConfigSaved()} />
                    </div>
                )}
                {showPromptDialog && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
                        <div className="glass-panel" style={{ padding: "1.5rem", width: "400px", maxWidth: "90%", display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <Sparkles size={16} color="#c084fc" />
                                Generate Expression
                            </h3>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                Describe what you want to achieve with CEL and we'll generate the expression for you.
                            </p>
                            <textarea
                                value={promptInput}
                                onChange={(e) => setPromptInput(e.target.value)}
                                placeholder="e.g. Check if the user is an admin..."
                                style={{
                                    width: "100%", padding: "0.75rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)",
                                    borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.875rem", minHeight: "100px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box"
                                }}
                                disabled={isGenerating}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <button
                                    onClick={() => setShowPromptDialog(false)}
                                    disabled={isGenerating}
                                    style={{
                                        padding: "0.5rem 1rem", fontSize: "0.8rem", background: "transparent", color: "var(--text-secondary)",
                                        border: "1px solid var(--border-color)", borderRadius: "6px", cursor: isGenerating ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateSubmit}
                                    disabled={isGenerating || !promptInput.trim()}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "0.5rem",
                                        padding: "0.5rem 1rem", fontSize: "0.8rem", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc",
                                        border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "6px", cursor: (isGenerating || !promptInput.trim()) ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {isGenerating ? "Generating..." : "Generate"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
