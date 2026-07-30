# Add an owned changelog

## Why

India Standards is now a maintained, metric-eligible Fleet website, but its
canonical same-origin `/changelog` route returns the application 404. Visitors
need a public, privacy-safe account of shipped product changes without gaining
access to the private repository or operational status documents.

## What changes

- Add a native `/changelog` page to the existing Next.js application.
- Publish only verified, user-visible milestones already recorded in
  `PROJECT_STATUS.md`.
- Reuse the tracked India Standards visual system and responsive shell.
- Link the page from the public application and keep Source and Roadmap pointed
  at the public repository and its GitHub Issues tracker.

## Out of scope

- A changelog CMS, release automation, or repository-history feed.
- Publishing raw data, private planning material, or unreleased work.
- Deployment, DNS, data, database, or runtime configuration changes.

## Impact

The change adds one static public route and one discoverability link. It does
not add dependencies or affect calculator queries.
