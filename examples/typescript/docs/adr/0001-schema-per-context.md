# 1. One Postgres, one schema per context

Each context owns its infrastructure, but at this size a database server per context costs more to run than it buys. Lending owns the `lending` schema and Catalog the `catalog` schema, in one Postgres instance; neither context reads the other's schema, and each adapter creates only its own. Splitting into one instance per context later means moving a schema, not untangling shared tables.
