[README.md](https://github.com/user-attachments/files/30479992/README.md)
# Origin Story

A daily habit, training and drawing tracker for Chloe, built like a comic page.
Same shape as *The System* and *Six Impossible Things*: one static folder, no
build step, no accounts, no server. Everything lives on the phone.

Five tabs — **Cover**, **Panels**, **Train**, **Fuel**, **Studio**.

---

## Putting it online

1. Create a new **public** repo, e.g. `origin-story`.
2. Upload all six files to the root — no subfolder.
3. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. Wait a minute, then open `https://welshy369.github.io/origin-story/` on her phone.
5. Share → *Add to Home Screen*. It opens full screen with no browser chrome.

It must be served over `https://`. Opening `index.html` straight off the phone
with a `file://` path blocks both saving and installing — same trap as last time.

**Every deploy: bump `CACHE` in `sw.js`** (`origin-story-v1` → `-v2` → …).
Miss it and phones keep serving the old copy out of cache indefinitely.

---

## Before every push

```
node check.js
```

It fails the build if:

- a button has a `data-act` with no matching `case` in the switch (the silent
  dead-button bug from last time)
- a `case` exists that nothing uses
- `boot()` looks up an element id that isn't in the markup
- a tab points at a view that doesn't exist
- **the fuel bar loses its clamp, or a weight/goal/target control appears**

That last check is not a style rule, it's a guard rail — see below.

Currently: 21 actions, 5 tabs.

There's also `node test.js` (needs `npm install jsdom`), which boots the whole
app in a fake browser and runs 54 assertions — ticking habits, logging food,
stepping days, saving a drawing. Worth running after any change to `render()`.

---

## The things that are deliberate

This is a calorie-aware app on a 16-year-old girl's phone. That is the single
most common on-ramp to disordered eating there is, so the design is bent away
from it on purpose. Please don't quietly undo any of this later:

- **There is no weight anywhere.** No weigh-ins, no goal weight, no BMI, no
  chart. The app has no idea what she weighs and never asks.
- **The fuel bar fills towards a mark, it never counts down.** No "remaining",
  no negative number, nothing turns red. Going past the mark is not a failure
  state — that's the entire reason the mark is there.
- **2,100 kcal is fixed and not adjustable.** No stepper, no settings. A
  control to lower it is a control to restrict, so there isn't one. If it ever
  genuinely needs changing, change the `FUEL_MARK` constant in the source.
- **Low totals prompt eating more, high totals get a neutral "properly
  fuelled".** The copy never scolds in either direction.
- **Streaks reward eating, moving and drawing — never eating less.** One of the
  six daily habits is literally "three proper meals".
- **The Fuel tab says out loud that it's optional**, and that if counting starts
  to feel stressful she should close it and tell a parent. That paragraph earns
  its place; leave it in.

Training is bodyweight only, no loading, no max effort, with rest days built in
and every prescription written in plain English — "do 8, rest a minute, do that
three times", never "3 × 8".

---

## Data shape

Two keys, on purpose.

`originStory.v1` — text only, small, and what the **Copy backup** button puts on
the clipboard:

```json
{
  "v": 1,
  "start": "2026-07-28",
  "days": { "2026-07-28": { "ticks": [true,false,...], "food": [ {"n":"Banana ×1","kc":105,"pr":1.3} ] } },
  "custom": [ {"n":"Nan's hotpot","kc":140,"pr":9} ],
  "xp": 0
}
```

`originStory.art.v1` — the saved drawings, one JPEG data URL per day, capped at
40 panels with the oldest dropped when it runs out of room.

The art is kept out of the main store so the backup stays small enough to paste
into a message. It also means **drawings are not backed up** — that's the
trade-off, and it's noted on the Cover tab so nobody is surprised.

`day(k)` writes, `peek(k)` reads. Reading history through `day()` would write
hundreds of empty day records into storage, so anything on a render path uses
`peek()`. Keep that split.

---

## Renaming it

If she wants a different title, change the visible text, the manifest and the
icons — but **leave the two `localStorage` keys alone**. They're internal
identifiers, not titles, and changing them orphans everything already saved on
her phone. Keep `start_url` and `scope` as `./` for the same reason.
