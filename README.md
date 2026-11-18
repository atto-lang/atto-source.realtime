# atto-source.realtime

Planned AttoLang real-time compiler/backend project. **Repository bootstrap only:** no compiler, runtime or real-time certification is implied by this README.

## Canonical AttoLang naming and specification

This is the canonical [atto-source.realtime](https://github.com/atto-lang/atto-source.realtime) home. Use `.atto` source, `atto-*` names, and `https://github.com/atto-lang/atto-source.realtime.git` for Git remotes. Historical naming is not part of current usage documentation.

- **Normative contract:** [atto-spec](https://github.com/atto-lang/atto-spec), including the versioned ownership, borrowing, equality, lifetime, effects and module-constant contracts. New implementation work must use these specs, not old backend examples.
- **Guest parity:** [atto-platform-conformance](https://github.com/atto-lang/atto-platform-conformance) and [atto-compilers-parity-testing](https://github.com/atto-lang/atto-compilers-parity-testing). Pin the exact source/tree and toolchain; distinguish passed, failed, unsupported and not-executed outcomes.
- **Shared and target requirements:** [atto-common-source](https://github.com/atto-lang/atto-common-source) and [atto-target-profiles](https://github.com/atto-lang/atto-target-profiles). Parser-only acceptance and host-only tests do not prove guest execution.

## What belongs here

- Deterministic real-time compiler admission/lowering, bounded timing and memory-effect analyses, real-time target constraints and code-generation experiments.
- Explicit hard/soft real-time capability profiles, failure modes and compiled-guest reproducibility fixtures.

## What belongs in other repositories

- `atto-runtime.realtime-java`: Java actor-scheduler latency/arena research and Java host characterization.
- `atto-source.java`, `atto-source.llvm`, `atto-source.net`, `atto-source.wasm`, `atto-source.forge` and `atto-source.cranelift`: their own compiler/runtime implementations.
- `atto-spec`: canonical language semantics; `atto-target-profiles`: shared target capability declarations; `atto-platform-conformance`: portable execution receipts.

## Safety and verification

- No claim of bounded worst-case execution, zero GC, scheduler fairness, AOT support, or isolation without target-specific **executed** evidence.
- Use canonical AttoLang `.atto` source and fail closed on unsupported operations rather than silently changing their semantics.
- Any implementation must pin exact source/tree SHA, compiler/toolchain, target, guest execution steps, positive and negative deadline/overflow/cancellation tests and explicit `passed` / `failed` / `unsupported` / `not executed` status.
- An empty CI job-step list or source-free host canary does not establish AttoLang guest behavior.

## Development status

This repository was empty when this README was authored. Proposed code must be reviewed, integrated with shared contracts, and verified in real target environments before feature claims.
