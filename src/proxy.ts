import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { negotiateMediaType, notAcceptableBody, withVaryAccept } from "@/lib/agent/accept";

/**
 * Markdown content negotiation (acceptmarkdown.com contract): one URL, two
 * representations. Pages render HTML unconditionally, so the proxy rewrites
 * Markdown-preferring requests to `/api/markdown/*` before the page renders.
 */

const applyVary = (response: NextResponse): NextResponse => {
  response.headers.set("Vary", withVaryAccept(response.headers.get("Vary")));
  return response;
};

export const proxy = (request: NextRequest) => {
  const accept = request.headers.get("accept");
  const chosen = negotiateMediaType(accept);

  if (chosen === "text/markdown") {
    const url = request.nextUrl.clone();
    const { pathname } = request.nextUrl;
    url.pathname = `/api/markdown${pathname === "/" ? "" : pathname}`;
    return applyVary(NextResponse.rewrite(url));
  }

  if (chosen === null) {
    return new Response(notAcceptableBody(accept), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        Vary: "Accept",
      },
      status: 406,
    });
  }

  return applyVary(NextResponse.next());
};

/**
 * Only requests whose Accept names markdown invoke the proxy, so plain HTML
 * views never pay for it. Next and Vercel compile `has` values to their own
 * case-sensitive regexes, hence the per-character case classes instead of a flag.
 * `eve/` is the agent runtime's own transport.
 */
export const config = {
  matcher: [
    {
      has: [{ key: "accept", type: "header", value: ".*[Mm][Aa][Rr][Kk][Dd][Oo][Ww][Nn].*" }],
      source:
        "/((?!api/|eve/|_eve_internal/|_next/|_vercel/|favicon/|robots\\.txt$|sitemap\\.xml$|llms\\.txt$|og\\.jpg$).*)",
    },
  ],
};
