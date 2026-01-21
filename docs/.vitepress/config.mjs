import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "en-US",
  title: "Mono-Toolkit",
  description: "Deterministic Docker-first monorepo toolkit",
  base: "/mono-toolkit/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide" },
      { text: "Commands", link: "/commands" },
      { text: "Configuration", link: "/configuration" }
    ],
    sidebar: [
      {
        text: "Overview",
        items: [
          { text: "Home", link: "/" },
          { text: "Getting Started", link: "/guide" }
        ]
      },
      {
        text: "CLI",
        items: [
          { text: "Commands", link: "/commands" },
          { text: "Scopes", link: "/scopes" },
          { text: "Pipelines", link: "/pipelines" }
        ]
      },
      {
        text: "Configuration",
        items: [
          { text: "Config Files", link: "/configuration" },
          { text: "Tasks", link: "/tasks" },
          { text: "Reports", link: "/reports" }
        ]
      },
      {
        text: "Workflows",
        items: [
          { text: "Contracts", link: "/contracts" },
          { text: "Docs", link: "/docs" },
          { text: "Scaffolding", link: "/scaffolding" },
          { text: "Security", link: "/security" }
        ]
      }
    ]
  }
});
