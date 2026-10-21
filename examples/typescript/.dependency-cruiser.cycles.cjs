"use strict";

// Static metrics Gate: zero dependency cycles between modules.
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "A cycle between modules means neither can be understood alone.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(node_modules|dist|reports|coverage|\\.stryker-tmp)" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
  },
};
