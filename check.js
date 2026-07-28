#!/usr/bin/env node
/* check.js — Origin Story wiring guard.
 *
 * The bug this exists to catch: you add a button with data-act="whatever"
 * and forget the matching case in the switch, so the button silently does
 * nothing. Or you delete a button and leave dead code behind.
 *
 * Run `node check.js` before every push.
 */
const fs = require("fs");

const src = fs.readFileSync("index.html", "utf8");
let fail = 0;

const acts = new Set();
for (const m of src.matchAll(/data-act="([a-z-]+)"/g)) acts.add(m[1]);

const cases = new Set();
for (const m of src.matchAll(/^\s*case\s+"([a-z-]+)":/gm)) cases.add(m[1]);

const missing = [...acts].filter(a => !cases.has(a)).sort();
const orphan  = [...cases].filter(c => !acts.has(c)).sort();

if (missing.length) {
  fail = 1;
  console.error("MISSING CASE — these buttons exist but do nothing when tapped:");
  missing.forEach(a => console.error("   data-act=\"" + a + "\""));
}
if (orphan.length) {
  fail = 1;
  console.error("DEAD CASE — handled in the switch but no button uses it:");
  orphan.forEach(c => console.error("   case \"" + c + "\""));
}

/* Every id read by boot() must exist in the markup. */
const boot = src.match(/\[([^\]]*?)\]\.forEach\(function\(id\)/s);
if (!boot) {
  fail = 1;
  console.error("Could not find the boot() id list — did the wiring change shape?");
} else {
  const ids = [...boot[1].matchAll(/"([A-Za-z0-9_]+)"/g)].map(m => m[1]);
  const badIds = ids.filter(id => !new RegExp('id="' + id + '"').test(src));
  if (badIds.length) {
    fail = 1;
    console.error("MISSING ELEMENT — boot() looks these up and they are not in the markup:");
    badIds.forEach(i => console.error("   #" + i));
  }
}

/* Every view a tab points at must exist. */
const tabs = [...new Set([...src.matchAll(/data-tab="([a-z]+)"/g)].map(m => m[1]))];
const badTabs = tabs.filter(t => !src.includes('id="v-' + t + '"'));
if (badTabs.length) {
  fail = 1;
  console.error("MISSING VIEW — a tab points at a section that isn't there:");
  badTabs.forEach(t => console.error("   #v-" + t));
}

/* The fuel bar must never be able to exceed full, and the target must stay fixed. */
if (!/Math\.min\(100,\s*Math\.round\(kc\/FUEL_MARK\*100\)\)/.test(src)) {
  fail = 1;
  console.error("SAFETY — the fuel bar is no longer clamped at 100%. It must fill, never overflow or count down.");
}
if (/data-act="[a-z-]*(target|goal|weight|deficit)/.test(src)) {
  fail = 1;
  console.error("SAFETY — a target/goal/weight control has been added. This app deliberately has none.");
}

if (fail) {
  console.error("\ncheck.js FAILED — do not push.");
  process.exit(1);
}
console.log("check.js passed \u2014 " + acts.size + " actions, " + tabs.length + " tabs wired.");
