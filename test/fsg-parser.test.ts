import { describe, it, expect } from "vitest";
import { parseFSGHtml } from "../lib/fsg-parser";

const FIXTURE_HTML = `
<html><body>
<div class="recap">
Episode 1

Voted Out
Lindiwe

Immunity
Christian
Individual Immunity (5)

Reward
Shauhin
Tribe Reward (2)
Read Tree Mail (1)

Journey
Ana
Journey Challenge (2)
</div>

<div class="recap">
Episode 2

Voted Out
Ben

Immunity
Christian
Individual Immunity (5)

Quit/Evac
Maria
</div>
</body></html>
`;

describe("parseFSGHtml", () => {
  it("parses two episodes", () => {
    const episodes = parseFSGHtml(FIXTURE_HTML);
    expect(episodes).toHaveLength(2);
    expect(episodes[0].episodeNumber).toBe(1);
    expect(episodes[1].episodeNumber).toBe(2);
  });

  it("parses voted out names", () => {
    const episodes = parseFSGHtml(FIXTURE_HTML);
    expect(episodes[0].votedOutNames).toContain("Lindiwe");
    expect(episodes[1].votedOutNames).toContain("Ben");
  });

  it("parses immunity events", () => {
    const episodes = parseFSGHtml(FIXTURE_HTML);
    const immunityEvents = episodes[0].events.filter((e) => e.eventKey === "individual immunity");
    expect(immunityEvents.length).toBeGreaterThan(0);
    expect(immunityEvents[0].castawayName).toBe("Christian");
    expect(immunityEvents[0].sourcePoints).toBe(5);
  });

  it("parses reward events with multiple events per castaway", () => {
    const episodes = parseFSGHtml(FIXTURE_HTML);
    const shauhinEvents = episodes[0].events.filter((e) => e.castawayName === "Shauhin");
    expect(shauhinEvents.length).toBeGreaterThan(0);
  });

  it("parses quit/evac as voted out", () => {
    const episodes = parseFSGHtml(FIXTURE_HTML);
    expect(episodes[1].votedOutNames).toContain("Maria");
  });

  it("voted out castaway has a voted-out event record", () => {
    const episodes = parseFSGHtml(FIXTURE_HTML);
    const lindiweEvent = episodes[0].events.find(
      (e) => e.castawayName === "Lindiwe" && e.eventKey === "voted out"
    );
    expect(lindiweEvent).toBeDefined();
  });
});
