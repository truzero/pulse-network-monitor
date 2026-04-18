# `src/features`

Feature-driven design: each subfolder is a **domain slice** (UI + local types + feature flags). Add new capabilities as `src/features/<feature-name>/` instead of scattering files by technical layer alone.

Current slices:

| Folder | Responsibility |
|--------|----------------|
| `process-runtime` | Processes, lifecycle, signaling |
| `port-registry` | Ports, listeners, bindings |
| `system-intelligence` | Cross-cutting diagnostics and summaries |
| `ui-shell` | Shared shell chrome and routing glue |

Keep every file **under 200 lines**; split modules when growth demands it.
