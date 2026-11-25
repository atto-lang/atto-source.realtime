# Secure selectable actor DATA codecs — realtime target staged design

DESIGN_ONLY_NOT_EXECUTED. See canonical https://github.com/atto-lang/atto-spec/pull/228 and 22-case conformance https://github.com/atto-lang/atto-platform-conformance/pull/586.

Bootstrap target: reject all unsupported codecs until static allocation, bounded parsing and worst-case decode work are demonstrated. No dynamic codec loading; no hard real-time certification implied.

Preserve Sendable for local borrow/move/checked copy, separate Serializable per schema/format for DATA. MessagePack default on new serialized endpoints, Protobuf and CBOR first-class where supported, FlatBuffers optional verified immutable buffers. Preserve existing wire contracts. Reject unavailable codec/version, downgrade, implicit fallback and unauthorized schema/tenant/generation. Sealed runtime CONTROL is never user-serializable. No raw pointers, host or codec objects, reflection or arbitrary instantiation. Require bounded frame/expanded bytes, parser work, depth, collection sizes, credits and exactly-once rollback before enqueue; no partial publication.

Before enabling any codec: reconcile overlapping and mapped legacy PRs; document target capability gates, implement only reviewed bounded profiles, run actual target-specific positive and negative fixtures including malformed input, forged capabilities, stale generations, quota and cancellation tests, record exact tree/toolchain and independent security review. Host-only/source-only/zero-step tests do not establish guest conformance. No feature support is claimed.

The companion capability contract records that no serialized DATA endpoint is admitted on this bootstrap target. `MessagePack` is a proposed default only when a future supported endpoint exists; there is no implicit default or fallback now. Host tests verify the reference fail-closed admission policy, not a decoder or compiler. Registration, runtime dispatch and feature support stay disabled until compiled target evidence exists.
