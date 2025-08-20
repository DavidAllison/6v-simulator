# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive SDLC documentation in CLAUDE.md
- GitHub Actions CI/CD workflow
- Project README with setup instructions
- CHANGELOG for version tracking

## [1.0.0] - 2025-08-20

### Added
- Initial release of 6-Vertex Model Simulator
- Core physics engine implementing Monte Carlo dynamics
- DWBC High and Low pattern generators
- Interactive web interface with React/TypeScript
- Multiple visualization modes (paths, arrows, vertices)
- Debug tools for flip analysis
- Performance optimization with efficient data structures
- Comprehensive test suite

### Fixed
- Ice rule validation for all vertex types
- Flip transformations (b1→c2 correction)
- Off-diagonal flip support for proper Arctic region formation
- UI contrast and readability issues
- DWBC pattern generation accuracy

### Changed
- Repository structure organized with proper documentation folders
- Consolidated duplicate implementations
- Improved error handling with React Error Boundaries

### Removed
- 29 unnecessary debug and test files
- Duplicate DWBC implementations
- Redundant test scripts

## [0.9.0] - 2025-08-19

### Added
- Initial implementation of 6-vertex model
- Basic DWBC pattern generation
- Canvas-based visualization
- Monte Carlo simulation engine

### Known Issues
- Diagonal-only flipping limitation
- Incorrect b1→c1 transformation
- UI styling issues on some pages

---

## Version History

- **1.0.0** - First stable release with all physics corrections
- **0.9.0** - Beta release for testing