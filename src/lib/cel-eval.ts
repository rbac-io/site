import { run } from "@bufbuild/cel";
import { strings } from "@bufbuild/cel/ext";

declare global {
  interface Window {
    Go: new () => {
      importObject: Record<string, unknown>;
      run: (instance: WebAssembly.Instance) => void;
    };
    evaluateCELGo: (expression: string, context?: Record<string, unknown>) => EvaluationResult;
    getCELConfigGo: () => string;
    updateCELConfigGo: (config: string) => { success: boolean, error?: string };
    getCELPromptGo: (userPrompt?: string) => string;
  }
}

export type CELImplementation = "cel-es" | "cel-go";

export interface EvaluationResult {
  success: boolean;
  value?: unknown;
  error?: string;
  duration?: number;
  location?: {
    line: number;
    column: number;
  };
}

function parseErrorLocation(message: string, expression: string) {
  // Syntax errors often look like <input>:1:5: ...
  const match = message.match(/<input>:(\d+):(\d+):/);
  if (match) {
    return {
      line: parseInt(match[1], 10),
      column: parseInt(match[2], 10),
    };
  }

  // Heuristic for check errors like: "unresolved attribute 'foo'" or "undeclared reference to 'bar'"
  const unresolvedMatch = message.match(/(?:unresolved attribute|undeclared reference to|no such field) '([^']+)'/);
  if (unresolvedMatch && unresolvedMatch[1]) {
    const identifier = unresolvedMatch[1];
    const index = expression.lastIndexOf(identifier);
    if (index !== -1) {
      // Simple line/column calculation (assuming single line for now as most CEL is)
      const lines = expression.substring(0, index).split('\n');
      return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
      };
    }
  }

  return undefined;
}

export function evaluateCEL(expression: string, context: Record<string, unknown> = {}): EvaluationResult {
  const start = performance.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = run(expression, context as any, { funcs: strings });
    const duration = performance.now() - start;

    // Detect if result is a CEL error value (ErrVal) or an internal unresolved Val object
    const hasExprId = result && typeof result === 'object' && '_exprId' in result;
    const hasCause = result && typeof result === 'object' && '_cause' in result;
    const isErrorType = result && typeof result === 'object' && 'type' in result && typeof (result as Record<string, unknown>).type === 'object' && (result as Record<string, unknown>).type && typeof ((result as Record<string, unknown>).type as Record<string, unknown>).name === 'string' && ((result as Record<string, unknown>).type as Record<string, unknown>).name === 'error';

    if (hasCause || isErrorType || (hasExprId && !('value' in result))) {
      // Extract the error message if possible
      let message = (result as Record<string, unknown>).message as string | undefined;

      if (!message && hasCause) {
        const causes = (result as Record<string, unknown>)._cause;
        if (Array.isArray(causes) && causes.length > 0) {
          message = causes[0].message || "Runtime error: " + JSON.stringify(causes[0]);
        } else {
          message = "Evaluation error: runtime failure";
        }
      }

      if (!message && hasExprId) {
        message = ((result as Record<string, unknown>).message as string | undefined) || "Evaluation error (exprId: " + (result as Record<string, unknown>)._exprId + ")";
      }

      return {
        success: false,
        error: message || "Evaluation error",
        location: parseErrorLocation(message || "", expression),
        duration: parseFloat(duration.toFixed(2)),
      };
    }

    // Correctly unwrap Val objects if they exist
    const unwrappedValue = (result && typeof result === 'object' && 'value' in result && typeof (result as unknown as { value: unknown }).value === 'function')
      ? ((result as unknown as { value: () => unknown }).value)()
      : result;

    return {
      success: true,
      value: toPlainJS(unwrappedValue),
      duration: parseFloat(duration.toFixed(2)),
    };
  } catch (err: unknown) {
    const duration = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
      location: parseErrorLocation(message, expression),
      duration: parseFloat(duration.toFixed(2)),
    };
  }
}

let wasmLoaded = false;
let wasmLoadingPromise: Promise<void> | null = null;

export async function ensureWasmLoaded() {
  if (wasmLoaded) return;
  if (wasmLoadingPromise) return wasmLoadingPromise;

  wasmLoadingPromise = (async () => {
    try {
      if (!window.Go) {
        // Load wasm_exec.js dynamically
        const script = document.createElement("script");
        script.src = "/wasm_exec.js";
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const go = new window.Go();
      const response = await fetch("/cel.wasm");
      const buffer = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(buffer, go.importObject as WebAssembly.Imports);
      go.run(result.instance);
      wasmLoaded = true;
    } catch (err) {
      console.error("Failed to load WASM:", err);
      wasmLoadingPromise = null;
      throw err;
    }
  })();

  return wasmLoadingPromise;
}

export function evaluateCELWithGo(expression: string, context: Record<string, unknown> = {}): EvaluationResult {
  if (!wasmLoaded) {
    return {
      success: false,
      error: "CEL-Go WASM module not loaded yet",
    };
  }

  try {
    const result = window.evaluateCELGo(expression, context);
    return {
      ...result,
      value: result.value, // JSON bridge already handled normalization
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: "WASM Error: " + (err instanceof Error ? err.message : String(err)),
    };
  }
}

export function getInitialCELConfig(): string {
  if (!wasmLoaded) return "";
  return window.getCELConfigGo();
}

export function updateCELConfig(configYaml: string): { success: boolean, error?: string } {
  if (!wasmLoaded) return { success: false, error: "WASM module not loaded" };
  try {
    return window.updateCELConfigGo(configYaml);
  } catch (err: unknown) {
    return { success: false, error: "WASM Error: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export function getCELPrompt(userPrompt: string = ""): string {
  if (!wasmLoaded) return "";
  try {
    return window.getCELPromptGo(userPrompt);
  } catch (err) {
    console.error("WASM Error getting prompt:", err);
    return "";
  }
}

/**
 * Converts CEL-specific types (ArrayList, NativeMap, Uint8Array, ReflectMessageImpl)
 * to plain JavaScript types for standard JSON serialization.
 */
function toPlainJS(val: unknown): unknown {
  if (val === null || val === undefined) {
    return val;
  }

  // Handle BigInt
  if (typeof val === 'bigint') {
    return val.toString();
  }

  // Handle CEL ArrayList / Arrays
  if (Array.isArray(val)) {
    return val.map(toPlainJS);
  }

  // ArrayList from @bufbuild/cel is iterable but not an actual Array
  if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'ArrayList' && typeof (val as Iterable<unknown>)[Symbol.iterator] === 'function') {
    return Array.from(val as Iterable<unknown>).map(toPlainJS);
  }

  // Handle CEL NativeMap / Maps
  if (val instanceof Map) {
    const obj: Record<string, unknown> = {};
    val.forEach((v, k) => {
      obj[String(k)] = toPlainJS(v);
    });
    return obj;
  }

  // NativeMap from @bufbuild/cel has a _map property
  if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'NativeMap' && '_map' in val && (val as { _map: unknown })._map instanceof Map) {
    const obj: Record<string, unknown> = {};
    ((val as { _map: Map<unknown, unknown> })._map).forEach((v: unknown, k: unknown) => {
      obj[String(k)] = toPlainJS(v);
    });
    return obj;
  }

  // Handle Bytes (Uint8Array)
  if (val instanceof Uint8Array) {
    return "0x" + Array.from(val).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Handle Timestamps / Durations (ReflectMessageImpl)
  if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'ReflectMessageImpl') {
    const valObj = val as Record<string, unknown>;
    const typeName = (valObj.desc as { typeName?: string } | undefined)?.typeName;
    const fields = valObj.fields as Array<{ localName: string }> | undefined;
    const secondsField = fields?.find(f => f.localName === 'seconds');
    const nanosField = fields?.find(f => f.localName === 'nanos');

    const seconds = secondsField ? (valObj.get as (field: unknown) => unknown)(secondsField) : 0n;
    const nanos = nanosField ? (valObj.get as (field: unknown) => unknown)(nanosField) : 0;

    if (typeName === 'google.protobuf.Timestamp') {
      const s = Number(seconds || 0n);
      const n = Number(nanos || 0);
      return new Date(s * 1000 + n / 1000000).toISOString();
    }
    if (typeName === 'google.protobuf.Duration') {
      const s = Number(seconds || 0n);
      const n = Number(nanos || 0);
      return `${s + n / 1000000000}s`;
    }
  }

  // Handle objects recursively
  if (typeof val === 'object' && val.constructor === Object) {
    const obj: Record<string, unknown> = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        obj[key] = toPlainJS((val as Record<string, unknown>)[key]);
      }
    }
    return obj;
  }

  return val;
}
