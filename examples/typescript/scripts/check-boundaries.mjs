// Gate: Context boundaries.
//
// The context map below is the declaration the Gate enforces: an entry lists
// the contexts a context may call. Edges are directed; the map must be
// acyclic. `http` is the delivery/composition root, not a bounded context.
//
// Cross-context calls go through the callee's public interface,
// src/<context>/index.ts, and nothing else.
import { depcruise } from "./depcruise.mjs";
import { outputOf, report } from "./lib.mjs";

export const CONTEXT_MAP = Object.freeze({
  catalog: [],
  lending: ["catalog"],
  http: ["catalog", "lending"],
});

function assertAcyclic(map) {
  const visiting = new Set();
  const visited = new Set();
  const problems = [];

  function visit(context, trail) {
    if (visiting.has(context)) {
      problems.push(`declared dependencies form a cycle: ${[...trail, context].join(" -> ")}`);
      return;
    }
    if (visited.has(context)) return;
    visiting.add(context);
    for (const dependency of map[context] ?? []) {
      visit(dependency, [...trail, context]);
    }
    visiting.delete(context);
    visited.add(context);
  }

  for (const context of Object.keys(map)) visit(context, []);
  return problems;
}

function boundaryRules(map) {
  const rules = [];
  for (const [context, allowed] of Object.entries(map)) {
    for (const other of Object.keys(map)) {
      if (other === context) continue;
      if (allowed.includes(other)) {
        rules.push({
          name: `${context}-uses-${other}-public-interface`,
          comment: `${context} may call ${other} only through src/${other}/index.ts`,
          severity: "error",
          from: { path: `^src/${context}/` },
          to: { path: `^src/${other}/`, pathNot: `^src/${other}/index\\.ts$` },
        });
      } else {
        rules.push({
          name: `${context}-does-not-depend-on-${other}`,
          comment: `the context map declares no ${context} -> ${other} dependency`,
          severity: "error",
          from: { path: `^src/${context}/` },
          to: { path: `^src/${other}/` },
        });
      }
    }
  }
  rules.push({
    name: "source-does-not-import-tests",
    comment: "production code never imports the test tree",
    severity: "error",
    from: { path: "^src/", pathNot: "\\.test\\.ts$" },
    to: { path: "^test/" },
  });
  return rules;
}

const failures = assertAcyclic(CONTEXT_MAP);
if (failures.length === 0) {
  const result = depcruise(boundaryRules(CONTEXT_MAP));
  if (result.status !== 0) failures.push(outputOf(result));
}

report("Context boundaries", failures);
