// The TypeScript source trees the naming and static metrics Gates measure. They
// live here so a new tree cannot be added to one Gate and missed by another;
// tsconfig.json lists the same trees for compilation and cannot import this
// module, so keep the two in step.
export const SOURCE_TREES = ["src", "features", "test"];
