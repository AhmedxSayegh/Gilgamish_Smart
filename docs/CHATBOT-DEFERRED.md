# Deferred chatbot — saved user decisions

Recorded: 2026-10-25. This feature is intentionally outside the current implementation.

## Agreed purpose

An informational assistant on the home page. It answers questions such as “tell me about Damascus”, “what are the notable sights in Istanbul?”, and questions about using the site.

It must NOT generate or modify trip plans, reserve anything, compare flight/hotel prices, or act as the journey-planning agent. A conversational personal-recommendation feature would require a new explicit scope decision.

## Discussion saved for later

- The attached Colab notebook is a prototype similarity/ranking engine. It is not a language model, a city encyclopedia, or a ready-made RAG chatbot. The user asked to disregard it as a current dependency.
- OpenAI with optional web search was discussed, but not selected or implemented.
- Gemini with optional Google Search was suggested for a low-cost hosted option; account/region availability and current costs must be rechecked before selection. No provider was selected.
- Ollama was explained as a model runtime, not itself a language model. Local models can answer, but current facts require retrieval or a live source. Device performance and deployment requirements need testing.
- RAG would mean retrieving from curated sources before answering, not training the recommender or merely attaching the notebook.
- City history/culture should use reviewed sources; current place facts can use Google Places. Show sources and state uncertainty. No factual-accuracy guarantee was made.
- No chat UI, chat API, chat provider key, RAG index, or conversation storage has been implemented in this task.

## Resume only after backend/agent work

Reconfirm a provider/budget and deployment target. Implement the informational chatbot as a separate feature with read-only tools, source attribution, appropriate limits, and tests. Do not give it planning or booking tools.
