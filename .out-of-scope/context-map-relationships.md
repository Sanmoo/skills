# Relationship patterns in the context map

The request was to model strategic-DDD relationship patterns — customer-supplier,
anti-corruption layer, conformist, shared kernel — in the context map, alongside
the allowed dependencies the domain interview already collects.

The project declines this. The context map declares allowed dependencies and
nothing else.

## Why this is out of scope

The context map is not documentation; it is the configuration of the Context
boundaries Gate. The Gate reads it and fails a change that imports another
context off the declared edges or around its public interface. That is why the
map holds only what a Gate can decide: a directed, acyclic set of edges.

A relationship pattern is a different kind of claim. "Catalog is upstream of
Lending, and Lending protects itself with an anti-corruption layer" says
something about intent, about who may break whom, and about how a model is
translated — none of which a deterministic check can confirm or refute. Putting
it in the map would either leave the Gate silently ignoring most of its own
configuration or force a Gate to pretend it verified a judgment call. Both
outcomes violate the principle that the code is the source of truth and a Guide
or config holds only what code can express.

The patterns are also predictions. At day zero, before two contexts have evolved
against each other, calling a relationship "conformist" is a guess about
tomorrow; the allowed edges are the fact available today, and an ACL, when it
exists, is visible in the code as the module that does the translating.

## Prior requests

- #4: "bootstrap-harness: revisit context map relationship patterns"

## What would change this

Not usage volume on its own. It would take a relationship claim that a
deterministic check could decide — for example, a rule that the upstream context
must never import the downstream one, which is a directed edge the map can
already express. Until such a claim exists, the map stays a set of edges.
