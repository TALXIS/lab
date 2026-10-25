# Lab guide

You'll build a **Warehouse Management** app on Power Platform: tables, server-side rules, security roles, an app for managers, an app for floor workers, and a barcode lookup. Everything is source code in your own copy of this repository, and every change reaches `main` through a pull request.

You do it all by talking to **Copilot Chat**.

## How the lab works

You move forward in **checkpoints**. Copilot does the work in two ways:

- **Setup checkpoints** run a script that sets up the project and its pipelines. You ask Copilot to run it, and it tells you what happened.
- **Build checkpoints** have Copilot build part of the app from a spec. You type a command like `/cp06-data-model`, and it reads the spec and does the work.

Every checkpoint ends the same way: a **pull request** on your fork that you review and merge.

| Checkpoint | Type | What you get |
|---|---|---|
| CP01 | Setup | Tools checked, you're signed in to everything |
| CP02 | Setup | The repository layout |
| CP03 | Setup | `main` protected: changes only through pull requests |
| CP04 | Setup | Your Dev and Test environments |
| CP05 | Setup | A pipeline that deploys to Test |
| CP06 | Build | The data model |
| CP07 | Build | The stock rules (plugins) |
| CP08 | Build | The security roles |
| CP09 | Build | The manager app and the worker app |
| CP10 | Setup | Your app running in Dev, and a change pulled back to source |
| CP11 | Build | Barcode lookup with external data |
| CP12 | Build | Reference data that travels with the app |
| CP13 | Setup | The build check becomes required on pull requests |

## Your screen

- **This guide**, on the left.
- **Copilot Chat**, on the right. This is where you do the lab.
- **The terminal**, at the bottom (**Ctrl+`** shows it). You only need it if Copilot asks you to use it, or as a backup.
- **The specs** are in `docs/design/`. Each one opens as a readable page.

## Before you start

- Use a **fork** of this repository on your own GitHub account, and open the Codespace **from your fork**, not from `TALXIS/lab`.
- You'll sign in to GitHub, Power Platform, Azure and Power Apps. **Use the same Microsoft account for the last three.** It needs to be able to create a Power Platform environment.
- When the Codespace opens, its tools are still updating. **Wait until the terminal goes quiet** (about a minute) before you start.

### Check that Copilot has its skills

Copilot builds the app with the TALXIS skills. Ask it:

> Hey Copilot, which skills are loaded and available?

You should see TALXIS skills such as data-model, backend, security, frontend and deploy. If you don't, tell a facilitator before you go on.

## Part 1: Set up the project

Ask Copilot to run each setup checkpoint, one after the other. For example:

> Run checkpoint 1 and sign me in.

or, later, just *What's next?* or *Run the next checkpoint.* Copilot finds the next one and runs it.

- **CP01** checks the tools and signs you in. Copilot walks you through it one service at a time: it gives you a link and a code, you open the link, enter the code and approve, and it moves on to the next. When GitHub asks, allow the `workflow` permission.
- **CP02** creates the solution file and the `src/` folder.
- **CP03** blocks direct pushes to `main`.
- **CP04** creates your Dev and Test environments. It takes a few minutes.
- **CP05** creates the deployment identity and the build and deploy workflows. The build check on its pull request will probably show a red ✗. That's expected: the project it builds is added in CP06. You can still merge.

**Each checkpoint ends with a pull request link.** Open it and click **Files changed** to see what changed. Then do **one** of these, depending on what Copilot says:

- **"I'll carry on when you've merged it":** click **Merge pull request** and **Confirm merge** on GitHub, then come back here. Copilot carries on by itself.
- **"I'm waiting for Enter in the terminal":** don't merge on GitHub. Check the pull request, then click into the terminal and press **Enter**. The script merges it for you.

You only need one of the two. Copilot never merges for you.

## Part 2: Build the app

For each build checkpoint:

1. **Read the spec** if you want to know what's coming. It's linked in the table below.
2. **Type the command in Copilot Chat.** Start typing `/cp` and pick it from the list.
3. **Let Copilot work.** It builds the project, fixes build errors, and tells you what it chose where the spec left a decision open.
4. **When it's done, it opens a pull request and waits.** Review and merge it as above. Copilot carries on.
5. Run the next command.

| Command | Spec | You get |
|---|---|---|
| `/cp06-data-model` | [Lab 1](docs/design/lab-1-data-model.md) | The Location, Item and Transaction tables |
| `/cp07-backend` | [Lab 2](docs/design/lab-2-server-side-business-logic.md) | Plugins that validate and update stock |
| `/cp08-security` | [Lab 3](docs/design/lab-3-security.md) | The Warehouse manager and worker roles |
| `/cp09a-model-driven-app` | [Lab 4](docs/design/lab-4-user-interface.md) | The manager app |
| `/cp09b-code-app` | [Lab 4](docs/design/lab-4-user-interface.md) | The Warehouse Picking app for the floor |

Run `/cp09a-model-driven-app` first. It doesn't save; `/cp09b-code-app` does.

## Part 3: See it running

**CP10** is the one checkpoint you run in the terminal yourself, because it waits for you to make a change in the browser:

```powershell
.lab-scripts/CP10-deploy-and-sync.ps1
```

It deploys the app to your Dev environment and gives you a link to open it. It then shows you how to change a security role in the browser, and waits. Make the change, then press **Enter** in the terminal: the script pulls your change back into source. At the end of the checkpoint the pull request link appears. Review it and press **Enter** to merge, as in Part 1.

## Part 4: External data and reference data

| Command | Spec | You get |
|---|---|---|
| `/cp11-external-data` | [Lab 5](docs/design/lab-5-external-data-and-background-processing.md) | A Product table, the Open Food Facts connector, and a barcode scan in the picking app |
| `/cp12-config-data` | [Lab 1](docs/design/lab-1-data-model.md) | Locations and items that every environment starts with |

`/cp11-external-data` opens **four** pull requests, one after each part. Merge each one before Copilot starts the next. It also imports the Product table and the connector into your Dev environment, which it tells you about.

`/cp12-config-data` also loads the records into your Dev environment. After it, **try the picking app yourself**. In a second terminal:

```powershell
cd src/Apps.WarehousePicking
npm install
npm run dev
```

It prints two links. Open the **Local Play** one, which starts with `https://apps.powerapps.com/play/`, and sign in. (The plain `http://localhost:5173/` one shows the app without its data.) Then check two things:

1. Open **Office Laptop** (100 on hand) and create an **Outbound** transaction for a small quantity. It succeeds and the quantity on hand goes down.
2. Try to pick more than 5 of **Wireless Mouse** (5 on hand). The server refuses it and the app shows the error.

## Part 5: Protect `main`

> Run checkpoint 13.

**CP13** makes the build check required. From now on a pull request can only merge after its build shows a green ✓.

That's the end of the guided lab. **Finished early?** CP14 and CP15 add automated tests: ask Copilot to run checkpoint 14, then 15. They're optional and not covered by this guide, and the CP14 browser tests expect the picking app the CP09 script builds, so they may fail against one Copilot built.

## If Copilot gets stuck

1. Ask it what failed and to fix it. Most build errors it can fix itself.
2. Compare what it did with the spec section its command names.
3. Still stuck? **Ask Copilot to run the checkpoint's script instead.** Scripts are safe to run again. First set the half-finished work aside, so it doesn't get in the way:

   ```powershell
   git stash -u
   ```

   Then ask Copilot to run that checkpoint (for example *Run checkpoint 6*). You can get the stashed work back with `git stash pop`.

## If something looks wrong

| What you see | What to do |
|---|---|
| You're not sure where you are | Ask *Where am I in the lab?* It runs `lab-status` and tells you |
| Sign-in errors, or a new Codespace | Ask *Sign me in* |
| Copilot says it can't run something | Run the script yourself in the terminal, for example `.lab-scripts/CP02-create-repository-layout.ps1`. When it asks you to press **Enter** to merge, check the pull request first, and don't also merge it on GitHub |
| Strange characters appear in the terminal | Close that terminal (the trash-can icon) and open a new one with **Ctrl+`**. Your progress is saved |
| A pull request's build check is red ✗ before CP13 | You can still merge. After CP13, the merge waits for a green ✓ |
| CP04 can't create an environment | Your account may not be allowed to. Ask a facilitator |
| A script stopped halfway | Run it again. Scripts pick up where they left off |

More detail is in the [README](README.md): the [full checkpoint list](README.md#checkpoints), [checkpoint tags](README.md#checkpoint-tags) and [resuming on another machine](README.md#resuming-on-a-different-machine).
