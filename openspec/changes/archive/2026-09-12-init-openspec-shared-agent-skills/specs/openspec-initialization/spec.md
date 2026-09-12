## Purpose

This capability establishes a repository-local, reviewable OpenSpec workflow so agents can manage behavior changes through shared instructions and synchronized specifications.

## ADDED Requirements

### Requirement: Repository provides shared OpenSpec agent workflows

The repository SHALL provide checked-in shared agent skills that describe how to propose, apply, verify, update, synchronize, and archive OpenSpec changes.

#### Scenario: Agent discovers the shared workflows

- **WHEN** an agent starts work in the repository
- **THEN** the repository contains the shared OpenSpec skills under `.agents/skills/` and a target marker identifying the OpenSpec integration

### Requirement: Repository provides an OpenSpec planning home

The repository SHALL provide OpenSpec configuration and planning directories for active changes, archived changes, and synchronized capability specifications.

#### Scenario: Agent creates or validates a change

- **WHEN** an agent invokes OpenSpec from the repository
- **THEN** OpenSpec resolves the repository configuration and has locations for active changes, archived changes, and capability specifications

