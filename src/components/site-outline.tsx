import { ProseList } from "@/components/prose-page";
import {
  agentEndpoints,
  introParagraphs,
  pageLinks,
  siteSummary,
  whenToUse,
} from "@/lib/agent/site-content";

/**
 * The calendar renders client-side, so without this a crawler that does not
 * run JavaScript sees only chrome. Screen-reader-only: it describes the app
 * without changing how it looks.
 */
export const SiteOutline = () => (
  <section className="sr-only" aria-label="About this app">
    {[siteSummary, ...introParagraphs].map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
    <h2>When to use this</h2>
    <ProseList items={whenToUse} />
    <h2>Pages</h2>
    <ProseList items={[...pageLinks, ...agentEndpoints]} focus="untabbable" />
  </section>
);
