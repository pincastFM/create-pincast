import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { apiBase, makeTestApp, Stop } from './api.js'
import { COMMAND } from './name.js'
import { addReadmeSection, copyStarter, firstRunCommands, removeStarter, setAppId, writeEnv } from './starter.js'

const DEFAULT_FOLDER = 'pincast-app'

const USAGE = `Make a Placecard app with its own test key:

  ${COMMAND} [folder]

The folder has to be new or empty. With no folder named, the app goes in ./${DEFAULT_FOLDER}.
`

// Every line this command prints passes through here, so a key can't reach the terminal even by mistake.
const hideKeys = text => String(text).replace(/pck_[A-Za-z0-9_-]+/g, '[key hidden]')

const shellWord = word => (/^[A-Za-z0-9._/-]+$/.test(word) ? word : `'${word.replaceAll("'", "'\\''")}'`)

/** Reads the arguments: at most one folder. */
function parseArgs(argv) {
  const flags = argv.filter(a => a.startsWith('-'))
  if (flags.some(f => f === '-h' || f === '--help')) return { help: true }
  if (flags.length) throw new Stop(`This command takes no options.\n\n${USAGE}`, 2)
  if (argv.length > 1) throw new Stop(`This command takes one folder.\n\n${USAGE}`, 2)
  const folder = argv[0] ?? DEFAULT_FOLDER
  // eslint-disable-next-line no-control-regex
  if (!folder.trim() || /[\u0000-\u001f\u007f]/.test(folder)) throw new Stop("That folder name can't be used.", 2)
  return { folder }
}

/** Refuses anything but a new or empty folder, before any call is made. Answers whether it exists. */
function checkTarget(target, shown) {
  let info
  try {
    info = statSync(target)
  } catch (e) {
    if (e.code === 'ENOENT') return false
    throw new Stop(`Couldn't read ${shown} (${e.code}).`)
  }
  if (!info.isDirectory()) throw new Stop(`${shown} is a file. Name a new or empty folder.`)
  if (readdirSync(target).length) throw new Stop(`${shown} already has files in it, and this command won't write over them. Name a new or empty folder.`)
  return true
}

function successText({ shown, inPlace, id, claimUrl, endsOn, base }) {
  const envPath = inPlace ? '.env' : join(shown, '.env')
  const steps = [...(inPlace ? [] : [`cd ${shellWord(shown)}`]), 'npm ci', ...firstRunCommands(base), 'npm run dev']
  return [
    `Your app is ready in ${inPlace ? 'this folder' : shown}, with the test app ${id}.`,
    '',
    `Its key is saved in ${envPath}. Only your account can read that file, and git ignores it.`,
    '',
    `To keep this app past ${endsOn}, open this link while signed in to Pincast:`,
    '',
    `  ${claimUrl}`,
    '',
    'Next, install it, send its set and one collect, and start it:',
    '',
    ...steps.map(s => `  ${s}`),
    '',
    'Then open http://localhost:5173.',
    '',
  ].join('\n')
}

/** Runs the command and answers its exit code. Nothing here prints an error's own message. */
export async function run(argv, {
  env = process.env,
  cwd = process.cwd(),
  out = text => process.stdout.write(text),
  err = text => process.stderr.write(text),
  fetchImpl = fetch,
  beforeCopy = () => {},
} = {}) {
  const say = text => out(hideKeys(text))
  const complain = text => err(`${hideKeys(text)}\n`)
  const stopper = new AbortController()
  const onInterrupt = () => stopper.abort()

  let target
  const files = []
  let madeFrom
  let holdsApp = false

  try {
    const args = parseArgs(argv)
    if (args.help) {
      say(USAGE)
      return 0
    }
    const { base, custom } = apiBase(env)
    target = resolve(cwd, args.folder)
    const fromCwd = relative(cwd, target)
    const inPlace = fromCwd === ''
    const shown = inPlace ? basename(target) : (fromCwd.startsWith('..') || isAbsolute(fromCwd) ? target : fromCwd)

    if (!checkTarget(target, shown)) madeFrom = mkdirSync(target, { recursive: true })

    // The starter goes down first: a failed copy then costs no test app.
    beforeCopy()
    copyStarter(target, files)

    process.once('SIGINT', onInterrupt)
    const app = await makeTestApp(base, { fetchImpl, signal: stopper.signal })
    process.removeListener('SIGINT', onInterrupt)
    holdsApp = true

    try {
      writeEnv(target, { key: app.key, claimUrl: app.claimUrl, customBase: custom ? base : null })
    } catch (e) {
      throw new Stop(`Pincast made the test app, but its key couldn't be saved (${e?.code ?? 'write failed'}). Nobody holds that key now, so that app can't be used and it ends on its own. Run the command again in a new folder.`)
    }
    try {
      setAppId(target, app.id)
      addReadmeSection(target, { id: app.id, base, endsOn: app.endsOn })
    } catch (e) {
      throw new Stop(`The key is saved in .env, but the app's id couldn't be written (${e?.code ?? 'write failed'}). Set APP.id in shared/app.js to ${app.id}, and run UPDATE_GOLDENS=1 npm test.`)
    }

    say(successText({ shown, inPlace, id: app.id, claimUrl: app.claimUrl, endsOn: app.endsOn, base }))
    return 0
  } catch (e) {
    process.removeListener('SIGINT', onInterrupt)
    if (!holdsApp && target) {
      try {
        removeStarter(target, files, madeFrom)
      } catch { /* the message below still has to reach the person */ }
    }
    complain(e instanceof Stop ? e.message : `Something went wrong${e?.code ? ` (${e.code})` : ''}. No key was printed. Run the command again in a new or empty folder.`)
    return e instanceof Stop ? e.exitCode : 1
  }
}
