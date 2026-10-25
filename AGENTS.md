# Working in this repository

A hands-on Power Platform ALM lab: attendees run the checkpoint scripts in `.lab-scripts/`.

- When the person asks you to sign them in, run `.lab-scripts/lab-signin.ps1` in the terminal
  and walk them through it one tool at a time: tell them which link to open and which code
  to enter, then wait until they're done. Never start a sign-in on your own.
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
- `.lab-scripts/lab-status.ps1` shows where the lab left off.
- To run a checkpoint, run its script from `.lab-scripts/`; `lab-status.ps1` says which is next. Pass on
  any link or code it prints, and wait for the person.
- CP10 waits for a key press, so ask the person to run it in their own terminal.
- Read `.lab-scripts/` as working examples, but don't edit it.
- Use the `txc` discovery commands to scaffold, not `dotnet new`.
- Ignore the build warning that PDPackage targets aren't verified against the .NET SDK.
- If `pac` reports `No such file or directory` in the first couple of minutes, the tools are
  still updating: wait a minute and retry.
