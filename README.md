# remote-task-manager

A small Express web UI that lists running processes (via `systeminformation`) and lets you stop them, sorted by total memory usage.

**Live demo:** _add your hosted URL here once deployed — runs in DEMO_MODE (see below), so it's safe to expose publicly_

## Running locally (real mode)

```
npm install
npm start
```

Open http://localhost:5000/task-manager. This mode lists and can stop **real processes on the machine it runs on** — only run it on your own machine, never expose it to the public internet in this mode.

## Running in demo mode

Set `DEMO_MODE=true` to serve a simulated, fixed process list where "Stop" is a no-op. This is the mode used for any publicly-hosted deployment:

```
DEMO_MODE=true npm start
```

(On Windows PowerShell: `$env:DEMO_MODE="true"; npm start`)

## Deploying a live demo (Render)

In `DEMO_MODE`, this app never touches real processes or calls the Windows-only `taskkill` command, so it can run on any platform (including Render's Linux containers) even though the underlying tool is Windows-specific.

1. Push this repo to GitHub, then create a free account at render.com.
2. New → Web Service → connect this GitHub repo.
3. Build command: `npm install`. Start command: `node TaskManager.js`.
4. Add an environment variable `DEMO_MODE` = `true`. Render sets `PORT` automatically, which the app already reads.
5. Deploy, then visit `https://<your-service>.onrender.com/task-manager`.

## Security notes

- `processName` values are now validated against `^[A-Za-z0-9_\-. ]+$` before use, and process termination uses `execFile('taskkill', [...])` instead of a shell-interpolated `exec()` string — the previous version was vulnerable to command injection via the `/stop-processes` request body.
- There is no authentication on either route. Only run "real mode" on a trusted local machine/network — never deploy real mode to a public server. Public deployments should always use `DEMO_MODE=true`.
- The listen port now respects `process.env.PORT` (falls back to 5000), since most hosting platforms assign the port dynamically.

## License

MIT — see [LICENSE](LICENSE).
