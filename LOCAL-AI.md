# Local AI setup

> Superseded on 26 October 2026 for language-model planning. Current planning uses local rules without Ollama or external LLMs. Read PROJECT-STATE.md and docs/RULE-BASED-PLANNING.md. Historical verification below does not describe the active engine.

The application supports `AI_PROVIDER=ollama` independently of `USE_MOCK_SERVICES`. Local generation sends requests only to a loopback Ollama server and requires no AI key. Travel APIs remain separate. No automatic cloud or mock fallback is used on a model error.

Configuration in `backend/.env`:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b-instruct
```

Keep `USE_MOCK_SERVICES=true` for fixture flights, hotels and places. The UI sample-data notice still applies even though inference is real. `/api/health` exposes `aiMode` separately from travel `mode`; it does not probe model readiness.

Runtime and model files are stored at `D:\Codex-Sarh-Technology\local-ai-runtime`. The setup worker writes `setup-status.json`, downloads the model, and attempts a real two-day Arabic itinerary test. Only phase `ready` means that test passed. A download still in progress is not a working installation.

After restarting Windows, start the local runtime:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File D:\Codex-Sarh-Technology\local-ai-runtime\start-local-ai.ps1
```

Then start the project normally with `npm run dev`. To resume a failed initial setup, run `finish-setup.ps1` in the same runtime folder. Do not start a second setup while the first is downloading. Logs and a validated `sample-plan.json` are kept there. Ollama is bound to 127.0.0.1 and cloud features are disabled by the launcher. No Windows auto-start entry is installed.

The model plans one day per request with up to 12 ranked candidate places, a bounded 8192-token context and a single repair attempt after an invalid schedule. Each day and the final schedule go through existing validators. Long trips can take several minutes. Budget totals are computed by application code; affordability is not guaranteed. Existing transfer times remain estimates. Runtime and model downloads require internet, but subsequent AI inference is local.

Verification before runtime download completion: 26 backend tests pass using controlled responses. Real performance and itinerary quality remain unverified until setup's model test completes and its output is reviewed.
