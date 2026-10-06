# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Read first

- **`GLOSSARY.md`** at the repo root. Single-context repo: one glossary, no `GLOSSARY-MAP.md`.
- **`docs/adr/`**: the ADRs that touch the area you're about to work in.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-NNNN (<decision title>), but worth reopening because…_
