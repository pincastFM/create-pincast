# Changelog

Every release of `create-pincast`, newest first. The README's Versions section says what a patch, a minor and a major mean for this package. npm keeps the date of each release.

## 0.2.0

The command now runs from `@pincast/cli`, the package behind the `pincast` command, so `npm create pincast` and `pincast init` run the same code.

### Changed

- Installs `@pincast/cli` 0.1.0, pinned to that exact version, which installs `@pincast/api` 0.1.0 the same way. This package holds only the command's name.
- The starter app comes inside `@pincast/cli`, from the same commit of the example app (`192ebea`).
- What the command prints, the files it writes, the calls it makes and its exit codes are the same as in 0.1.0.

## 0.1.0

The first release.

### Added

- `npm create pincast [folder]`: copies the starter app Lantern Walk into a new or empty folder, makes one test app with no account, writes its key to `.env` (mode 600) and sets the app's id.
- Then it sends the starter's set and one collect for the test person `test_demo`. If either doesn't go through, the app is kept, and the command prints what's left to send.
- It never prints the key, never makes a second test app on its own, and takes back what it wrote when Pincast refuses.
