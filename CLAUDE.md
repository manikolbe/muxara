# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Muxara is a lightweight desktop application that serves as a control plane for developers running multiple parallel Claude Code sessions. It provides a persistent, always-visible dashboard showing session cards with status, context, and quick-switch capabilities. It builds on top of tmux as the session execution layer.

## Architecture (Planned)

- **Desktop framework**: Tauri (Rust backend + web frontend)
- **Frontend**: React + Tailwind CSS — card-based layout with two-pane cards (recent context + orientation metadata)
- **Backend**: Rust (via Tauri commands) — interfaces with tmux to discover, monitor, and manage sessions
- **Session layer**: tmux — Muxara does not replace tmux, it builds a control/observability layer on top of it

### Data Flow

UI requests session list -> Tauri backend queries tmux -> parses output and derives state -> returns structured session objects -> UI renders cards. This loop refreshes every 1-2 seconds.

## Key Concepts

- **Session cards**: Each Claude Code session is represented as a card with identity, status (running/blocked/idle), recent conversation tail, and attention signals
- **Attention model**: Sessions are categorized by whether they need user intervention, are actively progressing, or are safe to ignore. Status is inferred from runtime signals, not manual annotations
- **New session flow**: A "+" button provisions a tmux session, starts Claude Code in it, and auto-adds it to the dashboard

## Design Constraints

- Optimized for single-monitor setups — compact, always-on-top window that doesn't dominate screen space
- Scales gracefully with growing number of sessions
- Reduces cognitive load rather than adding process overhead
- Intended for open-source publication under the name "Muxara"

## Current State

The project is pre-implementation. `plan.md` contains the full product brief and design vision. No code has been written yet.
