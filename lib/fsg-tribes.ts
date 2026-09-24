import { load } from "cheerio";

export interface FsgTribeRow {
  name: string;
  // Current tribe, or null when FSG marks the castaway "Out".
  tribe: string | null;
}

// FSG's survivors page (e.g. /survivors/season/51) lists every castaway with their current
// tribe. The link slug after the id ("540-Jelly") is the short name used in our castaways table.
export function parseFSGTribes(html: string): FsgTribeRow[] {
  const $ = load(html);
  const rows: FsgTribeRow[] = [];

  $("td.SurvInfo").each((_, cell) => {
    const href = $(cell).find("a[href^='/survivors/']").first().attr("href") ?? "";
    const slug = decodeURIComponent(href.replace(/^\/survivors\//, ""));
    const name = slug.replace(/^\d+-/, "").trim();
    const tribe = $(cell).find(".TableTribeName").text().trim();
    if (!name || !tribe) return;
    rows.push({ name, tribe: tribe.toLowerCase() === "out" ? null : tribe });
  });

  return rows;
}

export function fsgSurvivorsUrl(recapUrl: string, seasonNumber: number): string {
  return `${new URL(recapUrl).origin}/survivors/season/${seasonNumber}`;
}

export async function fetchFSGTribes(url: string): Promise<FsgTribeRow[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; survivor-fantasy-bot/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`FSG survivors fetch failed: ${res.status}`);
  return parseFSGTribes(await res.text());
}
