// Static metrics Gate, cycles: zero dependency cycles between modules.
module.exports = {
  forbidden: [
    {
      name: "no-cycles",
      comment: "modules must not depend on each other in a cycle",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: require("./.dependency-cruiser.base.cjs"),
};
