# Spec/design document writing conventions — document-specific edge cases and When → Then criteria

**Recorded on:** 2026-10-05. **Observed during:** the session that produced
[`docs/superpowers/specs/2026-10-05-buoc-0-design.md`](../superpowers/specs/2026-10-05-buoc-0-design.md)
(the design document for Step 0 — the backend foundation). **Verification method:** direct observation
during the session — the project owner read the first draft, identified missing edge cases/criteria,
and the assistant reviewed the same file and found two actual ambiguities (beyond missing formatting).
This was not inferred from other documents.

**Validity:** this is a process convention, not a snapshot of metrics, so it does not expire over time.
Review it only if the project changes how specs are written (e.g. drops the When → Then format or changes
the `write-spec`/`brainstorming` skills).

## Convention

Every spec or design document in this project — whether a system/module spec in `docs/specs/` or a
step-specific design document in `docs/superpowers/specs/` — that **cites** a rule from a higher-level
spec (e.g. the system spec's SR#/S#/SE#) **must go beyond the citation**. It must also provide edge cases
and acceptance criteria in **When → Then** form for how the current document implements that rule,
considering its own technical choices, stack, or scope.

## Rationale (concrete evidence from 2026-10-05)

The first draft of the Step 0 design document cited the system spec's `SR8, S4, S5, S15, S16` for claiming
an `Idempotency-Key` with Drizzle + `FOR UPDATE SKIP LOCKED` and treated those citations as sufficient.
Reviewing the actual stack (Drizzle, Postgres, Testcontainers) revealed two issues that abstract
citations had concealed:

1. **An actual ambiguity, beyond missing formatting.** `SELECT ... FOR UPDATE SKIP LOCKED` returns zero
   rows in two very different situations: (a) the key has never existed — create it and proceed; (b) the
   key exists but another request holds its lock — return 409. The system spec's `S16` ("return 409 while
   in progress") is correct, but insufficient to implement the behavior correctly: a preceding
   `INSERT ... ON CONFLICT DO NOTHING` step is needed to remove that ambiguity. The omission became
   apparent only when When → Then criteria were written for the two steps (B0#1, B0#2 in the design
   document).
2. **A case never specified at the system level.** A server crash while holding a transaction for an
   `Idempotency-Key` leaves an "orphaned" `status = in_progress` in the database (the actual lock is
   released when the connection dies, but the stored status does not correct itself). The system
   spec's `SE2` covers expiry after the 24-hour retention window, but not this case. It emerges only
   when considering Postgres's specific transaction/connection behavior — a system-level spec written
   before choosing an ORM/database cannot anticipate it.

Both issues surfaced only when the document had to describe "how it actually works," rather than
merely list rule identifiers defined elsewhere.

## How to apply

**Limit changes to criteria/edge cases — do not refactor the entire file.** The rest of a design
document (goals, decisions, rationale, directory structure, risks, etc.) may remain free-form prose,
provided it reads naturally and clearly. Only the section listing system behavior under cited rules
needs to use the same two tables already used in `docs/specs/` (see the "Acceptance criteria" and "Edge
cases" sections at the end of `module-spec-identity-access.md`; there is no need to copy its full
`Observed on`/`Scope`/`Constraints`/`Business rules` structure):

- **Acceptance criteria — «When … then …»** (columns: # | Criterion | Cites, **in English**, one complete
  When → Then sentence per row) — for normal behavior/the main path.
- **Edge cases** (columns: # | Edge case | Expected | Cites, **in English**, NOT in When → Then form;
  use two short columns for the situation and expected behavior) — for race conditions, crashes and
  recovery, parallel tests contending for resources, or temporary seams/stubs that could escape their
  intended scope.

Assign document-specific identifier prefixes using `{prefix}#` (acceptance criteria, no suffix) and
`{prefix}E#` (edge cases). For example, the system spec uses `S#`/`SE#`, the Identity module uses
`I#`/`IE#`, and the Step 0 design document uses `B0#`/`B0E#`. This also applies when adding to or editing
V1 module specs (`docs/specs/module-spec-*.md`), not only step-specific design documents.

**Approaches tried and rejected on 2026-10-05** (to avoid repeating them): (a) mixing acceptance criteria
and edge cases into prose with bold labels (`D1`, `D2`, etc.) — the project owner pointed out that the
structure was wrong; (b) then overcorrecting by refactoring the entire file into the module spec's full
`Observed on`/`Scope`/`Constraints`/`Business rules` structure — the project owner clarified that only
the criteria/edge case sections needed changes; the rest should remain prose.

## Alignment with existing documents

This does not conflict with existing specs — `system-spec.md` and the `module-spec-*.md` files already
provide When → Then criteria for their own scope (the "Acceptance criteria" table in each spec). This
convention extends that requirement to narrower, more concrete documents (step-specific design
documents), which previously tended to cite higher-level rules without restating the behavior for
their own narrower scope.
