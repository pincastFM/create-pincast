# create-pincast

One command gets you a working Placecard app with its own test key, and you don't need an account to run it.

```sh
npm create pincast my-app
```

You need Node 20.12 or later. The folder has to be new or empty. Leave its name off and the app goes in `pincast-app`.

## What it does

1. Copies a small starter app, Lantern Walk, from inside this package. Nothing is downloaded from GitHub, and `template.json` records the commit it came from.
2. Asks Pincast for one test app.
3. Writes your key to `.env`, which only your account can read and git ignores, along with the test person `test_demo` and your claim link.
4. Puts the new app's id in `shared/app.js`.
5. Sends the starter's set and one collect for `test_demo`, so the app's first screen shows a real card.
6. Prints the claim link and the commands that start the app.

The command never prints your key.

## Your test app

A test key writes only to its own app, and only for test people, whose ids start with `test_`. A test app is never listed and never counts toward anything public.

It ends after a few days unless you claim it, and the command prints the exact date. To keep it, open the claim link while signed in to Pincast. The link works once, and it's saved in `.env` as `PINCAST_CLAIM_URL` in case you close the terminal.

## If something goes wrong

Each call to make an app makes a new one, so the command never repeats that call by itself. If the answer gets lost on the way back, it tells you and stops. Any app made that way has no key anyone can use, and it ends on its own, so you can run the command again.

Pincast limits how many test apps it makes. If you reach a limit, the command tells you how long to wait.

If the set or the collect doesn't go through, you still get your app. The command says which one is missing and prints the commands that send it.

## Working on this package

```sh
npm test
```

The tests run against a local stand-in for the API and never reach Pincast. Set `PINCAST_CREATE_API` to point the command at another address.

To move the starter to a newer commit of the example app:

```sh
node scripts/sync-template.js <path to pincast-kit-example> <commit>
```

## License

MIT. See [LICENSE](LICENSE).
