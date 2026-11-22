#!/usr/bin/env node
import { run } from '../src/cli.js'

// Node's default crash report prints the error's message and source. Neither may ever carry a key.
const crash = () => {
  process.stderr.write('Something went wrong. No key was printed. Run the command again in a new or empty folder.\n')
  process.exit(1)
}
process.on('uncaughtException', crash)
process.on('unhandledRejection', crash)

run(process.argv.slice(2)).then((code) => { process.exitCode = code }, crash)
