# Trending Developers Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Trending Developers tab beside the existing repository feed and refresh both datasets through CI.

**Architecture:** Keep the app static. Add `data/trending-developers.js`, load it in `index.html`, render segmented tabs in `script.js`, and extend `scripts/update-trending.mjs` to fetch both GitHub Trending repositories and developers.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Node.js fetch in GitHub Actions.

---

### Task 1: Data And Rendering

**Files:**
- Create: `data/trending-developers.js`
- Modify: `index.html`
- Modify: `script.js`
- Modify: `styles.css`

- [ ] Add developers data loading before `script.js`.
- [ ] Add segmented tabs and developer grid containers.
- [ ] Render repository and developer feeds from their data files.
- [ ] Add developer detail modal content using the existing modal surface.
- [ ] Style developer cards, avatars, and active tab states.

### Task 2: Fetcher And CI

**Files:**
- Modify: `scripts/update-trending.mjs`
- Modify: `.github/workflows/update-trending-landing.yml`
- Modify: `README.md`

- [ ] Parse `https://github.com/trending/developers?since=daily`.
- [ ] Write `data/trending-developers.js`.
- [ ] Commit both data files from the workflow.
- [ ] Document the new developers data path.

### Task 3: Verification

**Files:**
- No deliverable files required.

- [ ] Run JS syntax checks.
- [ ] Run the updater against GitHub.
- [ ] Verify local render has repo cards, developer cards, and both detail modals.
- [ ] Commit and push.
