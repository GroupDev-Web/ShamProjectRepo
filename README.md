# The Sham Project — app database

A dead-simple folder-based app catalog, read directly by [The Sham Project](https://github.com/GroupDev-Web/ShamProjectRepo)
Android client.

## Format

Each top-level folder is one app. A folder contains exactly three files:

- **`desc.desc`** — the app's description. Whatever plain text is in the file is shown as the description,
  verbatim.
- **`app.apk`** — the installable APK.
- **`version.conf`** — which Android versions this app supports. One line, one of:
  - `all` — every Android version.
  - `X-Y` — every version from `X` to `Y` inclusive (e.g. `5.0-9`).
  - `X+` — version `X` and everything newer.
  - `X&Y&Z...` — an explicit list of exactly these versions, any length (e.g. `9&10&12`).
  - A single version on its own (e.g. `4.4.4`) — exactly that version only.

Versions are Android release names (`4.4.4`, `7.0`, `10`, `13`, ...), not API levels.
