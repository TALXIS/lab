# Working in this repository

A hands-on Power Platform ALM lab: attendees run the checkpoint scripts in `.lab-scripts/`.

- When the person asks you to sign them in, run `.lab-scripts/lab-signin.ps1` in the terminal
  and walk them through it one tool at a time: tell them which link to open and which code
  to enter, then wait until they're done. Never start a sign-in on your own.
- Run `lab-signin.ps1` without `$null |`, so the sign-ins can run. A sign-in prints a link and a
  code and waits for the person: pass both on and wait. If the script instead stops with
  `Signing in is up to you` (your terminal has no keyboard), ask the
  person to run `.lab-scripts/lab-signin.ps1` in their own terminal (Ctrl+`) and pass on what it
  prints the same way. Afterwards run the checkpoint again: signed-in tools pass.
- Don't commit, push or merge yourself, and don't deploy unless a prompt tells you to. Save a finished
  checkpoint only with `.lab-scripts/save-checkpoint.ps1`, as the prompt says.
- The person may be new to Git, so explain in plain words.
- When a script prints a PR link, give it to the person with the three clicks (Files changed,
  Merge pull request, Confirm) and wait. Never merge it yourself.
- Checkpoint scripts and `save-checkpoint.ps1` open a PR and then wait until it's merged, so they
  don't finish until the person merges. Run them in the background and read the terminal output
  every 20 seconds or so. As soon as `PR opened:` or `Reusing the open PR:` appears, give the person
  that link; don't wait for the command to finish first. Start them with their input redirected
  (`$null | pwsh -NoProfile -File .lab-scripts/CP02-create-repository-layout.ps1`), so they wait for
  the merge on GitHub instead of for a key press, and finish by themselves within a minute of the
  merge. If one is waiting at `press Enter to merge` anyway, tell the person to merge on GitHub, and
  only once they say they have, press Enter in that terminal: it sees the merge and finishes. Don't
  start a waiting script again.
- `.lab-scripts/lab-status.ps1` shows where the lab left off.
- To run a setup checkpoint (CP01–CP05, CP10, CP13–CP15), run its script from `.lab-scripts/`;
  `lab-status.ps1` says which is next. Pass on any link or code it prints, and wait for the person.
- When the next checkpoint is a build checkpoint (CP06–CP09, CP11, CP12), don't run its script: tell
  the person which command to type (`/cp06-data-model`, `/cp07-backend`, `/cp08-security`,
  `/cp09a-model-driven-app` then `/cp09b-code-app`, `/cp11-external-data`, `/cp12-config-data`),
  unless they ask for the script.
- CP10, and CP12 when run as a script, wait for a key press, so ask the person to run them in their
  own terminal.
- Scaffolding is slow: a `txc` call takes about 5 seconds, CP09 makes about a hundred of them, and
  `dotnet build` with the code app takes 2 to 3 minutes. A command that prints nothing for a few
  minutes is still running: wait, don't start it again.
- A checkpoint that fails is safe to run again: it skips what's already done. If it fails the same
  way twice, show the person the error and wait.
- `playwright-cli` can open a page in a browser for you (`playwright-cli --help`). Use it only when
  the person explicitly asks you to check something in a browser, never on your own. Signing in in
  that browser is up to them: never ask for or type their password.
- Read `.lab-scripts/` as working examples, but don't edit it.
- Use the `txc` discovery commands to scaffold, not `dotnet new`.
- Ignore the build warning that PDPackage targets aren't verified against the .NET SDK.
- If `pac` reports `No such file or directory` in the first couple of minutes, the tools are
  still updating: wait a minute and retry.
