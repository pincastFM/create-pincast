// The one place the package's name lives. package.json has to spell it too, and a test holds the two
// together. The command's text follows from it: create-x runs as `npm create x`, a scoped name with npx.
export const PACKAGE_NAME = 'create-pincast'

export const COMMAND = PACKAGE_NAME.startsWith('@')
  ? `npx ${PACKAGE_NAME}`
  : `npm create ${PACKAGE_NAME.replace(/^create-/, '')}`
