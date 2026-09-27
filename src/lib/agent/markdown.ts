import { siteConfig } from "@/lib/config";

import {
  agentEndpoints,
  introParagraphs,
  notFoundLinks,
  pageLinks,
  siteSummary,
  whenToUse,
} from "./site-content";
import type { ProseBlock, ProseListItem, ProsePage } from "./site-content";

export const absoluteUrl = (path: string): string =>
  path.startsWith("/") ? `${siteConfig.url}${path}` : path;

const renderListItem = (item: ProseListItem): string => {
  const label = item.href ? `[${item.label}](${absoluteUrl(item.href)})` : `**${item.label}**`;
  return item.text ? `- ${label}: ${item.text}` : `- ${label}`;
};

const renderList = (items: ProseListItem[]): string => items.map(renderListItem).join("\n");

const renderBlock = (block: ProseBlock): string => {
  if (block.kind === "heading") {
    return `## ${block.text}`;
  }
  if (block.kind === "list") {
    return renderList(block.items);
  }
  return block.text;
};

const joinLines = (lines: string[]): string => `${lines.join("\n").trimEnd()}\n`;

const footer = `[${siteConfig.name}](${siteConfig.url}) · [All pages](${absoluteUrl("/sitemap.xml")}) · [llms.txt](${absoluteUrl("/llms.txt")})`;

export const renderProsePageMarkdown = (page: ProsePage): string =>
  joinLines([
    `# ${page.heading}`,
    "",
    `> ${page.description}`,
    "",
    ...page.blocks.flatMap((block) => [renderBlock(block), ""]),
    "---",
    "",
    footer,
  ]);

export const renderHomeMarkdown = (): string =>
  joinLines([
    `# ${siteConfig.name}`,
    "",
    `> ${siteSummary}`,
    "",
    ...introParagraphs.flatMap((paragraph) => [paragraph, ""]),
    "## When to use this",
    "",
    renderList(whenToUse),
    "",
    "## Pages",
    "",
    renderList(pageLinks),
    "",
    "## Machine-readable endpoints",
    "",
    renderList(agentEndpoints),
  ]);

export const renderNotFoundMarkdown = (pathname: string): string =>
  joinLines([
    "# 404 — Page not found",
    "",
    `> \`${pathname}\` does not exist on ${siteConfig.url}.`,
    "",
    "Try one of these instead:",
    "",
    renderList(notFoundLinks),
  ]);

/**
 * llmstxt.org format: H1, blockquote, free prose, then H2 sections that are
 * link lists only. The when-to-use guidance sits in the prose block because
 * the spec reserves H2 sections for link lists.
 */
export const renderLlmsTxt = (): string =>
  joinLines([
    `# ${siteConfig.name}`,
    "",
    `> ${siteSummary}`,
    "",
    ...introParagraphs.flatMap((paragraph) => [paragraph, ""]),
    `**When to use ${siteConfig.name}:**`,
    "",
    renderList(whenToUse),
    "",
    "## Pages",
    "",
    renderList([{ href: "/", label: "Home", text: "the calendar app itself" }, ...pageLinks]),
    "",
    "## Machine-readable endpoints",
    "",
    renderList(agentEndpoints),
    "",
    "## Optional",
    "",
    renderList([
      { href: siteConfig.repository, label: "Source code", text: "the full app, MIT licensed" },
      {
        href: `${siteConfig.repository}/issues`,
        label: "Issue tracker",
        text: "bugs and requests",
      },
    ]),
  ]);
