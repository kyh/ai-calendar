import { siteConfig } from "@/lib/config";

import { absoluteUrl } from "./markdown";
import { siteSummary } from "./site-content";

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export interface JsonLdNode {
  [key: string]: JsonLdValue;
}

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;

/**
 * No `address` or phone on purpose: this is a personal open-source project
 * with no premises, and an invented PostalAddress would be worse than none.
 */
export const organization = {
  "@id": ORGANIZATION_ID,
  "@type": "Organization",
  contactPoint: [
    {
      "@type": "ContactPoint",
      availableLanguage: ["en"],
      contactType: "customer support",
      email: siteConfig.email,
      url: absoluteUrl("/contact"),
    },
    {
      "@type": "ContactPoint",
      availableLanguage: ["en"],
      contactType: "technical support",
      email: siteConfig.email,
      url: `${siteConfig.repository}/issues`,
    },
  ],
  description: siteSummary,
  email: siteConfig.email,
  founder: { "@type": "Person", name: siteConfig.author.name, url: siteConfig.author.url },
  logo: absoluteUrl("/favicon/favicon-96x96.png"),
  name: siteConfig.name,
  sameAs: siteConfig.sameAs,
  url: siteConfig.url,
} satisfies JsonLdNode;

const website = {
  "@id": `${siteConfig.url}/#website`,
  "@type": "WebSite",
  description: siteConfig.description,
  inLanguage: "en-US",
  name: siteConfig.name,
  publisher: { "@id": ORGANIZATION_ID },
  url: siteConfig.url,
} satisfies JsonLdNode;

const application = {
  "@id": `${siteConfig.url}/#application`,
  "@type": "SoftwareApplication",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Calendar",
  codeRepository: siteConfig.repository,
  description: siteSummary,
  featureList: [
    "Create, move and delete events in natural language",
    "Month and week views",
    "Events stored locally in the browser, no account",
    "Forkable Next.js + eve template",
  ],
  image: absoluteUrl("/og.jpg"),
  isAccessibleForFree: true,
  license: "https://opensource.org/licenses/MIT",
  name: siteConfig.name,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  operatingSystem: "Any (web browser)",
  publisher: { "@id": ORGANIZATION_ID },
  url: siteConfig.url,
} satisfies JsonLdNode;

export const homeGraph = {
  "@context": "https://schema.org",
  "@graph": [organization, website, application],
} satisfies JsonLdNode;

/** Escapes `<` so no value can close the surrounding `<script>` early. */
export const serializeJsonLd = (node: JsonLdNode): string =>
  JSON.stringify(node).replaceAll("<", "\\u003c");
