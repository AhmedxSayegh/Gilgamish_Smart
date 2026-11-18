# Local travel agent — 17 October 2026

> Superseded on 26 October 2026 for language-model planning. Current planning uses local rules without Ollama or external LLMs. Read PROJECT-STATE.md and docs/RULE-BASED-PLANNING.md. Historical verification below does not describe the active engine.

> Historical checkpoint. The current implementation and user decisions are documented in PROJECT-STATE.md and docs/BACKEND-AGENT-PLAN.md (25 October 2026). The chatbot is deferred; flight/hotel vendors remain undecided.

The planner uses the existing authenticated trip and recommendation routes. Travelers select from up to three flights and hotels; the server verifies their chosen offer IDs again before generation. With `AI_PROVIDER=ollama`, real model inference runs on this computer. Travel data remains synthetic until Amadeus and Google Places credentials are configured. This path does not depend on Colab.

The model chooses activity IDs and short reasons. Application code schedules 60-minute visits using arrival/departure buffers, known opening periods, and estimated transfer times. Invalid IDs, duplicates, excessive activity counts and impossible selections are rejected. The model gets one corrective attempt. Known activity costs are compared against the remaining budget for all travelers; unknown fees remain explicitly unknown. Existing fixed costs can already exceed the budget and retain the existing over-budget warning. No currency conversion is performed.

Local inference is limited to one concurrent generation in this application process. An additional request receives a retry message. The lock is released on success or error. Historical plan validation, versioning and ownership remain in the existing planner service. Reasons are model-generated and factual accuracy is not guaranteed by schema/time checks.

The planner identifies local AI separately from the sample-travel-data notice and explains that long trips take time. Arabic errors distinguish an unavailable runtime, busy model, incomplete generation and invalid choices.

Start the prepared local application:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File D:\Codex-Sarh-Technology\local-ai-runtime\start-gilgamish-agent.ps1
```

Open **http://localhost:4001**. This launcher overrides the port and allowed origin only in its child process. Restarting this app process is necessary after source changes. The original server on another port is not stopped.

Verification: 29 automated backend tests pass and the React production build passes. A real two-day Arabic model test passed with three activities in 66.6 seconds on the user's computer. The application/database acceptance check records its separate result at `D:\Codex-Sarh-Technology\local-ai-runtime\app-agent-verification.json` when successful. It creates a uniquely named test account and trip and retains those test records; its generated password and session are not logged. Live provider searches and bookings are unverified; no payments or bookings are implemented.
