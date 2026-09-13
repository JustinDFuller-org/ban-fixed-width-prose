## MODIFIED Requirements

### Requirement: Discovery excludes irrelevant repository content

Recursive discovery SHALL skip `.git`, dependency, generated, build, and coverage directories by default, SHALL exclude files ignored by standard Git rules during default repository scans, and SHALL support repeatable include and exclude path filters. Explicit file and directory paths remain intentional escape hatches and SHALL be scanned according to their explicit request unless filtered by the supplied include or exclude patterns.

#### Scenario: Ignored directory

- **WHEN** a recognized document exists below a skipped dependency or generated directory
- **THEN** the default recursive scan does not report findings from that document

#### Scenario: Git-ignored file

- **WHEN** a recognized document is excluded by the repository's standard Git ignore rules and is discovered through a default repository scan
- **THEN** the scan does not report findings from that document

#### Scenario: Explicit ignored source

- **WHEN** the user supplies an ignored recognized file or directory as an explicit source
- **THEN** the scan evaluates that source unless an include or exclude filter removes it

#### Scenario: Include and exclude filters

- **WHEN** the user supplies include or exclude patterns
- **THEN** only sources matching the resulting filters are scanned
