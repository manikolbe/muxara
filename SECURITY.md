# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | Yes                |

## Reporting a Vulnerability

If you discover a security vulnerability in Muxara, please report it responsibly using **GitHub Security Advisories**:

1. Go to [muxara/muxara Security Advisories](https://github.com/muxara/muxara/security/advisories/new)
2. Click **"New draft security advisory"**
3. Fill in the details of the vulnerability

This creates a private report visible only to the maintainers. Please do **not** open a public issue for security vulnerabilities.

## What to Expect

- **Acknowledgment** within 48 hours of your report
- **Assessment** within 7 days, with an initial severity determination
- **Resolution** timeline communicated after assessment — typically within 30 days for confirmed vulnerabilities
- Credit in the release notes (unless you prefer to remain anonymous)

## Scope

This security policy covers the Muxara application itself:

- The Tauri desktop application (Rust backend and React frontend)
- The tmux integration layer
- The session state classifier
- The preferences and configuration system

The following are **out of scope** (report to their respective maintainers):

- tmux
- iTerm2
- Claude Code
- Tauri framework
- macOS / operating system issues

## Best Practices

When reporting, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
