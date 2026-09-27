import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  renderHomeMarkdown,
  renderLlmsTxt,
  renderNotFoundMarkdown,
  renderProsePageMarkdown,
} from "./markdown";
import { prosePages } from "./site-content";
import type { ProsePage } from "./site-content";

describe("renderLlmsTxt — llmstxt.org format", () => {
  const body = renderLlmsTxt();
  const lines = body.split("\n");

  test("opens with a single H1 then a blockquote summary", () => {
    assert.equal(lines[0], "# AI Calendar");
    assert.equal(lines.filter((line) => line.startsWith("# ")).length, 1);
    assert.equal(lines[2]?.startsWith("> "), true);
  });

  test("keeps every H2 section a list", () => {
    const sections = body.split(/^## /mu).slice(1);
    assert.ok(sections.length >= 3);
    for (const section of sections) {
      const items = section
        .split("\n")
        .slice(1)
        .filter((line) => line.trim().length > 0);
      assert.ok(items.length > 0);
      for (const item of items) {
        assert.equal(item.startsWith("- "), true, item);
      }
    }
  });

  test("puts the when-to-use guidance above the first H2", () => {
    const beforeFirstHeading = body.slice(0, body.indexOf("\n## "));
    assert.match(beforeFirstHeading, /\*\*When to use AI Calendar:\*\*/u);
    assert.match(beforeFirstHeading, /Not a fit/u);
  });

  test("links the trust pages with absolute URLs", () => {
    for (const path of ["/about", "/contact", "/privacy", "/sitemap.xml"]) {
      assert.match(body, new RegExp(`\\]\\(https?://[^)]+${path.replace(".", "\\.")}\\)`, "u"));
    }
  });

  test("ends with exactly one trailing newline", () => {
    assert.equal(body.endsWith("\n"), true);
    assert.equal(body.endsWith("\n\n"), false);
  });
});

describe("renderHomeMarkdown", () => {
  test("carries the when-to-use section and the markdown hint", () => {
    const body = renderHomeMarkdown();
    assert.ok(body.startsWith("# AI Calendar\n"));
    assert.ok(body.includes("## When to use this"));
    assert.ok(body.includes("Accept: text/markdown"));
  });
});

describe("renderNotFoundMarkdown", () => {
  test("names the missing path and points at recovery surfaces", () => {
    const body = renderNotFoundMarkdown("/nope");
    assert.ok(body.startsWith("# 404"));
    assert.ok(body.includes("`/nope`"));
    assert.ok(body.includes("/llms.txt"));
    assert.ok(body.includes("/sitemap.xml"));
  });
});

// Below ~500 characters an agent reads a trust page as a placeholder.
const proseLength = (page: ProsePage): number =>
  page.blocks
    .map((block) =>
      block.kind === "list"
        ? block.items.map((item) => `${item.label} ${item.text ?? ""}`).join(" ")
        : block.text,
    )
    .join(" ").length;

describe("trust pages", () => {
  for (const page of prosePages) {
    test(`${page.path} has real content and one H1`, () => {
      assert.ok(proseLength(page) > 500, `${page.path}: ${proseLength(page)} chars`);
      const body = renderProsePageMarkdown(page);
      assert.deepEqual(body.match(/^# /gmu), ["# "]);
    });
  }
});
