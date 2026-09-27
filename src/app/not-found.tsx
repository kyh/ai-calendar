import type { Metadata } from "next";

import { ProseList } from "@/components/prose-page";
import { notFoundLinks } from "@/lib/agent/site-content";

export const metadata: Metadata = { title: "Page not found" };

const NotFound = () => (
  <main className="mx-auto max-w-2xl px-6 py-16">
    <h1 className="text-2xl font-semibold tracking-tight">404 — Page not found</h1>
    <p className="mt-4 text-muted-foreground">This URL has no content. Try one of these instead:</p>
    <ProseList items={notFoundLinks} />
  </main>
);

export default NotFound;
