# Planned incremental compilation — planned deterministic real-time compiler

**Status: BOOTSTRAP / DESIGN ONLY — no implemented compiler or executable guest evidence.**

This repository is currently a bootstrap/planned backend. There is no proven native hard-realtime source compiler or incremental verifier; forbid runtime JIT in strict realtime profiles without independent admission.

Shared goal: [atto-common-source PR #133](https://github.com/atto-lang/atto-common-source/pull/133), [atto-spec PR #213](https://github.com/atto-lang/atto-spec/pull/213), [cross-backend tracker #53](https://github.com/atto-lang/atto-compilers-parity-testing/issues/53).

## Future compilation-unit policy

A package may own many namespaces; an explicit namespace may span multiple verified source files **within the same pinned package**. A source file lacking a namespace header must be an independent per-file compilation unit, not part of an implicit global namespace. Its identity is pinned package instance plus normalized file/source-unit ID. A private/body edit rebuilds that file and known inlining/specialization consumers only; public API changes invalidate exactly the appropriate importers and dependent semantic proofs.

## Required bootstrap milestones

1. Implement a real source parser, verified package resolver, file/namespace graph, type/effect/ownership admission and actual backend emission before exposing incremental mode.
2. Separate target-neutral AST/MIR caching from backend codegen and final link/package effects. Bind persistent cache keys to compiler/target/toolchain version, source digests, public ABI and graph edges, feature flags, runtime profile and package resolution.
3. Ensure negative name resolution, macros/comptime, actors and hot-load generations invalidate correctly, with bounded SCC traversal and atomic output publication.
4. Prove clean and incremental actual compiled guests behave identically on canonical 10-files/3-namespaces + 2 unnamespaced source fixture; demonstrate editing one unnamespaced source does not recompile its sibling. Execute negative missing-import, corrupt-cache and ABI/signature tests.
5. Mark `NOT_IMPLEMENTED`/ `NOT_EXECUTED` until real source compiler and nonzero-step CI receipts exist. No private source transfer to unapproved CI carrier.

This PR is a future-compatibility checklist, not an implementation or compiler completion claim.
