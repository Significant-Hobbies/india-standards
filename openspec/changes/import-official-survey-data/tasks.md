## 1. Source admission

- [x] 1.1 Add a versioned PLFS 2025 source contract with the approved path, checksum, row count, required columns, code mappings, weight rule, and earnings reference periods.
- [x] 1.2 Add focused tests that reject checksum, header, row-count, and schema drift before a staging database can be admitted.

## 2. PLFS staging and validation

- [x] 2.1 Add a local-only PLFS staging command that reads the authorized CSV, normalizes supported fields, and writes only manifests, mappings, diagnostics, and joint aggregates.
- [x] 2.2 Validate category frequencies, exclusions, missingness, mutually exclusive earnings, weight scaling, eligible population totals, and high-income-tail support.
- [x] 2.3 Generate a machine-readable validation report and keep PLFS activation pending until all remaining activation gates pass.

## 3. PLFS uncertainty and sparse coverage

- [x] 3.1 Verify and document the PLFS 2025 stratum and PSU construction from the official survey materials.
- [x] 3.2 Implement the published PLFS 2025 analytic domain-total variance formula, reproduce an official estimate/RSE, and store interval summaries without retaining source rows.
- [x] 3.3 Add fixed representative-query and sparse-cell fixtures, including zero-support and high-income cases.
- [x] 3.4 Add and validate hierarchical back-off for exact zero-support PLFS filter combinations.
- [x] 3.5 Replace the coarse top-coded variance buckets with exact-income
  sufficient statistics and verify that supported high-income cutoffs query
  the admitted source faithfully.

## 4. NFHS height model

- [ ] 4.1 After DHS approval, add authorized NFHS recode admission, measured-height normalization, and survey-design validation.
- [ ] 4.2 Build conditional height aggregates with documented sparse back-off and an explicit out-of-coverage age policy.

## 5. Activation and documentation

- [x] 5.1 Prove that a PLFS-only staging database cannot switch the live calculator into fully `Survey-backed` mode.
- [x] 5.2 Update the data contract, acquisition guide, README, and project status with generated validation evidence and remaining blockers.
- [x] 5.3 Run the focused tests, full project check, and OpenSpec validation.
- [x] 5.4 Add a fail-closed `plfs_preview` serving gate over the aggregate-only staging manifest and required PLFS validation checks.
- [x] 5.5 Serve PLFS point estimates, official-formula ranges, denominators, support, and sparse back-off through the calculator API without a height multiplier.
- [x] 5.6 Replace demo and height language in the local UI/share card with PLFS 2025 preview provenance and the unresolved usage-scope disclosure.
- [x] 5.7 Add focused preview-gate, API/calculation, and no-height tests; run project checks and strict OpenSpec validation.
- [x] 5.8 Add ₹1 lakh income steps through ₹85 lakh, preserve existing shared
  cutoffs, and explain truthful plateaus in the control.
- [x] 5.9 Rebuild the local staging database, compare ₹30/₹50/₹60/₹65/₹75 lakh
  results, record storage impact, and rerun project/design checks.
