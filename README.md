# atto-source.realtime

Planned AttoLang real-time compiler/backend project. **Repository bootstrap only:** no compiler, runtime or real-time certification is implied by this README.

## What belongs here

- Deterministic real-time compiler admission/lowering, bounded timing and memory-effect analyses, real-time target constraints and code-generation experiments.
- Explicit hard/soft real-time capability profiles, failure modes and compiled-guest reproducibility fixtures.

## What belongs in other repositories

- `atto-runtime.realtime-java`: Java actor-scheduler latency/arena research and Java host characterization.
- `atto-source.java`, `atto-source.llvm`, `atto-source.net`, `atto-source.wasm`, `atto-source.forge` and `atto-source.cranelift`: their own compiler/runtime implementations.
- `atto-spec`: canonical language semantics; `atto-target-profiles`: shared target capability declarations; `atto-platform-conformance`: portable execution receipts.

## Safety and verification

- No claim of bounded worst-case execution, zero GC, scheduler fairness, AOT support, or isolation without target-specific **executed** evidence.
- Preserve AttoLang `.atto` and legacy Oreslang `.ores` compatibility where applicable; reject unsupported dynamic operations rather than changing semantics silently.
- Any implementation must pin exact source/tree SHA, compiler/toolchain, target, guest execution steps, positive and negative deadline/overflow/cancellation tests and explicit `passed` / `failed` / `unsupported` / `not executed` status.
- An empty CI job-step list or source-free host canary does not establish AttoLang guest behavior.

## Development status

This repository was empty when this README was authored. Proposed code must be reviewed, integrated with shared contracts, and verified in real target environments before feature claims.
