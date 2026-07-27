# Official data acquisition

Last checked: 2026-07-27

The application database stores only validated aggregates. Authorized survey
files are controlled local ETL inputs under `data/sources/`, which is
gitignored. Do not commit, redistribute, or expose person-level files through
the application.

## Acquisition status

| Source | Public files acquired | Person-level data | Status |
| --- | --- | --- | --- |
| PLFS 2025 | Layout, schedules, field manuals, code list, README, and the official `PLFStxt2csv2025.zip` helper | Authorized CSV acquired locally | Technical validation passes; powering a local preview while usage-scope review remains pending |
| NFHS-5 2019–21 | Public survey reports and dataset inventory are available | Not yet | DHS project request submitted; approval pending |

The PLFS helper downloaded from the official catalog is a ZIP containing a
Windows PyInstaller executable. It passed ZIP integrity checks and has SHA-256:

```text
d4ed5924fdbd6c42c662082b49c6836ab50d5245fe06071b06cbf56fec9ee6f6
```

It was inspected as an archive and was not executed. It contains the conversion
application, not the protected PLFS person-level files.

The official public methodology note, `PLFS_changes_in_2025_Final.pdf`, is also
stored with the source documentation. Its SHA-256 is:

```text
58bfbabe3c5efa99df00ec6799f683a21c0d0ffd7a88011eb20aa3f1584c7c15
```

It documents the revamped SRSWOR design and analytic variance estimator used
from January 2025.

The official Annual Report 2025 is stored as the published point/RSE validation
fixture with SHA-256:

```text
134bf2de5e4b1142d3bae4899c90ec5be3bf5ec03a2ff4b3f7b0bba34eee0da7
```

## PLFS 2025

Study:
<https://microdata.gov.in/NADA/index.php/catalog/284>

Data access:
<https://microdata.gov.in/NADA/index.php/catalog/284/get-microdata>

The authorized combined person CSV is stored locally at:

```text
data/sources/plfs-2025/PLFS_2025.csv
```

It contains 1,148,634 person records and has SHA-256:

```text
6c5b6a2433dd79d7b16b93fe55aa3a6d7028232146865981f526f62d181083da
```

Do not run the supplied Windows converter. The importer must validate the CSV
against the official layout, preserve the published visit variables, and
document the earnings reference periods and survey-weight transformation.
The supplied README limits intended use of the unit-level data to labour-market
analysis, so activation also requires a documented usage-scope decision.

## NFHS-5

Dataset inventory:
<https://dhsprogram.com/data/dataset/India_Standard-DHS_2020.cfm?flag=0>

Registration:
<https://dhsprogram.com/data/new-user-registration.cfm>

Access instructions:
<https://dhsprogram.com/data/Access-Instructions.cfm>

For the smallest adult-height acquisition, request the All-India Stata recodes:

- `IAIR7EDT.ZIP` — Individual Recode for eligible women.
- `IAMR7EDT.ZIP` — Men's Recode for eligible men.

Place approved downloads in:

```text
data/sources/nfhs-5/microdata/
```

The importer must verify the survey-specific codebook before relying on
standard candidates such as age, state/region, urban/rural area, height, sample
weight, cluster, and stratum. Weight scaling and complex-survey design must be
validated against the NFHS report.

Suggested access request:

> Project title: India Standards Calculator — aggregate demographic estimates
> with cross-survey height modelling.
>
> Purpose: Produce non-identifying aggregate conditional height distributions
> by gender, age band, State/UT, and urban/rural area for an educational Indian
> demographic calculator. The calculator will combine these aggregates with
> separately licensed PLFS demographic aggregates. It will not redistribute
> microdata, expose record-level output, identify respondents, predict dating
> success, or make city-level claims. Source files will remain in controlled
> local storage; the runtime product will contain only aggregate model
> parameters, support counts, and uncertainty bounds.

The request has been submitted and remains pending DHS review. Do not share DHS
credentials or downloaded microdata through the application repository.
