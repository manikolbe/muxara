# Integration Tests

This directory holds integration tests for the Muxara Rust backend. Each `.rs` file here is compiled as a separate crate that can only access the library's public API (`muxara_lib`).

## When to use integration tests

Use integration tests when you need to verify behavior **across modules** — e.g., testing the full pipeline from tmux output parsing through store reconciliation to frontend-ready `Session` objects. If you're testing a single function or module's internals, use inline `#[cfg(test)] mod tests` in the source file instead.

## Structure

```
tests/
├── README.md              This file
└── *.rs                   Each file is an independent integration test binary
```

For tests that share helpers, create a `tests/common/mod.rs` module:

```
tests/
├── common/
│   └── mod.rs             Shared test utilities (import via `mod common;`)
└── pipeline_test.rs       Example: end-to-end capture → classify → session
```

## Running

```sh
# Run all tests (unit + integration)
cargo test

# Run only integration tests
cargo test --test '*'

# Run a specific integration test file
cargo test --test pipeline_test
```

## Conventions

- Name test files descriptively: `<feature>_test.rs`
- Import the library as `use muxara_lib::...`
- Integration tests that require a live tmux server should be gated with `#[ignore]` and documented — run them explicitly with `cargo test -- --ignored`
