## Why

The repository needs a shared, checked-in OpenSpec workflow so agents can discover consistent proposal, implementation, verification, synchronization, and archival instructions. Establishing that foundation now makes future behavior changes reviewable and keeps the repository's specifications aligned with its automation.

## What Changes

- Initialize OpenSpec with the spec-driven schema and repository configuration.
- Add the shared `.agents/skills/` OpenSpec workflows for proposing, applying, verifying, updating, synchronizing, and archiving changes.
- Add the initial capability specification describing the repository's OpenSpec initialization and shared-agent workflow contract.

## Capabilities

### New Capabilities

- `openspec-initialization`: Provides the repository-local OpenSpec structure and shared agent workflows for spec-driven changes.

### Modified Capabilities

None.

## Impact

This adds repository configuration, agent instruction files, and OpenSpec planning/specification metadata. It does not change the product CLI, runtime behavior, or external APIs.
