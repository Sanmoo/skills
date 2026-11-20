// The context map: every bounded context, whether it is core, and the contexts
// it may depend on. It is the Context boundaries Gate's declaration; the
// Mutation Gate reads `core` from it for the core-context threshold. Loading
// it fails when the declared dependencies are not acyclic.
const contexts = {
  catalog: { core: false, dependsOn: [] },
  lending: { core: true, dependsOn: ["catalog"] },
};

function assertAcyclic(map) {
  const state = {};
  const visit = (name, path) => {
    if (state[name] === "done") return;
    if (state[name] === "visiting")
      throw new Error(`context map has a cycle: ${[...path, name].join(" -> ")}`);
    state[name] = "visiting";
    for (const next of map[name]?.dependsOn ?? []) {
      if (!(next in map)) throw new Error(`context map names an unknown context: ${next}`);
      visit(next, [...path, name]);
    }
    state[name] = "done";
  };
  for (const name of Object.keys(map)) visit(name, []);
}
assertAcyclic(contexts);

module.exports = { contexts };
