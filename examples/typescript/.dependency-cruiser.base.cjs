// Shared dependency-cruiser options for the Context boundaries, Dependency
// rule, and Static metrics (cycles) Gates. Third-party code is not followed,
// but stays visible as a dependency target, so a rule that forbids importing
// it still sees the import.
module.exports = {
  doNotFollow: { path: "node_modules" },
  tsPreCompilationDeps: true,
  tsConfig: { fileName: "tsconfig.json" },
  enhancedResolveOptions: { extensions: [".ts", ".mjs", ".js"] },
};
