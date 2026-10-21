// Gate: Dependency rule.
//
// A context's domain model imports nothing but its own domain modules:
// no framework, no storage adapter, no node built-in, no other context.
import { depcruise } from "./depcruise.mjs";
import { outputOf, report } from "./lib.mjs";

const DOMAIN_CONTEXTS = ["catalog", "lending"];

const rules = DOMAIN_CONTEXTS.map((context) => ({
  name: `${context}-domain-is-independent`,
  comment: `the ${context} domain model may import only src/${context}/domain/`,
  severity: "error",
  from: { path: `^src/${context}/domain/`, pathNot: `\\.test\\.ts$` },
  to: { pathNot: `^src/${context}/domain/` },
}));

const failures = [];
const result = depcruise(rules);
if (result.status !== 0) failures.push(outputOf(result));

report("Dependency rule", failures);
