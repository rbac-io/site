package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"syscall/js"
	"time"

	"github.com/google/cel-go/cel"
	"github.com/google/cel-go/common/env"
	"github.com/google/cel-go/policy"
	"go.yaml.in/yaml/v3"
)

//go:embed config.yaml
var configYaml []byte

var celEnv *cel.Env

func main() {
	config := &env.Config{}
	err := yaml.Unmarshal(configYaml, config)
	if err != nil {
		fmt.Printf("Failed to unmarshal config: %v\n", err)
		return
	}

	var errEnv error
	celEnv, errEnv = cel.NewEnv(
		cel.OptionalTypes(),
		policy.FromConfig(config),
	)
	if errEnv != nil {
		fmt.Printf("Failed to create CEL env: %v\n", errEnv)
		return
	}

	js.Global().Set("evaluateCELGo", js.FuncOf(evaluateCELGo))
	js.Global().Set("getCELConfigGo", js.FuncOf(getCELConfigGo))
	js.Global().Set("updateCELConfigGo", js.FuncOf(updateCELConfigGo))
	js.Global().Set("getCELPromptGo", js.FuncOf(getCELPromptGo))
	fmt.Println("CEL-Go WASM initialized")

	// Keep the program running
	select {}
}

func evaluateCELGo(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return map[string]any{
			"success": false,
			"error":   "expression argument required",
		}
	}

	expression := args[0].String()
	contextMap := make(map[string]any)

	if len(args) > 1 && !args[1].IsNull() && !args[1].IsUndefined() {
		jsonStr := js.Global().Get("JSON").Call("stringify", args[1]).String()
		err := json.Unmarshal([]byte(jsonStr), &contextMap)
		if err != nil {
			return map[string]any{
				"success": false,
				"error":   fmt.Sprintf("failed to parse context: %v", err),
			}
		}
	}

	start := time.Now()
	ast, iss := celEnv.Compile(expression)
	if iss.Err() != nil {
		return map[string]any{
			"success":  false,
			"error":    iss.Err().Error(),
			"duration": float64(time.Since(start).Microseconds()) / 1000.0,
		}
	}

	program, err := celEnv.Program(ast)
	if err != nil {
		return map[string]any{
			"success":  false,
			"error":    fmt.Sprintf("failed to create program: %v", err),
			"duration": float64(time.Since(start).Microseconds()) / 1000.0,
		}
	}

	out, _, err := program.ContextEval(context.Background(), contextMap)
	duration := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		return map[string]any{
			"success":  false,
			"error":    err.Error(),
			"duration": duration,
		}
	}

	// Convert result to plain JS-friendly type via JSON
	nativeVal, err := out.Value(), nil // simplified for now
	_ = nativeVal

	// For complex types, use a JSON bridge
	jsonBytes, err := json.Marshal(out.Value())
	if err != nil {
		// Fallback to string representation if JSON fails
		return map[string]any{
			"success":  true,
			"value":    fmt.Sprintf("%v", out.Value()),
			"duration": duration,
		}
	}

	var resultVal any
	json.Unmarshal(jsonBytes, &resultVal)

	return map[string]any{
		"success":  true,
		"value":    resultVal,
		"duration": duration,
	}
}

func getCELConfigGo(this js.Value, args []js.Value) any {
	return string(configYaml)
}

func updateCELConfigGo(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return map[string]any{
			"success": false,
			"error":   "config argument required",
		}
	}

	newConfigStr := args[0].String()
	newConfig := &env.Config{}
	err := yaml.Unmarshal([]byte(newConfigStr), newConfig)
	if err != nil {
		return map[string]any{
			"success": false,
			"error":   fmt.Sprintf("failed to parse config yaml: %v", err),
		}
	}

	newEnv, errEnv := cel.NewEnv(
		cel.OptionalTypes(),
		policy.FromConfig(newConfig),
	)
	if errEnv != nil {
		return map[string]any{
			"success": false,
			"error":   fmt.Sprintf("failed to create CEL env from config: %v", errEnv),
		}
	}

	celEnv = newEnv
	configYaml = []byte(newConfigStr)
	return map[string]any{
		"success": true,
	}
}

func getCELPromptGo(this js.Value, args []js.Value) any {
	if celEnv == nil {
		return ""
	}
	prompt, err := cel.AuthoringPrompt(celEnv)
	if err != nil {
		fmt.Printf("Failed to generate authoring prompt: %v\n", err)
		return ""
	}

	userPrompt := ""
	if len(args) > 0 && !args[0].IsUndefined() && !args[0].IsNull() {
		userPrompt = args[0].String()
	}

	return prompt.Render(userPrompt)
}
