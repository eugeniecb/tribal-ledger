import { describe, it, expect } from "vitest";
import { parseFSGHtml } from "../lib/fsg-parser";

// Trimmed from the real FSG recap markup (episode-recap/season/51 and /50), including
// the tribe summary boxes, footer, and inline scripts that must be ignored.
const survivor = (id: string, name: string) =>
  `<span class="text-nowrap"><a href="/survivors/${id}-${name}"><span class="survivorname" title="${name} X">${name}</span></a>,</span>`;

const FIXTURE_HTML = `
<html><body>
<div id="header"><h1 class="pgheadTitle">Episode Recap</h1></div>
<div class="container py-4">
  <h3 class="text-center">Score Breakdown</h3>

  <div class="position-relative">
    <hr class="line-with-text">
    <h5 class="overlapping-text text-no-wrap recap-episode" id="episode1">Episode 1</h5>
  </div>
  <div class="row g-3">
    <div class="p-3 recapbox"><div class="d-flex flex-column"><h6 class="mb-0">Voted Out</h6><div>Aaliyah</div></div></div>
    <div class="p-3 recapbox"><div class="d-flex flex-column"><h6 class="mb-0">Immunity</h6><div><span>Savu</span></div></div></div>
  </div>
  <dl class="row">
    <dt class="col-sm-4 outplaycolor" title="Won an island challenge">Island Challenge <span class="points">(1)</span></dt>
    <dd class="col-sm-8">${survivor("549", "Lewis")}</dd>
    <dt class="col-sm-4 outplaycolor" title="Win a Tribe Immunity Challenge">Win a Tribe Immunity Challenge <span class="points">(3)</span></dt>
    <dd class="col-sm-8">${survivor("537", "Alexis")} ${survivor("539", "Ana")} and ${survivor("556", "Sharonda")}</dd>
    <dt class="col-sm-4 outplaycolor" title="Gain an Immunity Idol">Gain an Immunity Idol <span class="points">(1)</span></dt>
    <dd class="col-sm-8">${survivor("548", "Kristin")}</dd>
    <dt class="col-sm-4 outwitcolor" title="Survivor was voted out">Voted out</dt>
    <dd class="col-sm-8"><a href="/survivors/536-Aaliyah"><span class="survivorname" title="Aaliyah Puglia">Aaliyah</span></a> <span class="place">(21st place)</span></dd>
  </dl>

  <div class="position-relative">
    <hr class="line-with-text">
    <h5 class="overlapping-text text-no-wrap recap-episode" id="episode2">Episode 2</h5>
  </div>
  <dl class="row">
    <dt class="col-sm-4 outplaycolor" title="Win an Individual Immunity Challenge">Win an Individual Immunity Challenge <span class="points">(2)</span></dt>
    <dd class="col-sm-8">${survivor("549", "Lewis")}</dd>
    <dt class="col-sm-4 outwitcolor" title="Survivor was voted out">Voted out</dt>
    <dd class="col-sm-8"><a href="/survivors/540-Ana"><span class="survivorname" title="Ana Sani">Ana</span></a> <span class="place">(20th place)</span></dd>
    <dt class="col-sm-4 outlastcolor" title="Survivor is off the show">Quit/Evac</dt>
    <dd class="col-sm-8"><a href="/survivors/541-Brady"><span class="survivorname" title="Brady Booker">Brady</span></a> (19th place)</dd>
  </dl>
</div>

<div id="footer">
  <a href="/login.html">Login</a>
  <a href="/register.html">Register</a>
  <a href="/survivors/season/51">Survivors</a>
</div>
<div id="bottom-bar"><p>&copy; FantasySurvivorGame.com. This site is not affiliated with SURVIVOR.</p></div>
<script>
  document.getElementById('donate-footer-link').addEventListener('click', function() {});
  window.dataLayer = window.dataLayer || [];
</script>
</body></html>
`;

describe("parseFSGHtml", () => {
  const episodes = parseFSGHtml(FIXTURE_HTML);

  it("parses each episode block", () => {
    expect(episodes.map((e) => e.episodeNumber)).toEqual([1, 2]);
  });

  it("only reports real voted-out castaways, never footer or script text", () => {
    expect(episodes[0].votedOutNames).toEqual(["Aaliyah"]);
    const allNames = episodes.flatMap((e) => e.events.map((ev) => ev.castawayName));
    for (const junk of ["Login", "Register", "Survivors", "Savu"]) {
      expect(allNames).not.toContain(junk);
    }
    expect(allNames.some((n) => n.includes("document.") || n.includes("©"))).toBe(false);
  });

  it("credits an event to every castaway listed under it", () => {
    const tribeImmunity = episodes[0].events.filter((e) => e.eventKey === "tribe immunity");
    expect(tribeImmunity.map((e) => e.castawayName)).toEqual(["Alexis", "Ana", "Sharonda"]);
    expect(tribeImmunity.every((e) => e.sourcePoints === 3)).toBe(true);
  });

  it("maps FSG event titles to league scoring keys", () => {
    const keys = new Set(episodes.flatMap((e) => e.events.map((ev) => ev.eventKey)));
    expect(keys).toContain("tribe immunity");
    expect(keys).toContain("individual immunity");
    expect(keys).toContain("gain immunity idol");
    // Unmapped FSG events keep their lowercased title
    expect(keys).toContain("island challenge");
  });

  it("attributes single-castaway events correctly", () => {
    const island = episodes[0].events.find((e) => e.eventKey === "island challenge");
    expect(island).toEqual({ castawayName: "Lewis", eventKey: "island challenge", sourcePoints: 1 });
  });

  it("strips placement text and records a voted-out event", () => {
    expect(episodes[0].events).toContainEqual({ castawayName: "Aaliyah", eventKey: "voted out", sourcePoints: 0 });
  });

  it("treats quit/evac as leaving the game", () => {
    expect(episodes[1].votedOutNames).toEqual(["Ana", "Brady"]);
    expect(episodes[1].events).toContainEqual({ castawayName: "Brady", eventKey: "quit/evac", sourcePoints: 0 });
  });

  it("returns no episodes for a page with nothing posted yet", () => {
    expect(parseFSGHtml("<html><body><p>Nothing to show yet</p><div id='footer'>Login</div></body></html>")).toEqual([]);
  });
});
