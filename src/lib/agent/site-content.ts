import { siteConfig } from "@/lib/config";

/**
 * Every word the site says about itself, authored once and rendered twice: as
 * JSX (homepage text layer, /about, /contact, /privacy, 404) and as Markdown
 * (`Accept: text/markdown`, /llms.txt). One source keeps the two
 * representations from drifting.
 */

export interface ProseListItem {
  label: string;
  /** When present the label renders as a link. */
  href?: string;
  text?: string;
}

export type ProseBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: ProseListItem[] };

export interface ProsePage {
  path: string;
  heading: string;
  /** `<meta name="description">` and the Markdown blockquote summary. */
  description: string;
  blocks: ProseBlock[];
}

export const siteSummary = `${siteConfig.name} is a calendar you talk to: type "lunch with Sam tomorrow at noon" or "move my 3pm to Thursday" and an AI assistant creates, moves, and deletes events for you. It is also a free, MIT-licensed Next.js template you can fork.`;

export const introParagraphs: string[] = [
  `${siteConfig.name} pairs a month and week calendar with a chat assistant. Ask it a question about your schedule and it answers from your events; ask it to change something and it calls a typed tool that updates the calendar in front of you. You can also click any day or time slot to add an event by hand, and click an event to edit or delete it.`,
  "There is no sign-up and no server-side database. Events are saved in your browser's localStorage, so the calendar is yours and stays on your device. The assistant runs on eve, Vercel's agent framework, through Vercel AI Gateway; on the hosted demo you bring your own AI Gateway key.",
  `The whole app is open source at ${siteConfig.repository} — Next.js 16, React 19, Tailwind CSS, Base UI and eve — and is meant to be forked as a starting point for AI-native apps that act on user data through tools.`,
];

/** Concrete about the jobs this is right for, and the ones it is not, so an agent can rule it out fast. */
export const whenToUse: ProseListItem[] = [
  {
    label: "A person wants a quick personal calendar they can drive in plain English",
    text: "no account, works in the browser, events persist locally",
  },
  {
    label: "A developer wants a reference for an AI agent that edits app state through tools",
    text: "create_event, update_event and delete_event are typed eve tools whose results stream into a zustand store",
  },
  {
    label: "A developer wants a forkable Next.js + eve + AI SDK starter",
    text: `clone ${siteConfig.repository}, run \`pnpm install && pnpm dev\`, add an AI Gateway key`,
  },
  {
    label: "Not a fit",
    text: "this is not a Google Calendar or CalDAV client, does not sync across devices, sends no invites, and has no public API, SDK, or MCP server for agents to call",
  },
];

export const pageLinks: ProseListItem[] = [
  { href: "/about", label: "About", text: "what AI Calendar is and how it is built" },
  { href: "/contact", label: "Contact", text: "email and GitHub issues" },
  { href: "/privacy", label: "Privacy", text: "what is stored, where, and who processes it" },
];

export const agentEndpoints: ProseListItem[] = [
  { href: "/llms.txt", label: "/llms.txt", text: "this overview for language models" },
  { href: "/sitemap.xml", label: "/sitemap.xml", text: "every indexable URL" },
  {
    label: "Markdown for any page",
    text: "send `Accept: text/markdown` to any page URL and the same content comes back as Markdown",
  },
];

export const notFoundLinks: ProseListItem[] = [
  { href: "/", label: "Home", text: "the calendar" },
  ...pageLinks,
  { href: "/llms.txt", label: "/llms.txt", text: "site overview for agents" },
  { href: "/sitemap.xml", label: "/sitemap.xml", text: "every indexable URL" },
];

export const aboutPage: ProsePage = {
  blocks: [
    ...introParagraphs.map((text): ProseBlock => ({ kind: "paragraph", text })),
    { kind: "heading", text: "How it works" },
    {
      kind: "paragraph",
      text: "Each chat message is sent with a snapshot of the calendar: the current time, your timezone, and your events from 45 days before to 45 days after today. The assistant reads that snapshot to answer questions, and changes the schedule only by calling one of three tools. The browser validates every tool result against a schema before applying it, then shows a toast so you can see exactly what changed.",
    },
    { kind: "heading", text: "Who makes it" },
    {
      kind: "paragraph",
      text: `${siteConfig.name} is built and maintained by ${siteConfig.author.name} as one of a set of open-source AI app templates. It is a personal project, not a company product.`,
    },
    {
      items: [
        { href: siteConfig.repository, label: "Source code", text: "MIT licensed, on GitHub" },
        { href: siteConfig.author.url, label: siteConfig.author.name, text: "author" },
        { href: "/contact", label: "Contact", text: "questions, bugs and feedback" },
      ],
      kind: "list",
    },
  ],
  description: `What ${siteConfig.name} is, how the assistant changes your calendar, and who builds it.`,
  heading: `About ${siteConfig.name}`,
  path: "/about",
};

export const contactPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} is maintained by ${siteConfig.author.name}. There is no support team or ticketing system — messages reach the person who wrote the code, and most get a reply within a few days.`,
    },
    { kind: "heading", text: "Channels" },
    {
      items: [
        {
          href: `mailto:${siteConfig.email}`,
          label: siteConfig.email,
          text: "email for anything private, including security reports",
        },
        {
          href: `${siteConfig.repository}/issues`,
          label: "GitHub issues",
          text: "bug reports, feature requests and questions about forking the template",
        },
        {
          href: siteConfig.author.url,
          label: "kyh.io",
          text: "the author's site and other projects",
        },
      ],
      kind: "list",
    },
    { kind: "heading", text: "Before you write" },
    {
      kind: "paragraph",
      text: "Your events never leave your browser except inside a chat message, so there is no account to recover and nothing I can look up or restore for you. If the assistant stops responding on the hosted demo, check that your Vercel AI Gateway key is valid and has credit — most chat errors are an invalid or missing key.",
    },
    {
      kind: "paragraph",
      text: "When reporting a bug, include your browser, what you typed to the assistant, and what happened instead. Screenshots help. Please do not paste your AI Gateway key into an issue or email.",
    },
  ],
  description: `How to reach the maintainer of ${siteConfig.name}: email and GitHub issues.`,
  heading: `Contact ${siteConfig.name}`,
  path: "/contact",
};

export const privacyPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} has no accounts, no sign-in and no database of its own. This page lists everything the app stores or sends, and who processes it.`,
    },
    { kind: "heading", text: "Stored in your browser" },
    {
      items: [
        {
          label: "Your events",
          text: "saved in localStorage on your device. They are not uploaded anywhere except as part of a chat message (below). Clearing site data deletes them.",
        },
        {
          label: "Your AI Gateway key",
          text: "if you add one, it is saved in localStorage and sent with each chat request as a bearer token. Remove it from the key dialog at any time.",
        },
      ],
      kind: "list",
    },
    { kind: "heading", text: "Sent when you use the assistant" },
    {
      kind: "paragraph",
      text: "Each chat message is sent together with your timezone and your events from 45 days either side of today. The request goes to the agent runtime (eve) running on Vercel, which forwards it through Vercel AI Gateway to the language model provider (OpenAI). The runtime keeps the conversation's session state on Vercel for as long as the session lasts. Nothing is sent if you never open the assistant or send a message.",
    },
    { kind: "heading", text: "Analytics and hosting" },
    {
      kind: "paragraph",
      text: "The site is hosted on Vercel, which processes standard request logs. It uses Vercel Web Analytics for aggregate page-view counts and Vercel Speed Insights for page performance metrics; neither sets cookies. There is no advertising, no third-party tracking, and no data is sold.",
    },
    { kind: "heading", text: "Questions" },
    {
      kind: "paragraph",
      text: `Write to ${siteConfig.email} with any privacy question. If you fork the template and deploy your own copy, you are responsible for your deployment's privacy practices.`,
    },
  ],
  description: `What ${siteConfig.name} stores, what it sends when you use the assistant, and who processes it.`,
  heading: "Privacy",
  path: "/privacy",
};

export const prosePages: ProsePage[] = [aboutPage, contactPage, privacyPage];

export const findProsePage = (path: string): ProsePage | undefined =>
  prosePages.find((page) => page.path === path);
