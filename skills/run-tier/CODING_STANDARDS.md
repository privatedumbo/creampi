# Coding Standards

Principles every worker must follow when implementing an issue. Read the project's `CONTEXT.md` for domain vocabulary and `docs/adr/` for architectural decisions before writing code.

---

## Testing

### Core Principle

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't break unless behavior changed.

### Good Tests

Integration-style tests that exercise real code paths through public APIs. They describe _what_ the system does, not _how_. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

```typescript
// GOOD: Tests observable behavior through the public interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

- Test behavior users/callers care about
- Use the public API only
- Survive internal refactors
- One logical assertion per test

### Bad Tests

```typescript
// BAD: Mocks internal collaborator, tests HOW not WHAT
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});

// BAD: Bypasses the interface to verify via database
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});
```

Red flags:

- Mocking internal collaborators (your own classes/modules)
- Testing private methods
- Asserting on call counts/order of internal calls
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means (e.g. querying a DB) instead of through the interface

### Mocking

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Time/randomness
- File system or databases when a real instance isn't practical

**Never mock your own classes/modules or internal collaborators.** If something is hard to test without mocking internals, redesign the interface.

Prefer SDK-style interfaces over generic fetchers at boundaries — each function is independently mockable with a single return shape, no conditional logic in test setup.

### TDD Workflow: Vertical Slices

**DO NOT write all tests first, then all implementation.** This is "horizontal slicing" — treating RED as "write all tests" and GREEN as "write all code." It produces tests that verify _imagined_ behavior and are insensitive to real changes.

Correct approach — one test, one implementation, repeat:

```
RED→GREEN: test1→impl1
RED→GREEN: test2→impl2
RED→GREEN: test3→impl3
```

Each test responds to what you learned from the previous cycle. Never refactor while RED — get to GREEN first.

### Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```

---

## Interface Design

### Deep Modules

Prefer **deep modules**: small interface, deep implementation. A few methods with simple params hiding complex logic behind them.

```
Deep module (good):          Shallow module (avoid):
┌──────────────┐             ┌──────────────────────────────┐
│  Small I/F   │             │       Large Interface        │
├──────────────┤             ├──────────────────────────────┤
│              │             │  Thin Implementation         │
│  Deep Impl   │             └──────────────────────────────┘
│              │
└──────────────┘
```

When designing, ask: can I reduce the number of methods? Can I simplify the parameters? Can I hide more complexity inside?

**The deletion test.** Imagine deleting the module. If complexity vanishes, the module wasn't hiding anything — it was a pass-through. If complexity reappears across N callers, the module was earning its keep.

### Key Vocabulary

Use these terms precisely when thinking about structure:

- **Module** — anything with an interface and an implementation (function, class, package, slice)
- **Interface** — everything a caller must know: types, invariants, error modes, ordering, config. Not just the type signature
- **Depth** — leverage at the interface. A lot of behaviour behind a small interface = deep. Interface nearly as complex as the implementation = shallow
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place
- **Leverage** — what callers get from depth
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place

### Design for Testability

1. **Accept dependencies, don't create them** — pass external dependencies in rather than constructing them internally
2. **Return results, don't produce side effects** — a function that returns a value is easier to test than one that mutates state
3. **Small surface area** — fewer methods = fewer tests needed, fewer params = simpler test setup

### Principles

- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test _past_ the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it.
- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, swappable parts — they just aren't part of the interface.

---

## Refactoring

After all tests pass, look for refactor candidates:

- Extract duplication
- Deepen modules (move complexity behind simple interfaces)
- Apply SOLID principles where natural
- Consider what new code reveals about existing code
- Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.
