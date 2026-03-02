WASM_EXEC_PATH := $(shell go env GOROOT)/lib/wasm/wasm_exec.js

all: build copy_exec

build:
	GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o ../public/cel.wasm main.go

copy_exec:
	cp "$(WASM_EXEC_PATH)" ../public/wasm_exec.js

clean:
	rm -f ../public/cel.wasm ../public/wasm_exec.js
