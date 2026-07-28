const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("index.html", "utf8");
let bad = 0;
const ok = (label, cond, extra) => {
  console.log((cond ? "  PASS  " : "  FAIL  ") + label + (extra ? "   " + extra : ""));
  if (!cond) bad++;
};

// --- minimal storage + canvas shims -----------------------------------
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  beforeParse(w) {
    Object.defineProperty(w, "localStorage", { value: localStorage });
    w.HTMLCanvasElement.prototype.getContext = () => ({
      fillRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){},
      drawImage(){}, set fillStyle(v){}, set strokeStyle(v){},
      set lineWidth(v){}, set lineCap(v){}, set lineJoin(v){}
    });
    w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    w.HTMLElement.prototype.setPointerCapture = () => {};
    w.scrollTo = () => {};
    if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){} });
  }
});
const w = dom.window, doc = w.document;

(async () => {
await new Promise(r => setTimeout(r, 80));   // boot() runs on DOMContentLoaded
const $ = s => doc.querySelector(s);
const tap = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

console.log("\nOrigin Story — smoke test\n" + "-".repeat(46));

// --- boot -------------------------------------------------------------
ok("boots without throwing", !!$("#tickList"));
ok("six habits render", doc.querySelectorAll('[data-act="tick"]').length === 6);
ok("storage warning hidden", $("#storeWarn").style.display === "none");
ok("starts on the cover", $("#v-cover").classList.contains("on"));

// --- habits -----------------------------------------------------------
const ticks = () => [...doc.querySelectorAll('[data-act="tick"]')];
tap(ticks()[0]);
ok("first habit ticks on", ticks()[0].classList.contains("on"));
ok("counter reads 1/6", $("#mDone").textContent === "1/6", $("#mDone").textContent);
ok("panel takes the first stage", $("#todayPanel").className.includes("s1"));
ok("it persisted", !!store["originStory.v1"] && JSON.parse(store["originStory.v1"]).days[Object.keys(JSON.parse(store["originStory.v1"]).days)[0]].ticks[0] === true);

tap(ticks()[0]);
ok("ticking again turns it off", !ticks()[0].classList.contains("on"));

[0,1,2,3].forEach(i => tap(ticks()[i]));
ok("four out of six counts the day", $("#mRun").textContent === "1", "run=" + $("#mRun").textContent);
ok("panel reaches stage three", $("#todayPanel").className.includes("s3"));
ok("XP adds up", $("#xpLine").textContent.startsWith("40 / 300"), $("#xpLine").textContent);

[4,5].forEach(i => tap(ticks()[i]));
ok("all six bursts", $("#todayPanel").className.includes("done"));
ok("full clear adds the bonus", $("#xpLine").textContent.startsWith("80 / 300"), $("#xpLine").textContent);
ok("one perfect day is not a whole issue", $("#issNo").textContent === "#1" && $("#xpLine").textContent.startsWith("80 / 300"), $("#xpLine").textContent);

// --- tabs -------------------------------------------------------------
tap(doc.querySelector('[data-tab="fuel"]'));
ok("fuel tab opens", $("#v-fuel").classList.contains("on"));
ok("cover closes", !$("#v-cover").classList.contains("on"));

// --- food -------------------------------------------------------------
const search = $("#foodSearch");
search.value = "banana";
search.dispatchEvent(new w.Event("input", { bubbles: true }));
const hits = [...doc.querySelectorAll('[data-act="food-pick"]')];
ok("search finds the banana", hits.length > 0, hits.length + " hits");
tap(hits[0]);
ok("picking shows the amount box", $("#pickedWrap").style.display === "block");
ok("defaults to one item", $("#amt").value === "1");
ok("works out the calories", $("#pickedKcal").textContent === "105 kcal", $("#pickedKcal").textContent);
tap($('[data-act="food-add"]'));
ok("logged to the day", $("#fKcal").textContent === "105", $("#fKcal").textContent);
ok("shows in the list", $("#foodLog").textContent.includes("Banana"));
ok("bar fills, does not overflow", parseInt($("#fBar").style.width) === 5, $("#fBar").style.width);
ok("low intake is encouraged upwards", $("#fState").textContent.includes("plenty of day left"), $("#fState").textContent);

// grams path
search.value = "chicken breast";
search.dispatchEvent(new w.Event("input", { bubbles: true }));
tap(doc.querySelector('[data-act="food-pick"]'));
tap(doc.querySelector('[data-act="unit"][data-u="g"]'));
ok("switching to grams defaults to 100", $("#amt").value === "100");
tap(doc.querySelector('[data-act="portion"][data-g="150"]'));
ok("portion chip sets the amount", $("#amt").value === "150");
ok("recalculates", $("#pickedKcal").textContent === "248 kcal", $("#pickedKcal").textContent);
tap($('[data-act="food-add"]'));
ok("protein adds up", $("#fPro").textContent === "48g", $("#fPro").textContent);

// the safety property: the bar can never exceed full and never goes negative
for (let i = 0; i < 30; i++) {
  search.value = "flapjack";
  search.dispatchEvent(new w.Event("input", { bubbles: true }));
  tap(doc.querySelector('[data-act="food-pick"]'));
  tap($('[data-act="food-add"]'));
}
ok("bar clamps at full on a huge day", $("#fBar").style.width === "100%", $("#fBar").style.width);
ok("no scolding at high intake", /properly fuelled/i.test($("#fState").textContent), $("#fState").textContent);
ok("no countdown anywhere on the tab", !/remaining|left today|over by|-\d+ kcal/i.test($("#v-fuel").textContent));

// delete
const before = parseInt($("#fKcal").textContent);
tap(doc.querySelector('[data-act="food-del"]'));
ok("removing an entry drops the total", parseInt($("#fKcal").textContent) < before);

// day stepping
tap($('[data-act="day-prev"]'));
ok("steps back a day", $("#fuelDay").textContent === "Yesterday", $("#fuelDay").textContent);
ok("yesterday is empty", $("#fKcal").textContent === "0");
tap($('[data-act="day-next"]'));
ok("steps forward again", $("#fuelDay").textContent === "Today");

// custom food
search.value = "nan's hotpot";
search.dispatchEvent(new w.Event("input", { bubbles: true }));
ok("unknown food offers the custom form", $("#customWrap").style.display === "block");
$("#cKcal").value = "140"; $("#cPro").value = "9";
tap($('[data-act="food-save-custom"]'));
ok("custom food is saved", JSON.parse(store["originStory.v1"]).custom.length === 1);
search.value = "hotpot";
search.dispatchEvent(new w.Event("input", { bubbles: true }));
ok("and is searchable", doc.querySelectorAll('[data-act="food-pick"]').length === 1);

// --- training ---------------------------------------------------------
tap(doc.querySelector('[data-tab="train"]'));
ok("training opens on week 1", $("#wkLabel").textContent.includes("Week 1"));
ok("session has five moves", doc.querySelectorAll("#sessList .ex").length === 5);
ok("eight stretches listed", doc.querySelectorAll("#stretchList .ex").length === 8);
ok("no set notation in the copy", !/\d\s*[x×]\s*\d/i.test($("#sessList").textContent), "plain English only");
for (let i = 0; i < 12; i++) tap($('[data-act="week-next"]'));
ok("week stops at eight", $("#wkLabel").textContent.includes("Week 8"), $("#wkLabel").textContent);
for (let i = 0; i < 12; i++) tap($('[data-act="week-prev"]'));
ok("and floors at one", $("#wkLabel").textContent.includes("Week 1"));

// --- studio -----------------------------------------------------------
tap(doc.querySelector('[data-tab="studio"]'));
ok("studio opens", $("#v-studio").classList.contains("on"));
ok("six pens and three nibs", doc.querySelectorAll('[data-act="pen"]').length === 6 && doc.querySelectorAll('[data-act="nib"]').length === 3);
tap(doc.querySelector('[data-act="pen"][data-c="#E5007D"]'));
ok("pen selects", doc.querySelector('[data-act="pen"][data-c="#E5007D"]').classList.contains("on"));
tap($('[data-act="save-panel"]'));
ok("won't save an empty panel", $("#toast").textContent.includes("Draw something"), $("#toast").textContent);

const pad = $("#pad");
pad.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 390 });
const pd = t => { const e = new w.Event(t, { bubbles: true }); e.clientX = 100; e.clientY = 100; e.pointerId = 1; pad.dispatchEvent(e); };
pd("pointerdown"); pd("pointermove"); pd("pointerup");
tap($('[data-act="save-panel"]'));
ok("panel saves", $("#toast").textContent.includes("saved"), $("#toast").textContent);
ok("gallery picks it up", doc.querySelectorAll(".gallery figure").length === 1);
ok("art is stored separately", !!store["originStory.art.v1"] && !store["originStory.v1"].includes("data:image"));
tap(doc.querySelector('[data-act="panel-del"]'));
ok("panel deletes", doc.querySelectorAll(".gallery figure").length === 0);

// --- install ----------------------------------------------------------
tap(doc.querySelector('[data-tab="cover"]'));
ok("no install nag without a prompt event", $("#installPanel").style.display === "none");
const bip = new w.Event("beforeinstallprompt");
let prompted = false;
bip.prompt = () => { prompted = true; };
bip.userChoice = Promise.resolve({ outcome: "accepted" });
w.dispatchEvent(bip);
ok("install panel appears when the browser offers it", $("#installPanel").style.display === "block");
tap($('[data-act="install"]'));
ok("the button actually fires the prompt", prompted);
await new Promise(r => setTimeout(r, 10));
ok("panel goes away once it's done", $("#installPanel").style.display === "none");

// --- storage hygiene --------------------------------------------------
const saved = JSON.parse(store["originStory.v1"]);
ok("only real days are stored", Object.keys(saved.days).length <= 2, Object.keys(saved.days).length + " day records");
ok("no weight or goal field exists", !/weight|goalWeight|deficit|target/i.test(JSON.stringify(saved)));

console.log("-".repeat(46));
console.log(bad ? bad + " FAILED\n" : "all good\n");
process.exit(bad ? 1 : 0);
})();
