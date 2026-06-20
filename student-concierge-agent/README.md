# Smart Student Academic Concierge 🚀
An advanced, highly resilient multi-agent graph assistant built using ADK 2.0. This application optimizes workflow routing for IT students by cleanly separating academic administration topics from technical engineering concepts, backed by robust local error-handling guardrails.

## 🏗️ System Architecture
The application leverages a conditional routing graph to dynamically guide user queries through specific functional nodes:
* **Query Classifier Node:** Evaluates incoming user text and applies string token mapping (`technical`, `academic`, or `unrelated`).
* **Academic FAQ Node:** Directs students to academic curriculum data, scheduling layouts, and internal assessment formats.
* **Technical Knowledge Node:** Interfaces with technical resources and utilizes a custom `FallbackMcpToolset` to guarantee zero-hallucination execution.
* **Decline Guardrail Node:** Politely filters out-of-scope prompts (e.g., lifestyle, movies) to minimize operational token costs.

## 🛠️ Fault Tolerance & Resiliency
To handle potential external server rate limits (`HTTP 429`) or communication failures (`HTTP 405`), the application incorporates an automated fallback handler (`fallback_tool_dictionary`). If an external tool layer becomes unavailable, the agent gracefully defaults to a localized technical mapping dictionary to consistently serve core command structures (such as Windows terminal utilities and lossless asset compression logic).

## 🚀 Local Deployment

1. **Clone the project & initialize dependencies:**
   ```bash
   uv sync