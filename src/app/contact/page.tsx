import { ProsePageView, prosePageMetadata } from "@/components/prose-page";
import { contactPage } from "@/lib/agent/site-content";

export const metadata = prosePageMetadata(contactPage);

const Page = () => <ProsePageView page={contactPage} />;

export default Page;
