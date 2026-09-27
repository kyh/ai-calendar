import type { Metadata } from "next";

import { CalendarApp } from "@/components/calendar/calendar-app";
import { JsonLd } from "@/components/json-ld";
import { SiteOutline } from "@/components/site-outline";
import { homeGraph } from "@/lib/agent/structured-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const Page = () => (
  <>
    <CalendarApp />
    <SiteOutline />
    <JsonLd node={homeGraph} />
  </>
);

export default Page;
