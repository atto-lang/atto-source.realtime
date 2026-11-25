# Repository AI agent instructions

<!-- org-merge-review-policy:begin -->
> **Canonical Atto PR governance:** [atto-lang/.github/AGENTS.md](https://github.com/atto-lang/.github/blob/main/AGENTS.md) is authoritative; this local summary never overrides effective branch protection, security CODEOWNERS, or required material CI.
>
> **One persistent human approval per PR:** Exactly one independent GitHub `APPROVED` review from **either** `the1mills` (GitHub ID `2148448`) **OR** `ORESoftware` (GitHub ID `11139560`) fills the human slot. Never require both. No self-approval; verify reviewer ID and active review state. Ordinary commits, rebases and merges from `main` do **not** demand another human approval. Dismissals, revocations, blocking `CHANGES_REQUESTED` and GitHub protections remain effective.
>
> **Ready age:** Follow the currently published central single-owner policy at every Ready age; no local AI quorum or age-tier override. [Central proposal #56](https://github.com/atto-lang/.github/pull/56) is a separate pending amendment, not active policy. If adopted centrally, update this summary and its tests to match. The mandatory competing/overlapping-PR audit applies before every merge.
>
> **Drafts and holds:** At ≥72 consecutive hours in the current genuine Draft cycle, automatic promotion requires passing exact-head material CI, verified current labels and no hard hold. `keep-as-draft`, `keep-draft` and `not-ready` prevent automatic promotion and automated merging. Never game the draft clock.
>
> **Security:** Approval policy text is not merge authorization or permission to export private source. Preserve all actual GitHub rules, CODEOWNERS restrictions, source-security checks and conflict/overlap review. If Actions cannot start, use only an authorized private SHA-verified Git-tree carrier, not cross-organization checkout tokens. Check the [legacy Oreslang migration map](https://github.com/ores-truffle-oreslang/.github/blob/main/governance/atto-migration-map.json) before duplicating features.
<!-- org-merge-review-policy:end -->

<!-- org-zero-step-ci-recovery:begin -->
> **MANDATORY ZERO-STEP CI RECOVERY (every PR and agent run):** Failed/cancelled Actions with zero actual steps, `steps=null`/`[]`, or no runner admission are **NOT_EXECUTED**, not compiler failures or passes. If the source org is out of Actions minutes, immediately look for a **different org with an authorized private carrier and available Actions capacity**; prove capacity using a source-free, stepful run. Private source **cannot** be checked out by the carrier's cross-org `GITHUB_TOKEN`: never provide PATs/tokens or secrets. **Only after authenticated independent authorization of exact source head/tree and destination owner/repo ID, readers, retention, and effective source export guard**, copy the Git tree through the GitHub connector to a temporary branch within that private carrier. Verify **every blob SHA, path, mode and complete root tree SHA** before stepful tests; carrier uses its **own local token and minutes**. **Explicit export DENIED/unapproved overrides this workflow: NO MIRROR, escalate.** Record source/carrier SHA, actual runner steps/results, and remaining `NOT_VERIFIED` coverage; never bypass reviews, protected main, or source policy. See [canonical mandatory zero-step runbook](https://github.com/atto-lang/.github/blob/main/governance/ci-zero-step-recovery.md).
<!-- org-zero-step-ci-recovery:end -->

