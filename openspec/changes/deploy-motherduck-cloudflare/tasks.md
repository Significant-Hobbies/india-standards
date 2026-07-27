## 1. Hosting Contract

- [x] 1.1 Validate the aggregate relation allowlist and confirm no person-level table is present
- [x] 1.2 Store a separate revocable MotherDuck project token outside the repository
- [x] 1.3 Create the hosted database and verify schemas, row counts, manifest checks, and representative estimates

## 2. Runtime Adapter

- [x] 2.1 Add the Worker-compatible MotherDuck PostgreSQL client and environment contract
- [x] 2.2 Implement hosted metadata and estimate queries with bound parameters and bounded timeouts
- [x] 2.3 Preserve the local DuckDB path for ETL and parity tests
- [x] 2.4 Add hosted/local parity and controlled-failure tests

## 3. Cloudflare Build

- [x] 3.1 Add OpenNext and Wrangler configuration with current compatibility settings and generated types
- [x] 3.2 Add the requested custom-domain route, observability, and SHA-tagged deploy script
- [x] 3.3 Add a minimal CI workflow covering install, tests, typecheck, and production build

## 4. Release

- [x] 4.1 Run project tests, checks, and aggregate-data parity validation
- [x] 4.2 Create and push the private repository and confirm CI is green at `main`
- [x] 4.3 Pass the Fleet deployment guard without bypasses
- [x] 4.4 Store the MotherDuck token as a Cloudflare Worker secret and deploy the tagged revision
- [x] 4.5 Smoke-test the custom domain, metadata endpoint, and representative income thresholds

## 5. Documentation

- [x] 5.1 Document local ETL versus hosted serving responsibilities and secret setup
- [x] 5.2 Update `PROJECT_STATUS.md` with the hosted product, deployment evidence, and unresolved source limitations
