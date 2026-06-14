# Local llama.cpp coding agent

Notes for running a local OpenAI-compatible model server on macOS and pointing Pi at it.

## Why this lives outside dotfiles

Keep dotfiles as the reproducible config layer. Do **not** put model repos, builds, logs, or GGUF files in this repo.

Recommended machine-local layout:

```text
~/Developer/local-ai/gemma4/
  repos/llama.cpp/          # upstream source + build artifacts
  models/                   # downloaded GGUF files
  logs/                     # llama-server logs
  start_server.sh           # local wrapper copied from dotfiles
```

Why this shape:

- `~/Developer/` sits outside iCloud Drive/Desktop/Documents, so iCloud should not sync or offload these files.
- `local-ai/` makes disk-heavy local AI assets easy to find, exclude from backups, or move to external storage.
- `gemma4/` isolates one experiment/model family. Qwen, Llama, etc. can get sibling dirs later.
- dotfiles only stores docs and small config snippets that should sync across machines.

On this MacBook Pro M5 Pro with 48 GB unified memory, start with a smaller context than the blog post's 64K:

```bash
-c 32768
```

If memory pressure is high, drop to:

```bash
-c 16384
```

## Install/build llama.cpp

```bash
brew install cmake git tmux python@3.11

mkdir -p ~/Developer/local-ai/gemma4/repos
cd ~/Developer/local-ai/gemma4

git clone https://github.com/ggml-org/llama.cpp repos/llama.cpp
cd repos/llama.cpp

cmake -B build \
  -DCMAKE_BUILD_TYPE=Release \
  -DGGML_METAL=ON \
  -DGGML_ACCELERATE=ON

cmake --build build --config Release -j
```

## Download Gemma 4 files

```bash
cd ~/Developer/local-ai/gemma4
python3.11 -m venv .venv
source .venv/bin/activate
pip install -U huggingface_hub hf_xet

mkdir -p models/unsloth-gemma-4-26B-A4B-it-GGUF

hf download unsloth/gemma-4-26B-A4B-it-GGUF \
  gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf \
  mmproj-BF16.gguf \
  MTP/gemma-4-26B-A4B-it-Q8_0-MTP.gguf \
  --local-dir models/unsloth-gemma-4-26B-A4B-it-GGUF
```

## Start server

Install the dotfiles wrapper into the machine-local workspace:

```bash
cp ~/dotfiles/llama-cpp/start_server.sh ~/Developer/local-ai/gemma4/start_server.sh
chmod +x ~/Developer/local-ai/gemma4/start_server.sh
```

Start it in tmux:

```bash
~/Developer/local-ai/gemma4/start_server.sh
```

Manual equivalent:

```bash
cd ~/Developer/local-ai/gemma4

repos/llama.cpp/build/bin/llama-server \
  -m models/unsloth-gemma-4-26B-A4B-it-GGUF/gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf \
  --model-draft models/unsloth-gemma-4-26B-A4B-it-GGUF/MTP/gemma-4-26B-A4B-it-Q8_0-MTP.gguf \
  --mmproj models/unsloth-gemma-4-26B-A4B-it-GGUF/mmproj-BF16.gguf \
  --spec-type draft-mtp \
  --spec-draft-n-max 3 \
  -ngl 999 \
  -fa on \
  -c 32768 \
  --parallel 1 \
  --host 127.0.0.1 \
  --port 8081
```

Use port `8081` by default so it does not collide with local SearXNG on `8080`.

Health check:

```bash
curl http://127.0.0.1:8081/v1/models
```

## Daily use

Start the server:

```bash
~/Developer/local-ai/gemma4/start_server.sh
```

The wrapper runs `llama-server` in tmux session `gemma4-server`.

Attach to logs:

```bash
tmux attach -t gemma4-server
```

Detach from tmux without stopping the server:

```text
Ctrl-b then d
```

Stop the server:

```bash
tmux kill-session -t gemma4-server
```

Check if the server is alive:

```bash
curl http://127.0.0.1:8081/v1/models
```

Check Pi can see the model:

```bash
pi --offline --list-models gemma
```

Expected model entry:

```text
provider      model                               context  max-out  thinking  images
gemma4-local  gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf  32.8K    8.2K     no        yes
```

Quick Pi smoke test:

```bash
pi -p --provider gemma4-local --model gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf \
  "/no_think
Say hi in 1 sentence and tell me what model you are."
```

Interactive Pi session:

```bash
pi --provider gemma4-local --model gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf
```

Then prompt with `/no_think` when you want concise answers:

```text
/no_think
what repo am I in?
```

## Pi provider snippet

Add this to `~/dotfiles/pi/models.json` when the server exists:

```json
{
  "providers": {
    "gemma4-local": {
      "name": "Gemma 4 local llama.cpp",
      "api": "openai-completions",
      "baseUrl": "http://127.0.0.1:8081/v1",
      "apiKey": "llama.cpp",
      "authHeader": false,
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        {
          "id": "gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf",
          "name": "Gemma 4 26B A4B Q4 XL local",
          "reasoning": false,
          "input": ["text", "image"],
          "contextWindow": 32768,
          "maxTokens": 8192,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

Also enable the model in `~/dotfiles/pi/settings.json`:

```json
"enabledModels": [
  "openai-codex/gpt-5.4",
  "openai-codex/gpt-5.5",
  "anthropic/claude-opus-4-7",
  "gemma4-local/gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf"
]
```

Run Pi against it:

```bash
pi --provider gemma4-local --model gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf
```

For Gemma, prepend `/no_think` for terse local-agent calls. Without it, Gemma may emit hidden/explicit reasoning and burn tokens before producing final content.

```bash
pi -p --provider gemma4-local --model gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf \
  "/no_think
Explain what this repository does"
```

## Verified on this Mac

Setup completed on 2026-06-13:

- MacBook Pro, Apple M5 Pro, 48 GB unified memory
- llama.cpp built from source with Metal/Accelerate
- Server context: `32768`
- Server port: `8081`
- Model dir size: about 19 GB
- Full workspace size: about 20 GB
- Direct API smoke test with `/no_think`: returned `OK`
- Pi smoke test with `/no_think`: returned `OK`
- Direct API observed generation speed during smoke test: roughly 86 tok/s

## Current baseline

This machine already has Ollama installed and working. llama.cpp is a separate path for faster/tunable local serving and OpenAI-compatible agent use.

Installed Ollama models observed on 2026-06-13:

- `gemma4:26b-a4b-it-q8_0`
- `qwen3.5:27b`
- `qwen3.5:9b`
