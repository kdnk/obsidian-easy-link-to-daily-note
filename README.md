# Easy Link to Daily Note

## Overview

Easy Link to Daily Note is an Obsidian plugin that creates a new note with a timestamp-based filename and appends a link to that note in today's daily note.

It is useful for workflows where you want to capture quick notes without naming friction while keeping them connected to your daily log.

## Features

- Create a unique note with a filename like `2026-05-26-09-41-05.md`
- Append a link to the new note in today's daily note
- Optionally append links for Web Clipper notes tagged with `clippings`

## Installation

### From a release

1. Open this repository's releases page.
2. Download `manifest.json`, `main.js`, and `styles.css` if a stylesheet is included in the release.
3. Create a folder named `easy-link-to-daily-note` in your vault at `.obsidian/plugins/`.
4. Copy the downloaded files into `.obsidian/plugins/easy-link-to-daily-note/`.
5. In Obsidian, open `Settings` -> `Community plugins`.
6. Turn off `Safe mode` if needed, then enable `Easy Link to Daily Note`.

### From source

1. Clone this repository.
2. Run `npm install`.
3. Run `npm run build`.
4. Copy `manifest.json` and `main.js` into `.obsidian/plugins/easy-link-to-daily-note/` in your vault.
5. Enable the plugin from `Settings` -> `Community plugins`.

## Usage

### Before you start

1. Enable Obsidian's core `Daily notes` plugin.
2. Set your daily note folder in the Daily Notes settings.
3. Set Obsidian's default folder for new notes if you want timestamp notes created in a specific location.

### Create a timestamp note

1. Run the command `Create a unique note` from the command palette.
2. Optionally assign a hotkey to the command. `Cmd+J` is a reasonable example.
3. The plugin creates a new note named with the current timestamp.
4. The plugin appends a bullet like `- 09:41 [[2026-05-26-09-41-05]]` to today's daily note.
5. The new note opens immediately so you can start typing.

### Web Clipper integration

1. Open the plugin settings tab.
2. Enable `Append web clipper's link to daily note`.
3. When a newly created note contains the `clippings` tag, the plugin appends a link to today's daily note if the link is not already present.

## Command

- `Create a unique note`




