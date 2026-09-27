export const siteConfig = {
  author: { name: "Kaiyu Hsu", url: "https://kyh.io" },
  creator: "@kaiyuhsu",
  description:
    "AI-native calendar — manage your schedule in natural language. Forkable Next.js template.",
  email: "im.kaiyu@gmail.com",
  name: "AI Calendar",
  repository: "https://github.com/kyh/ai-calendar",
  routes: ["", "/about", "/contact", "/privacy"],
  sameAs: ["https://github.com/kyh/ai-calendar", "https://x.com/kaiyuhsu", "https://kyh.io"],
  shortName: "AI Calendar",
  url: process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://calendar.kyh.io",
};

export const ogImage = { height: 1080, url: `${siteConfig.url}/og.jpg`, width: 1920 };
