import { ProsePageView, prosePageMetadata } from "@/components/prose-page";
import { privacyPage } from "@/lib/agent/site-content";

export const metadata = prosePageMetadata(privacyPage);

const Page = () => <ProsePageView page={privacyPage} />;

export default Page;
