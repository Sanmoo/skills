// The dependency graph validation by change reads to find the files that
// depend on a change. It forbids nothing; the Gates have their own configs.
module.exports = { forbidden: [], options: require("./.dependency-cruiser.base.cjs") };
