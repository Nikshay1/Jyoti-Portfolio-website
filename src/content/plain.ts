// The whole portfolio as plain Markdown, for AI assistants and crawlers.
// Built from the same data as the designed page, so the two never drift.
import { about, hero, person, results, rewrite, seo, work } from "./site";

export function portfolioMarkdown(siteUrl: string) {
  const lines: string[] = [];
  const add = (...l: string[]) => lines.push(...l);

  add(`# ${person.name}`, "", `> ${seo.description}`, "");
  add(
    `- Role: ${person.role} (${person.focus})`,
    `- Based in: ${person.city}`,
    `- Status: ${person.availability}`,
    `- Email: ${person.email}`,
    `- Designed portfolio: ${siteUrl}`,
    "",
  );

  add("## In one line", "", `${hero.lead} ${hero.accent}`, "");
  add(
    "## How she edits",
    "",
    `Before: "${rewrite.before}"`,
    "",
    `After: "${rewrite.after}"`,
    "",
  );

  add("## Selected work", "");
  for (const w of work) {
    const title = w.href ? `[${w.title}](${w.href})` : w.title;
    add(`- **${title}** (${w.type}, ${w.year}). Client: ${w.org}. Result: ${w.result}. ${w.note}`);
  }
  add("");

  add("## Results", "");
  for (const r of results) add(`- ${r.prefix}${r.count ?? ""}${r.suffix} ${r.label}`);
  add("");

  add("## About", "", ...about.paragraphs.flatMap((p) => [p, ""]));
  add("### What she writes", "", ...about.services.map((s) => `- ${s}`), "");
  add("### Experience", "", ...about.experience.map((e) => `- ${e.role}, ${e.org} (${e.years})`), "");
  add("### Education", "", `- ${about.education}`, "");
  add("## Contact", "", `Email ${person.email} to hire her or ask about her work.`, "");

  return lines.join("\n");
}
