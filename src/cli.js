import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { apiBase, makeTestApp, Stop } from './api.js'
import { FIRST_RUN_TIMEOUT_MS, sendFirstRun } from './firstrun.js'
import { COMMAND } from './name.js'
import { addReadmeSection, copyStarter, firstRunCommands, removeStarter, setAppId, TEST_PERSON, writeEnv } from './starter.js'

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

// What the first run sent, and what the person does next, for each thing it can leave undone.
const FIRST_RUN_TEXT = {
  none: () => ({
    state: `Pincast has your set, and the test person ${TEST_PERSON} holds Ferry Steps.`,
    next: 'Next, install it and start it:',
  }),
  collect: why => ({
    state: `Pincast has your set but didn't confirm the first collect (${why}). Your app is fine, and the commands below send it. Sending it again within a day changes nothing.`,
    next: 'Next, install it, send its one collect, and start it:',
  }),
  both: why => ({
    state: `Pincast didn't confirm your set (${why}). Your app is fine, and the commands below send the set and one collect.`,
    next: 'Next, install it, send its set and one collect, and start it:',
  }),
}

function successText({ shown, inPlace, id, claimUrl, endsOn, base, first }) {
  const envPath = inPlace ? '.env' : join(shown, '.env')
  const steps = [...(inPlace ? [] : [`cd ${shellWord(shown)}`]), 'npm ci', ...firstRunCommands(base, first.left), 'npm run dev']
  const { state, next } = FIRST_RUN_TEXT[first.left](first.why)
  return [
    `Your app is ready in ${inPlace ? 'this folder' : shown}, with the test app ${id}.`,
    '',
    `Its key is saved in ${envPath}. Only your account can read that file, and git ignores it.`,
    '',
    state,
    '',
    `To keep this app past ${endsOn}, open this link while signed in to Pincast:`,
    '',
    `  ${claimUrl}`,
    '',
    next,
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
  firstRunTimeoutMs = FIRST_RUN_TIMEOUT_MS,
} = {}) {
  const say = text => out(hideKeys(text))
  const complain = text => err(`${hideKeys(text)}\n`)
  const stopper = new AbortController()
  const onInterrupt = () => stopper.abort()
  const firstRunStopper = new AbortController()
  const onFirstRunInterrupt = () => firstRunStopper.abort()

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
    } catch (e) {
      throw new Stop(`The key is saved in .env, but the app's id couldn't be written (${e?.code ?? 'write failed'}). Set APP.id in shared/app.js to ${app.id}, and run UPDATE_GOLDENS=1 npm test.`)
    }

    // From here the app exists and works, so nothing that goes wrong with these two calls stops the command.
    say('Sending the starter\'s set and one test collect to Pincast.\n\n')
    process.once('SIGINT', onFirstRunInterrupt)
    const first = await sendFirstRun(base, target, {
      appId: app.id,
      key: app.key,
      fetchImpl,
      stop: firstRunStopper.signal,
      timeoutMs: firstRunTimeoutMs,
    })
    process.removeListener('SIGINT', onFirstRunInterrupt)

    try {
      addReadmeSection(target, { id: app.id, base, endsOn: app.endsOn, left: first.left })
    } catch (e) {
      throw new Stop(`Your app is made and its key is in .env, but its README couldn't be updated (${e?.code ?? 'write failed'}). Skip the README's Go live steps, because the first one would erase the key, and follow https://docs.pincast.fm/quickstart. Your claim link is in .env as PINCAST_CLAIM_URL.`)
    }

    say(successText({ shown, inPlace, id: app.id, claimUrl: app.claimUrl, endsOn: app.endsOn, base, first }))
    return firstRunStopper.signal.aborted ? 130 : 0
  } catch (e) {
    process.removeListener('SIGINT', onInterrupt)
    process.removeListener('SIGINT', onFirstRunInterrupt)
    if (!holdsApp && target) {
      try {
        removeStarter(target, files, madeFrom)
      } catch { /* the message below still has to reach the person */ }
    }
    complain(e instanceof Stop ? e.message : `Something went wrong${e?.code ? ` (${e.code})` : ''}. No key was printed. Run the command again in a new or empty folder.`)
    return e instanceof Stop ? e.exitCode : 1
  }
}
