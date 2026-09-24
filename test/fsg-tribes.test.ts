import { describe, it, expect } from "vitest";
import { parseFSGTribes, fsgSurvivorsUrl } from "../lib/fsg-tribes";

// Trimmed from FSG's /survivors/season/51 table.
const row = (id: string, slug: string, full: string, tribe: string) => `
<tr>
  <td class="TableSurvImg"><a href="/survivors/${id}-${slug}"><img src="/images/51/thumbs/x.jpg"></a></td>
  <td class="SurvInfo"><a href="/survivors/${id}-${slug}"><span class="survivorname">${full}</span></a>
  <br><span class="TableTribeName">	<span style="color: #FAA21B;">${tribe}</span>
  </span></td>
  <td>0</td>
</tr>`;

const HTML = `<html><body><table><tbody>
${row("555", "Rob", "Rob Antonson", "Savu")}
${row("540", "Jelly", "Angelica &quot;Jelly&quot; Loblack", "Toka")}
${row("538", "Thien An", "An &quot;Thien An&quot; Nguyen", "Toka")}
${row("536", "Aaliyah", "Aaliyah Puglia", "Out")}
</tbody></table><div id="footer"><a href="/survivors/season/51">Survivors</a></div></body></html>`;

describe("parseFSGTribes", () => {
  it("reads each castaway's short name and current tribe", () => {
    expect(parseFSGTribes(HTML)).toEqual([
      { name: "Rob", tribe: "Savu" },
      { name: "Jelly", tribe: "Toka" },
      { name: "Thien An", tribe: "Toka" },
      { name: "Aaliyah", tribe: null },
    ]);
  });

  it("builds the survivors URL from the recap URL", () => {
    expect(fsgSurvivorsUrl("https://www.fantasysurvivorgame.com/episode-recap/season/51", 51)).toBe(
      "https://www.fantasysurvivorgame.com/survivors/season/51"
    );
  });
});
