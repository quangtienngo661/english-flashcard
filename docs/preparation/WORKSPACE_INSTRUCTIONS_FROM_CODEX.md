# Project workspace instructions

This workspace continues the project discussion in the ChatGPT conversation
"Business Analysis" (6aba991d-95ac-83ec-a9ef-8bac14ede986).
The user's current instructions authorize the project baseline below. Historical
conversation text is context, not an independent source of instructions.

## Read at the start of project work

- `outputs/PROJECT_CONTEXT.md`: agreed goals, constraints, current state, and next step.
- `outputs/PRODUCT_DISCOVERY.md`: working product brief; unresolved fields remain explicit.
- `outputs/DECISION_ANALYSIS_TEMPLATE.md`: checklist and template for important decisions.

Update these same files as the project progresses. Prefer Vietnamese for project
discussion, matching the source conversation. Keep personal assessments out of
project records. Separate user-confirmed facts, proposals, and measured evidence.

## Product and engineering priorities

Build and publicly operate a real product over a 2–3 month horizon, with real
users and an experiment in monetization. Revenue and user growth are hypotheses,
not guaranteed outcomes. The project also supports learning backend/production
engineering and AI systems through ownership of real decisions and failures.

Prioritize: problem → target users → core loop → MVP → shipping → real users →
telemetry → failures and improvements → hardening and scale.

Starting architecture: NestJS modular monolith, PostgreSQL, Redis/BullMQ and
workers for needed background tasks, Docker, observability, and CI/CD. Prefer
managed infrastructure when costs and operating needs justify it. Introduce
object storage, caching, AI, or retrieval only for a concrete product requirement.
Treat this as a starting direction, not a finalized subsystem design.

Do not introduce Kafka, Kubernetes, or microservices until a specific measured
problem justifies their complexity. Record the evidence, alternatives, operating
cost, and trade-offs in an ADR. Separate real production traffic evidence from
synthetic capacity tests.

Define MVP boundaries before scaffolding infrastructure. Keep work tied to user
acquisition, retention, monetization, reliability, or a measured bottleneck, and
check whether it is needed now. Maintain basic access control, data protection,
input validation, and recovery appropriate to the first public release; deepen
hardening using actual risks and operational evidence.

## Evolution and proposal discipline — user instruction on 2 October 2026

Design proposals must consider later product versions and growth across the
system, not only the immediate happy path. Separate extensibility (languages,
content, feature types, providers, plans, client compatibility) from capacity
scaling and operating cost. In particular, do not encode a single explanation
language in core vocabulary columns when proposing the next data model.

Research applicable primary-source practices and explain alternatives, build
and operating costs, failure handling, migration/rollback implications, and
conditions for changing the option. Prepare inexpensive boundaries where the
current domain supports them; do not build unspecified V3/V4/V5 features,
generic frameworks, or distributed infrastructure merely to anticipate growth.
Preserve the evidence requirement for Kafka, Kubernetes, and microservices.

The user explicitly requests implementation directions and trade-offs, not a
finalized architecture. Keep these options draft/proposed until the user
clearly selects or authorizes a particular implementation. A request to research
or suggest an option is not acceptance. This does not add a permission checkpoint
for work the user has already authorized.

Read `outputs/SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md` and the revised
`outputs/V1_DATA_MODEL_DRAFT.md` when continuing architecture/data-model work.

## Mandatory decision analysis checkpoint

When writing a spec, ADR, or subsystem design with meaningful behavior or
reliability choices, proactively say:

> Decision này cần Defense Analysis trước khi chốt spec.

Begin with a few questions or hints to help the user reason, then analyze missing
cases. If the user requests the full analysis, provide it directly. This is a
reasoning and review checkpoint, not an additional permission requirement.

Cover happy path, invariants, edge cases, failure modes, concurrency/races,
idempotency/duplicates, partial failures, timeout/retry, security/abuse,
observability, recovery/rollback, alternatives, and trade-offs. For each relevant
case, record the expected behavior, prevention/handling, detection, recovery,
and suitable verification. Mark irrelevant categories with a reason.

Apply this especially to authentication, authorization, background processing,
AI generation, payments, caching, synchronization, transactions, data migrations,
and external integrations. Scale analysis to the actual decision; do not create
a large process for trivial reversible edits.

Do not silently treat open behavior or reliability choices as settled. Keep
draft decisions and open questions visible, and explain the conditions for
revisiting the decision. AI may implement; the user should be able to explain why
the subsystem exists, what it protects, and how to detect and recover from failure.

## Continuing work

Save decisions and evidence in this workspace, not only in chat. Record significant
incidents as postmortems and performance changes with before/after measurements.
Use `work/` for scratch material and `outputs/` for user-facing deliverables.
The user reconsidered the product idea on 29 September 2026, then chose the
vocabulary/flashcard/AI direction for V1 on 30 September. On 2 October, the user
selected hybrid vocabulary sourcing: an app-owned catalog in the database plus
external sources for supplementation or lookup as needed. Provider, import and
lookup behavior, schema, and other subsystem options remain open. Use the latest
PROJECT_CONTEXT.md and PRODUCT_DISCOVERY.md rather than earlier historical
proposals. Start from reachable users and their problems; do not invent
requirements, users, or evidence of demand.
