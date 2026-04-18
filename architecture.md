# Pulse — Architecture

**truzero // pulse** is a high-performance, developer-centric process and port manager implemented as a Rust core with a Tauri desktop shell. This document defines structural intent at bootstrap.

## Principles

1. **Feature-driven layout**: Domain code lives under `src/features/<feature-name>/`.
2. **Thin boundaries**: The native layer owns privileged operations; the UI owns presentation; IPC is explicit and typed end-to-end.
3. **Observable by default**: Mutating actions emit structured events suitable for auditing (without leaking secrets).

## Architectural manifesto

- **Feature-driven design**: organize by domain under `src/features/<feature-name>/`, not only by technical layer.
- **The 200-line rule**: no file exceeds 200 lines; split modules early.
- **Strict typing**: TypeScript `strict` mode, no `any`, and **Zod** for runtime validation (especially Supabase-shaped payloads and IPC boundaries).

## Target layout (initial)

```
pulse/
├── architecture.md
├── README.md
├── LICENSE
├── .gitignore
├── docs/
│   └── assets/
├── src/
│   └── features/
│       ├── process-runtime/
│       ├── port-registry/
│       ├── system-intelligence/
│       └── ui-shell/
└── src-tauri/
```

Tauri scaffolding will add `src-tauri/`; front-end stays under `src/`. Rust modules may mirror features under `src-tauri/src/`.

## Process and port model (draft)

- **Process**: Stable ID, OS pid, command line, state, and safe lifecycle actions.
- **Port**: Protocol, bind address, port, owning process when resolvable, conflict detection.

## Threat assumptions

The operator is trusted; the app must not broaden attack surface beyond local dev workflows. Environment secrets are never echoed in logs or telemetry by default.

## Roadmap

- **R0 — Bootstrap**: Repo, docs, Cursor rules, feature skeleton.
- **R1 — Tauri skeleton**: `src-tauri`, minimal window, typed IPC stubs.
- **R2 — Port registry MVP**: Enumerate listeners and map port to process.
- **R3 — Process runtime MVP**: List processes and safe signals with confirmations.
- **R4 — System intelligence**: Conflict detection, summaries, actionable diagnostics.
- **R5 — Hardening**: Tests, IPC hardening, packaging, polish.

Ship a trustworthy read-only system view before scaling mutating actions.
