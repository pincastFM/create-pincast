// create-pincast is a shim from 0.2.0 on. The whole command, with its text and its exit codes, lives in
// @pincast/cli, whose `pincast init` runs the same code. This file gives it this package's name.
import { runCreate } from '@pincast/cli/init'
import { COMMAND, PACKAGE_NAME } from './name.js'

/** Runs the command and answers its exit code. Nothing here prints an error's own message. */
export const run = (argv, options = {}) => runCreate(argv, { command: COMMAND, userAgent: PACKAGE_NAME, ...options })
