# Cinematic TV readiness implementation plan

> Execute inline using superpowers:executing-plans; regression tests before implementation, with captured RED/GREEN evidence.

**Goal:** A reproducibly tested, SDK-ready v0.4.0 candidate and safe local signing/install workflow.
**Architecture:** Retain model/platform/app layers; add small pure QoL and safety modules. Public Tizen APIs only; no watcher. Browser tests load actual served files, with explicit native API mocks.
**Tech Stack:** JavaScript, HTML/CSS, Node 22 tests, Python Playwright, Tizen Web CLI, PowerShell local deployment.
**Spec:** ../specs/2026-10-28-tizen-readiness.md

## Global constraints
Preserve Cinematic layout and UK English. Keep package CinemTV001, app CinemTV001.Launcher. No silent source/audio changes on arbitrary focus by default. Signing remains local and Samsung-authorised. No hardware claims from mocks.

## Review focus
- Late native callbacks after timeout must not cause uncontrolled source changes.
- Repeated OK, long OK on non-editable controls and a native overlay losing key-up must not swallow actions or launch twice.
- Catalogue updates during a modal/move/input edit must not reset focus or destroy work.
- Imported JSON must reject unbounded/untrusted values and never enable experimental preview silently.
- A failed weather/image request or failed storage write must leave usable offline Home controls.

## Tasks
1. Baseline: compare archive hashes to GitHub, reproduce clean build/icon omission; add manifest/asset/CI contract tests; restore asset and narrow manifest.
2. HDMI/launch/remote reliability: add failing callback, input and browser regressions; implement safe controller, single launch ownership and focus-preserving refresh.
3. QoL: test pure previous-item/profile/wallpaper/input/backup/recovery logic; implement local module, setup and settings integration.
4. Network/privacy: test HTTPS and schema edge cases, stale weather and old response cancellation; implement secure image loading and explicit network states.
5. Build/deployment: strict WGT structure/identity checks and scripts; SDK download attempt; local doctor/sign/install/run with no embedded secrets; CI from fresh checkout.
6. Review/document/package/publish: run complete gate, inspect screenshots, review source/Actions, commit new feature branch, verify pushed tree and CI status; report device/signing gates precisely.
