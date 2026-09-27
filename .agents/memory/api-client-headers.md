---
name: Generated API client headers
description: TypeScript lib settings needed by Orval-generated clients that iterate response Headers.
---

The shared generated API client uses `Headers.entries()`, so its TypeScript project must include `dom.iterable` alongside `dom`.

**Why:** The workspace's default DOM library omits iterable declarations, causing typecheck failures after codegen even though the generated client is valid at runtime.

**How to apply:** If codegen introduces `Headers.entries` errors, update the API client library compiler `lib` list before debugging generated code.