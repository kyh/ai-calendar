import { ProsePageView, prosePageMetadata } from "@/components/prose-page";
import { aboutPage } from "@/lib/agent/site-content";

export const metadata = prosePageMetadata(aboutPage);

const Page = () => <ProsePageView page={aboutPage} />;

export default Page;
