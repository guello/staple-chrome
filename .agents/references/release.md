# Release

How a version leaves this repository, and what is still unfinished for the first one. Check the current state with `git remote -v`, `git tag` and `gh repo view --json visibility` before assuming anything below is still true.

## Cutting a version

1. Bump `version` in both `package.json` and `manifest.json`. They have to match: `scripts/package.mts` names the zip from `package.json`, and the store reads `manifest.json`.
2. `pnpm package`. It runs `pnpm check`, `pnpm test` and `pnpm build`, then zips `dist/` into `staple-chrome-<version>.zip` at the repository root. The zip is gitignored.
3. Load `dist/` unpacked once and exercise each command by hand. The gates never touch a Chrome API, so a green `pnpm package` says nothing about whether the extension works.
4. Commit with the repository's conventional style (`chore: release vX.Y.Z`), tag `vX.Y.Z`, push the tag, then create the GitHub release with the zip attached.

Commits are signed through git's `ssh-keygen` signer. Never disable signing. Never run a history-writing command without being asked for it in the current turn.

## Still open for v1

- The local clone has no `origin`. `github.com/guello/staple-chrome` exists but is private, so shipping means adding the remote, pushing `main`, and flipping visibility to public rather than running `gh repo create`.
- No `v0.1.0` tag and no GitHub release yet.
- Not submitted to the Chrome Web Store.

## Chrome Web Store submission

Manual and not scriptable from here: it needs a developer account, a one-time registration fee, and a review that takes days.

1. Sign in to the Developer Dashboard with the account that will own the listing and pay the one-time registration fee if it is a first submission.
2. Create a new item and upload `staple-chrome-<version>.zip`.
3. Fill the store listing: description, category, language, at least one 1280 by 800 screenshot, and the 128px icon (already in `media/icons/`).
4. Complete the privacy tab. The single justification needed is `storage`, used to keep the user's own settings and the in-memory tab history. The extension collects nothing, sends nothing, and makes no network request, so every data usage question is a no.
5. Submit for review and expect a wait measured in days. A rejection usually names the permission or the listing field at fault.
6. After the listing is live, replace the install section in `README.md` with the store link.
