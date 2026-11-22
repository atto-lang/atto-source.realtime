# Atto real-time backend: math/hash/cell candidate v1

This is a **backend bootstrap** repository, without a compiler or any
hard/soft real-time certification. These backend-owned Atto `.atto`
source modules are stage-0 inputs only. They do not implement a real-time
runtime, scheduler, memory allocator or source import resolver.

The signed-int math functions use no allocation or ambient host calls.
The noncryptographic hash step validates input and makes **at most 31
source loop iterations**, unlike an unbounded while loop. This is a
*source bound*, NOT an observed instruction count, verified WCET or timing
guarantee; an optimizing compiler might produce different code.
`cell` is a pure admission policy, never atomic synchronization, an
RT lock, Cell<T> or RefCell<T>.

The Python test pins exact source Git SHA-1 blobs, rejects obvious host
dependencies and checks reference vectors. It is source-free and cannot
establish compiler admission, AOT execution, determinism or cache/timing
behavior. Future promotion requires a real compiler, target-specific
bounded stack/heap, checked overflow, priority inversion testing,
synthetic worst-case workload timing and exact-head executed guest.
Guest status NOT_EXECUTED, real-time certification false.
