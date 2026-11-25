# Changelog

Each release of `create-pincast`, newest first. The README's Versions section explains what a patch, a minor and a major mean for this package. There are no dates here because npm keeps them.

## 0.2.0

The command now runs from `@pincast/cli`, the package behind the `pincast` command, so `npm create pincast` and `pincast init` run the same code.

### Changed

- Installs `@pincast/cli` 0.1.0, pinned to that exact version, and that package pins `@pincast/api` 0.1.0 the same way. This package holds only the command's name.
- The starter app comes inside `@pincast/cli`, copied from commit `c6393d4` of the example app, which uses `@pincast/placecard-kit` 1.6.1. The 0.1.0 starter came from `192ebea`, on 1.6.0.
- Apart from that kit version in the starter's `package.json` and `package-lock.json`, what the command prints, the files it writes, the calls it makes and its exit codes are the same as in 0.1.0.

## 0.1.0

The first release.

### Added

- `npm create pincast [folder]`: copies the starter app, Lantern Walk, into a new or empty folder. It makes one test app with no account, writes the app's key to `.env` (mode 600) and sets the app's id.
- A first run: the command sends the starter's set and one collect for the test person `test_demo`. If either doesn't go through, the app is kept and the command prints what's left to send.
- It never prints the key and never makes a second test app on its own. When Pincast refuses, it takes back what it wrote.
