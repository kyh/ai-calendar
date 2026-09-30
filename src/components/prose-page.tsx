import type { Metadata } from "next";
import Link from "next/link";

import type { ProseBlock, ProseListItem, ProsePage } from "@/lib/agent/site-content";
import { ogImage, siteConfig } from "@/lib/config";

/**
 * Next replaces a layout's `openGraph` wholesale rather than merging it, so a
 * page that sets its own URL must restate `type` and `images` too.
 */
export const prosePageMetadata = (page: ProsePage): Metadata => ({
  alternates: { canonical: page.path },
  description: page.description,
  openGraph: {
    description: page.description,
    images: [ogImage],
    siteName: siteConfig.name,
    title: page.heading,
    type: "website",
    url: page.path,
  },
  title: page.heading,
});

/** Route handlers (`/llms.txt`, `/sitemap.xml`) and off-site URLs must bypass the client router. */
const isRouterPage = (href: string): boolean =>
  href.startsWith("/") && !(href.split("/").pop() ?? "").includes(".");

type LinkFocus = "tabbable" | "untabbable";

const ProseLink = ({ href, label, focus }: { href: string; label: string; focus: LinkFocus }) => {
  const tabIndex = focus === "untabbable" ? -1 : undefined;
  return isRouterPage(href) ? (
    <Link
      href={href}
      prefetch={focus === "untabbable" ? false : undefined}
      tabIndex={tabIndex}
      className="font-medium underline underline-offset-4"
    >
      {label}
    </Link>
  ) : (
    <a href={href} tabIndex={tabIndex} className="font-medium underline underline-offset-4">
      {label}
    </a>
  );
};

/** `untabbable` is for lists inside visually hidden blocks, so keyboard focus never lands on something invisible. */
export const ProseList = ({
  items,
  focus = "tabbable",
}: {
  items: ProseListItem[];
  focus?: LinkFocus;
}) => (
  <ul className="mt-4 list-disc space-y-2 pl-5">
    {items.map((item) => (
      <li key={item.label}>
        {item.href === undefined ? (
          <span className="font-medium">{item.label}</span>
        ) : (
          <ProseLink href={item.href} label={item.label} focus={focus} />
        )}
        {item.text && <span className="text-muted-foreground">: {item.text}</span>}
      </li>
    ))}
  </ul>
);

const Block = ({ block }: { block: ProseBlock }) => {
  if (block.kind === "heading") {
    return <h2 className="mt-10 text-lg font-semibold tracking-tight">{block.text}</h2>;
  }
  if (block.kind === "list") {
    return <ProseList items={block.items} />;
  }
  return <p className="mt-4 leading-relaxed text-muted-foreground">{block.text}</p>;
};

export const ProsePageView = ({ page }: { page: ProsePage }) => (
  <main className="mx-auto max-w-2xl px-6 py-16">
    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
      ← {siteConfig.name}
    </Link>
    <h1 className="mt-6 text-3xl font-semibold tracking-tight">{page.heading}</h1>
    {page.blocks.map((block) => (
      <Block key={block.kind === "list" ? block.items[0]?.label : block.text} block={block} />
    ))}
  </main>
);
