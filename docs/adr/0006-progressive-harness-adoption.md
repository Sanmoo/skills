# Adopt a Harness progressively without rewriting the existing application

We will extend `bootstrap-harness` with an existing-application path alongside its greenfield path, sharing the Gate Contracts rather than maintaining a second skill. Existing applications need protection for their next changes without first paying for a rewrite, complete debt removal, or an exhaustive investigation of business correctness. The decisions and implementation scope are captured in [issue #2](https://github.com/Sanmoo/skills/issues/2); this ADR records the accepted direction, not a claim that the skill already implements it.

The default regression contract is observed behavior. Adoption preserves useful tooling and architecture, and does not automatically change the application to fit the greenfield model. Only exceptionally strong evidence of an obvious error warrants a localized human decision; adoption is not a functional audit. Existing debt may be explicitly tolerated, but new or aggravated violations must fail, and accepted improvements tighten tolerance through reviewed changes. Counting findings alone is insufficient because replacing an old violation with a new one is still regression.

Large applications also require bounded validation costs. Adoption begins with a lightweight inventory and approved stages, measuring each scope before claiming protection. The two Entry Points remain the public validation interface; the full Entry Point supports validation by change and integral validation. Deterministic impact selection includes affected dependents, while expensive checks without reliable reduced scope may run periodically. A green change-validation result consequently makes a scoped claim, not a claim that the entire application was verified. Uncertain impact requires wider validation; if that exceeds the agreed budget, the result is inconclusive and non-zero rather than a silent omission or an unapproved expensive run.

## Considered Options

- **Require a rewrite or full greenfield conformance before adoption:** rejected because it makes protection contingent on eliminating the very legacy constraints adoption must accommodate.
- **Freeze a finding count or weaken thresholds without specific evidence:** rejected because a green result can then hide new violations or worsening behavior.
- **Run every Gate across the whole application on every change:** rejected because CI cost can make adoption impractical for very large applications.
- **Introduce another skill and separate Contracts:** rejected because the desired Harness and obligations are shared; the starting point and adoption process differ.

## Consequences

A Harness counts as established only when every Gate in the Gate Floor actually runs under the agreed scope and cadence, has a Gate Proof, and enforces the approved adoption criteria. This does not imply zero debt or all greenfield default thresholds. Missing, unexecutable, or vacuously passing Gates remain pending. A small regression e2e portfolio must still meet its Gate Contract, including executable Gherkin and reaching every context; exhaustive characterization is not required.

Periodic failures remain visible and require treatment in affected scopes, without automatically freezing demonstrably independent work. Security findings receive no automatic legacy exemption, but adoption does not add a security-governance process with mandatory risk owners, expiry dates, or recurring approval ceremonies. Thresholds, tolerated findings, scope selection, and cadence remain executable, versioned policy; Guides point to them, preserving [ADR 0001](0001-code-is-the-source-of-truth.md).
