# Releasing create-pincast

A tag `v<version>` on main publishes the package to npm through `.github/workflows/publish.yml`, with provenance. npm trusts that workflow by its file name, so no npm token is stored anywhere.

The package depends on one exact version of `@pincast/cli`, which depends on one exact version of `@pincast/api`. Those go to npm first, in that order. The Publish workflow stops if the pinned `@pincast/cli` isn't there.

0.1.0 was published by hand, so the package exists on npm and trusted publishing can be set up for any release.

## Every release

1. If `@pincast/cli` has a new version, move the pin in `package.json` to it. Until that version is on npm, `npm run link-cli` puts your local checkout of `pincast-cli` in `node_modules`, after checking it holds the pinned version. Run `npm run link-api` in that checkout first.

2. Run the tests:

   ```sh
   npm install
   npm test
   ```

3. Write the changelog entry. The script reads the commit subjects since the last tag, and any move of the `@pincast/cli` pin, then suggests the version by the rule in the README (Versions).

   ```sh
   npm run changelog                       # prints the entry and the version
   npm run changelog -- --write            # adds it to CHANGELOG.md and sets package.json's version
   npm run changelog -- --write --version 0.3.0   # the same, with a version you choose
   ```

   A moved pin counts as at least a patch. When `@pincast/cli`'s own change was bigger, pass that version with `--version`. Edit the entry so each line says what changed for someone running `npm create pincast`.

4. Commit, push main, and wait for CI to pass.

5. Set up trusted publishing if it isn't set up yet (the next section), then tag that commit and push the tag on the same day.

   ```sh
   git tag -a v0.2.0 -m v0.2.0
   git push origin v0.2.0
   ```

   The Publish workflow checks that the tag names package.json's version, that the changelog has an entry for it, and that the pinned `@pincast/cli` is on npm. It runs the tests, then publishes. When the version is on npm already, it says so, skips the publish, and passes.

## Trusted publishing

A new trusted publisher expires if it hasn't published within 2 days. So set it up on the day you tag.

On npmjs.com, signed in as `pincast`, open the package `create-pincast`, then Settings, then Trusted publishing, and choose GitHub Actions. Enter these, save, and approve with the account's security key:

| Field | Value |
|:-|:-|
| Organization or user | `pincastFM` |
| Repository | `create-pincast` |
| Workflow filename | `publish.yml` |
| Environment name | leave it empty |

The same from a terminal with Node 22.14.0 or later and npm 11.15.0 or later, signed in as `pincast`:

```sh
npm login --auth-type=web --registry https://registry.npmjs.org
npm trust github create-pincast --repo pincastFM/create-pincast --file publish.yml --allow-publish
npm trust list create-pincast
npm logout --registry https://registry.npmjs.org
```

Then tag (Every release, step 5). The workflow publishes with provenance. To see the provenance record:

```sh
npm view create-pincast@0.2.0 dist.attestations --registry https://registry.npmjs.org
```

If the 2 days pass first, remove the trusted publisher on the same settings page, add it again, and tag.

## By hand, if the workflow can't publish

The owner of the npm account `pincast` publishes, and approves it with the security key. Each npm step that needs the account prints a link. Open it, sign in as `pincast`, and approve.

```sh
npm view @pincast/cli@0.1.0 version --registry https://registry.npmjs.org      # 0.1.0
git clone https://github.com/pincastFM/create-pincast.git
cd create-pincast
npm install --no-package-lock --registry https://registry.npmjs.org
npm test
npm pack                           # writes create-pincast-0.2.0.tgz and prints its shasum
npm login --auth-type=web --registry https://registry.npmjs.org
npm whoami --registry https://registry.npmjs.org      # pincast
npm publish create-pincast-0.2.0.tgz --access public --registry https://registry.npmjs.org
npm view create-pincast@0.2.0 version dist.shasum --registry https://registry.npmjs.org
npm logout --registry https://registry.npmjs.org
```

The shasum from `npm view` matches the one `npm pack` printed. Then tag the commit and push the tag. The workflow finds the version on npm, prints that there's nothing to publish, and passes.
