# Counted static single-channel native C profile

Explicit `emitCountedSingle(source, 'c')` API. One bounded local i64 FIFO, literal count 0..16, one pure read projection, statically known ready topology, affine pending handle, checked runtime payloads. Four positive exact fixtures. Other six positive portable fixtures and seven invalid fixtures reject. No external producer, general actor scheduler, dynamic count or typed exhaustion. No heap allocation in generated entry; no WCET certification.
