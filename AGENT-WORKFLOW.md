# Bounded journey agent — 17 October 2026

> Superseded on 26 October 2026 for language-model planning. Current planning uses local rules without Ollama or external LLMs. Read PROJECT-STATE.md and docs/RULE-BASED-PLANNING.md. Historical verification below does not describe the active engine.

> Historical checkpoint. The current implementation and user decisions are documented in PROJECT-STATE.md and docs/BACKEND-AGENT-PLAN.md (25 October 2026). The chatbot is deferred; flight/hotel vendors remain undecided.

The central orchestration code is `backend/src/services/journeyAgent.js`. This builds on the local model integration; no model training is performed.

1. Search flights/hotels/places through existing provider tools and ownership-protected routes.
2. Compare up to nine combinations from the three shortlisted flights and hotels. Base costs include flight, full-stay hotel and traveler allowances. A 15% activity reserve is a heuristic planning target, not verified activity pricing. Show three combined options alongside individual choices. Explicit traveler selections are preserved; without a selection the planner chooses the highest-ranked bundle.
3. Ask the configured model to choose activities; validate IDs and schedules. Local inference delegates scheduling to the deterministic scheduler.
4. Evaluate known costs, coverage of interests supported by candidate types, repeated visits and empty visitable days.
5. If goals are unmet, prioritize missing-interest or cheaper alternative candidates and send specific feedback to the model. Evaluate the revised plan, retain the highest-scoring valid result, and stop after three drafts or a repeated result. Upstream outages fail immediately; invalid plans are never saved.
6. Store the chosen valid plan with a compact decision report and show it in the plan page. Unmet goals are displayed as needing review. Unknown activity fees and unavailable interests are reported separately; schema checks do not establish factual accuracy or real-world feasibility.

Compatibility: `warnings_json` accepts the historical warning array or the new `{items, agent}` object. Repository reads always expose `warnings` as an array. Existing plans require no migration. Newly generated full plans have a report; manual/day/budget revisions do not inherit stale reports.

Validation: 34 backend tests pass, including controlled cases where feedback changes the second draft, repeated failures stop, selected offers are preserved, and provider outages do not fabricate inventory. Frontend build passes. The separate real-model and MySQL round-trip result is written to `D:\Codex-Sarh-Technology\local-ai-runtime\app-agent-verification.json` after deployment and execution. Travel providers remain in explicitly labeled mock mode until real credentials are configured. This is a bounded travel-planning agent, not an unrestricted autonomous assistant.
