# Working in this repository

A hands-on Power Platform ALM lab: attendees run the checkpoint scripts in `.lab-scripts/`.

- When the person asks you to sign them in, run `.lab-scripts/lab-signin.ps1` in the terminal
  and walk them through it one tool at a time: tell them which link to open and which code
  to enter, then wait until they're done. Never start a sign-in on your own.
- Your commands have no keyboard, so when a sign-in is needed the script (also CP01, which runs
  it) stops with `Signing in is up to you`. Then ask the person to run `.lab-scripts/lab-signin.ps1`
  in their own terminal (Ctrl+`) and, for each tool, open the link and enter the code it prints.
  When they're done, run the checkpoint again: signed-in tools pass.
- Don't commit, push or merge yourself, and don't deploy unless a prompt tells you to. Save a finished
  checkpoint only with `.lab-scripts/save-checkpoint.ps1`, as the prompt says.
- The person may be new to Git, so explain in plain words.
- When a script prints a PR link, give it to the person with the three clicks (Files changed,
  Merge pull request, Confirm) and wait. Never merge it yourself.
- Checkpoint scripts and `save-checkpoint.ps1` open a PR and then wait until it's merged, so they
  don't finish until the person merges. Run them in the background and read the terminal output
  every 20 seconds or so. As soon as `PR opened:` or `Reusing the open PR:` appears, give the person
  that link; don't wait for the command to finish first. Once they've merged, the script finishes by
  itself within a minute. Don't start it again while it's waiting.
- If the output says `press Enter to merge` instead, the script is waiting for a key press in that
  terminal. Tell the person to merge on GitHub and then press Enter there: it notices the PR is
  already merged and finishes.
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
- Read `.lab-scripts/` as working examples, but don't edit it.
- Use the `txc` discovery commands to scaffold, not `dotnet new`.
- Ignore the build warning that PDPackage targets aren't verified against the .NET SDK.
- If `pac` reports `No such file or directory` in the first couple of minutes, the tools are
  still updating: wait a minute and retry.
