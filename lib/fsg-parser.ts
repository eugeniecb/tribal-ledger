import { load } from "cheerio";
import type { EpisodeFacts, CastawayEvent } from "./types";

// FSG event titles -> league scoring rule keys (see lib/rules.ts event_points).
// Titles not listed here keep their lowercased FSG title as the key.
const FSG_EVENT_KEYS: Record<string, string> = {
  "win an individual immunity challenge": "individual immunity",
  "win a tribe immunity challenge": "tribe immunity",
  "win an individual reward challenge": "individual reward",
  "win a tribe reward challenge": "tribe reward",
  "gain an immunity idol": "gain immunity idol",
  "gain an advantage": "gain advantage",
  "voted out": "voted out",
  "quit/evac": "quit/evac",
};

// Events that remove a castaway from the game mid-season.
const ELIMINATION_KEYS = new Set(["voted out", "quit/evac"]);

export async function fetchAndParseFSG(url: string): Promise<EpisodeFacts[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; survivor-fantasy-bot/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`FSG fetch failed: ${res.status}`);
  const html = await res.text();
  return parseFSGHtml(html);
}

// FSG recap pages have one block per episode: an `h5.recap-episode` header ("Episode N"),
// summary boxes (tribe-level, ignored), then a <dl> where each <dt> is an event title with
// its points and the following <dd> lists every castaway who earned it.
// Only these blocks are read, so page chrome (nav, footer, scripts) can't leak in.
export function parseFSGHtml(html: string): EpisodeFacts[] {
  const $ = load(html);
  const episodes: EpisodeFacts[] = [];

  $("h5.recap-episode").each((_, header) => {
    const episodeMatch = $(header).text().trim().match(/^Episode\s+(\d+)$/i);
    if (!episodeMatch) return;

    const episode: EpisodeFacts = {
      episodeNumber: parseInt(episodeMatch[1], 10),
      votedOutNames: [],
      events: [],
    };

    const block = $(header).closest(".position-relative").nextUntil(":has(h5.recap-episode)");
    block.find("dt").each((_, dt) => {
      const $dt = $(dt);
      const pointsText = $dt.find(".points").text().match(/-?\d+/)?.[0];
      const title = $dt.clone().children(".points").remove().end().text().trim();
      if (!title) return;

      const eventKey = FSG_EVENT_KEYS[title.toLowerCase()] ?? title.toLowerCase();
      const sourcePoints = pointsText ? parseInt(pointsText, 10) : 0;

      const $dd = $dt.nextAll("dd").first();
      $dd.find(".survivorname").each((_, el) => {
        const castawayName = $(el).text().trim();
        if (!castawayName) return;

        if (!hasEvent(episode.events, castawayName, eventKey)) {
          episode.events.push({ castawayName, eventKey, sourcePoints });
        }
        if (ELIMINATION_KEYS.has(eventKey) && !hasName(episode.votedOutNames, castawayName)) {
          episode.votedOutNames.push(castawayName);
        }
      });
    });

    episodes.push(episode);
  });

  return episodes;
}

function hasName(names: string[], name: string): boolean {
  return names.some((n) => n.toLowerCase() === name.toLowerCase());
}

function hasEvent(events: CastawayEvent[], castawayName: string, eventKey: string): boolean {
  return events.some(
    (e) =>
      e.eventKey === eventKey &&
      e.castawayName.toLowerCase() === castawayName.toLowerCase()
  );
}
