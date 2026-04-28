import { load } from "cheerio";
import type { EpisodeFacts, CastawayEvent } from "./types";

// Patterns for castaway event lines: "Event Name (2)" or "Event Name"
const EVENT_LINE_RE = /^(.+?)\s*\((\d+)\)\s*$/;

// Known FSG section headers that signal a new section (not an event)
const SECTION_HEADERS = new Set([
  "voted out",
  "immunity",
  "reward",
  "journey",
  "quit/evac",
  "quit",
  "evac",
  "medical evacuation",
  "merged",
]);

export async function fetchAndParseFSG(url: string): Promise<EpisodeFacts[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; survivor-fantasy-bot/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`FSG fetch failed: ${res.status}`);
  const html = await res.text();
  return parseFSGHtml(html);
}

export function parseFSGHtml(html: string): EpisodeFacts[] {
  const $ = load(html);
  const episodes: EpisodeFacts[] = [];

  // FSG recap pages list episodes sequentially; each episode block starts with "Episode N"
  // Strategy: collect all visible text, split by episode markers
  const fullText = $("body").text();
  const lines = fullText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let currentEpisode: Partial<EpisodeFacts> | null = null;
  let currentSection: string | null = null;
  let currentCastaway: string | null = null;

  for (const line of lines) {
    // Episode header: "Episode 1", "Episode 12" etc.
    const episodeMatch = line.match(/^Episode\s+(\d+)$/i);
    if (episodeMatch) {
      if (currentEpisode?.episodeNumber !== undefined) {
        episodes.push(finalize(currentEpisode));
      }
      currentEpisode = { episodeNumber: parseInt(episodeMatch[1], 10), votedOutNames: [], events: [] };
      currentSection = null;
      currentCastaway = null;
      continue;
    }

    if (!currentEpisode) continue;

    // Section: "Voted Out", "Immunity", "Reward", "Journey", "Quit/Evac"
    const lower = line.toLowerCase();
    if (lower === "voted out") { currentSection = "voted_out"; currentCastaway = null; continue; }
    if (lower === "immunity") { currentSection = "immunity"; currentCastaway = null; continue; }
    if (lower === "reward") { currentSection = "reward"; currentCastaway = null; continue; }
    if (lower === "journey") { currentSection = "journey"; currentCastaway = null; continue; }
    if (lower === "quit/evac" || lower === "quit" || lower === "evac" || lower === "medical evacuation") {
      currentSection = "quit_evac"; currentCastaway = null; continue;
    }
    if (lower === "merged" || lower === "merge") {
      // Record merge as an event for all living castaways — handled downstream; just skip line
      currentSection = null; continue;
    }

    // Event line under a section: castaway name or "Event (pts)"
    const eventMatch = line.match(EVENT_LINE_RE);

    if (currentSection === "voted_out") {
      // Lines in Voted Out are castaway names
      if (!eventMatch) {
        // Could be castaway name
        if (!SECTION_HEADERS.has(lower)) {
          currentEpisode.votedOutNames!.push(line);
          // Also add as voted-out event
          currentEpisode.events!.push({
            castawayName: line,
            eventKey: "voted out",
            sourcePoints: 0,
          });
        }
      }
      continue;
    }

    if (currentSection === "quit_evac") {
      if (!eventMatch && !SECTION_HEADERS.has(lower)) {
        currentEpisode.votedOutNames!.push(line);
        currentEpisode.events!.push({
          castawayName: line,
          eventKey: "quit/evac",
          sourcePoints: 0,
        });
      }
      continue;
    }

    // Under other sections, expect: castaway name line then event lines
    if (currentSection && eventMatch) {
      // Event line with points
      if (currentCastaway) {
        const eventKey = normalizeEventKey(eventMatch[1]);
        const sourcePoints = parseInt(eventMatch[2], 10);
        currentEpisode.events!.push({ castawayName: currentCastaway, eventKey, sourcePoints });
      }
    } else if (currentSection && !SECTION_HEADERS.has(lower)) {
      // Castaway name line
      currentCastaway = line;
    }
  }

  if (currentEpisode?.episodeNumber !== undefined) {
    episodes.push(finalize(currentEpisode));
  }

  return episodes;
}

function finalize(ep: Partial<EpisodeFacts>): EpisodeFacts {
  return {
    episodeNumber: ep.episodeNumber!,
    votedOutNames: ep.votedOutNames ?? [],
    events: ep.events ?? [],
  };
}

function normalizeEventKey(raw: string): string {
  return raw.trim().toLowerCase();
}
