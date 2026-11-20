// Dependency rule Gate: a context's domain model imports nothing outside its
// own domain directory - no adapter, application, delivery, framework,
// third-party, or Node built-in module. A domain's tests are not its model:
// they import the test runner, so the rule's source excludes them.
module.exports = {
  forbidden: [
    {
      name: "domain-imports-only-domain",
      comment: "a domain model is independent of delivery, storage, and frameworks",
      severity: "error",
      from: { path: "^src/([^/]+)/domain/", pathNot: "\\.test\\.ts$" },
      to: { pathNot: "^src/$1/domain/" },
    },
  ],
  options: require("./.dependency-cruiser.base.cjs"),
};
