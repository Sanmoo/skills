// Context boundaries Gate. A context imports another only through that
// context's index.ts, and only along a dependency the context map declares.
const { contexts } = require("./.dependency-cruiser.contexts.cjs");

const names = Object.keys(contexts);
const forbidden = names.flatMap((from) => {
  const others = names.filter((name) => name !== from);
  const undeclared = others.filter((name) => !contexts[from].dependsOn.includes(name));
  return [
    {
      name: `${from}-public-interface-only`,
      comment: `${from} may reach another context only through its index.ts`,
      severity: "error",
      from: { path: `^src/${from}/` },
      to: {
        path: `^src/(${others.join("|")})/`,
        pathNot: `^src/(${others.join("|")})/index\\.ts$`,
      },
    },
    ...(undeclared.length === 0
      ? []
      : [
          {
            name: `${from}-declared-dependencies-only`,
            comment: `${from} may depend only on ${contexts[from].dependsOn.join(", ") || "no context"}`,
            severity: "error",
            from: { path: `^src/${from}/` },
            to: { path: `^src/(${undeclared.join("|")})/` },
          },
        ]),
    {
      name: `${from}-not-on-delivery`,
      comment: `${from} must not depend on the delivery root`,
      severity: "error",
      from: { path: `^src/${from}/` },
      to: { path: "^src/(http/|main\\.ts$)" },
    },
  ];
});

forbidden.push({
  name: "delivery-public-interfaces-only",
  comment: "the delivery root reaches a context only through its index.ts",
  severity: "error",
  from: { path: "^src/(http/|main\\.ts$)" },
  to: { path: `^src/(${names.join("|")})/`, pathNot: `^src/(${names.join("|")})/index\\.ts$` },
});

module.exports = {
  forbidden,
  options: require("./.dependency-cruiser.base.cjs"),
};
