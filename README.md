<div align="center">

<img src="./docs/assets/truzero-logo.svg" alt="Official TRUZERO logo — metallic chrome wordmark on black, sparkle mark lower-right" width="720"/>

# truzero // pulse

<p align="center"><strong>pulse network monitor</strong><br/>
Repository slug: <code>pulse-network-monitor</code></p>

**A high-performance, developer-centric process & port manager** built with **Rust** and **Tauri**.

[![pulse-network-monitor](https://img.shields.io/badge/GitHub-pulse--network--monitor-111?style=flat-square&logo=github)](https://github.com/truzero/pulse-network-monitor)
[![License: MIT](https://img.shields.io/badge/License-MIT-22d3ee?style=flat-square)](./LICENSE)
[![Rust](https://img.shields.io/badge/Rust-stable-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-desktop-24c8db?style=flat-square&logo=tauri)](https://tauri.app/)

[Architecture](./architecture.md) · [Roadmap](./architecture.md#roadmap)

</div>

---

## Why Pulse Exists

Modern development stacks leak **implicit state**: orphan services, duplicated listeners, zombie build tools, and ports that “should be free” but are not. Pulse turns that chaos into **clarity**—fast list views, decisive actions, and a mental model that matches how you already work.

## System Intelligence

Pulse is not another static process list. **System Intelligence** is the product layer that:

- **Resolves conflicts** by correlating listeners, PIDs, and bind addresses before you ship a fix.
- **Explains ownership** (“what actually holds this port?”) with OS-accurate evidence, not guesses.
- **Surfaces risk** with human-readable signals (duplicates, unsafe kills, privileged listeners) instead of silent failures.
- **Stays local**: diagnostics are computed on-device; no telemetry exfiltration by design.

This is the spine of Pulse: credible answers under load, tuned for developer workflows rather than enterprise dashboards.

## Principles

| Principle | What it means |
|-----------|----------------|
| **Fast by default** | Rust-native operations; UI stays responsive under churn. |
| **Least surprise** | Destructive actions are explicit, confirmed, and reversible where possible. |
| **Feature-first layout** | UI domains live in `src/features/*` for predictable navigation. |

## Repository Layout (initial)

```
src/features/
├── process-runtime/       # Lifecycle, signals, grouping
├── port-registry/         # Listeners, bindings, conflicts
├── system-intelligence/   # Heuristics, summaries, anomaly hints
└── ui-shell/              # Cross-feature shell and command surface
```

Rust and Tauri scaffolding lands in `src-tauri/` as the implementation hardens.

## Development

Canonical working copy for this effort lives at:

`~/Documents/GitHub Projects/Pulse App`

Bootstrap and build steps will be finalized after the Tauri workspace is generated. Until then, treat this repository as the **canonical product and security contract** for Pulse: see [`_vendor/cursor/rules/security.mdc`](./_vendor/cursor/rules/security.mdc).

**Cursor rules path on macOS:** some macOS configurations block creating a folder literally named `.cursor` inside `~/Documents` (privacy controls). Rules are vendored under `_vendor/cursor/rules/`. After cloning, materialize the standard layout from a regular terminal:

```bash
mkdir -p .cursor/rules
cp _vendor/cursor/rules/*.mdc .cursor/rules/
```

**Cursor indexing:** this repo ships [`cursorignore.template`](./cursorignore.template). Copy it to `.cursorignore` at the repository root (`cp cursorignore.template .cursorignore`) where your environment allows that filename.

## License

MIT — see [`LICENSE`](./LICENSE).
