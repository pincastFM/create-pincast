// Until @pincast/cli is on npm, this puts the local checkout at node_modules/@pincast/cli, so the tests
// and the command can run from this repo. package.json already names the version that gets published.
// That checkout needs its own @pincast/api: run `npm run link-api` there first.
//   node scripts/link-cli.mjs [path to pincast-cli]   (default: ../pincast-cli, or PINCAST_CLI_REPO)
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = resolve(process.argv[2] || process.env.PINCAST_CLI_REPO || join(root, '..', 'pincast-cli'))
const want = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies['@pincast/cli']
const have = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8'))
if (have.name !== '@pincast/cli' || have.version !== want) {
  console.error(`${from} holds ${have.name}@${have.version}, and this package needs @pincast/cli@${want}.`)
  process.exit(1)
}
const to = join(root, 'node_modules', '@pincast', 'cli')
mkdirSync(dirname(to), { recursive: true })
if (existsSync(to) || lstatSync(to, { throwIfNoEntry: false })) rmSync(to, { recursive: true, force: true })
symlinkSync(from, to, 'dir')
console.log(`node_modules/@pincast/cli now points at ${from} (${have.version}).`)
