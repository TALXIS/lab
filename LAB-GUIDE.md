# Lab guide

> This is a short first version. The full step-by-step guide follows (#70).

## Your screen

- **This guide**, on the left. It opens by itself every time.
- **Copilot Chat**, on the right. You can ask it anything about the lab, for example *"sign me in"* or *"what does this checkpoint do?"*.
- **The terminal**, at the bottom. Open it with **Ctrl+`** if you don't see it. It runs PowerShell.

## The first minute

When the Codespace opens, its tools are still updating. **Wait until the terminal goes quiet** (about a minute) before you start.

## Start

Type this in the terminal and press **Enter**:

```powershell
.lab-scripts/CP01-check-machine-setup.ps1
```

It checks the tools and signs you in. When it shows you a link and a code, open the link, enter the code and approve.

Then run the checkpoints in order, CP02 to CP15. The list is in the [README](README.md#checkpoints). Not sure where you are? Run `.lab-scripts/lab-status.ps1`.

## The one thing you do on GitHub

Every checkpoint ends with a link to a **pull request** (a proposed change you approve with one click). Open it and look at **Files changed** to see what the checkpoint did. Then:

- **You ran the checkpoint in the terminal:** go back to the terminal and press **Enter**. It merges the pull request for you.
- **Copilot ran it for you:** click **Merge pull request**, then **Confirm merge**, and come back here. Copilot carries on by itself.

From CP13 on, a build check runs on every pull request; the merge waits for its green ✓.
