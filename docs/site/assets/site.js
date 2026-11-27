(() => {
  const editions = window.docaDocsLanguages;
  const languages = Object.keys(editions);
  const images = new URL("assets/images/", document.baseURI);
  const localizedConfig = (field, fallback) => ({
    ...Object.fromEntries(languages.map(code => [`/${code}/`, editions[code][field]])),
    "/": fallback,
  });
  const pageIndex = fetch("assets/pages.json").then(response => {
    if (!response.ok) throw new Error("Cannot load the documentation page index");
    return response.json();
  });
  let language = "en";
  let mermaid;
  function localizeSearch() {
    const edition = editions[language];
    const search = document.querySelector(".search");
    if (!search) return;
    const clear = search.querySelector(".clear-button");
    clear.title = edition.clear;
    clear.querySelector("span").textContent = edition.clear;
    search.querySelector("input").setAttribute("aria-label", edition.search);
    const status = search.querySelector(".results-status");
    const count = /^Found (\d+) results$/.exec(status.textContent)?.[1];
    if (count) status.textContent = edition.results.replace("{count}", count);
  }
  window.$docsify = {
    name: "Doca",
    repo: "workhold/doca",
    nameLink: {
      ...Object.fromEntries(languages.map(code => [`/${code}/`, `#/${code}/`])),
      "/": "#/en/",
    },
    skipLink: localizedConfig("skip", editions.en.skip),
    loadSidebar: true,
    loadNavbar: true,
    mergeNavbar: true,
    auto2top: true,
    subMaxLevel: 2,
    notFoundPage: "/_404.md",
    alias: {
      "/_sidebar.md": "/en/_sidebar.md",
      "/_navbar.md": "/en/_navbar.md",
      ...Object.fromEntries(languages.flatMap(code =>
        ["_sidebar.md", "_navbar.md"].map(file => [
          `/${code}/(?:.*/)?${file}`,
          `/${code}/${file}`,
        ]),
      )),
    },
    search: {
      paths: "auto",
      namespace: "doca-docs-0.3.1",
      pathNamespaces: languages.map(code => "/" + code),
      placeholder: localizedConfig("search", editions.en.search),
      noData: localizedConfig("noResults", editions.en.noResults),
      depth: 6,
      maxAge: 3600000,
    },
    plugins: [function (hook, vm) {
      hook.mounted(() => {
        localizeSearch();
        const status = document.querySelector(".search .results-status");
        if (status) new MutationObserver(localizeSearch).observe(status, { childList: true });
      });
      hook.beforeEach((markdown, next) => {
        // The image directory is shared by all routes under the Pages site base.
        markdown = markdown.replace(/\]\(assets\/images\//g, `](${images}`);
        const path = vm.route.path === "/" ? "/en/" : vm.route.path;
        const code = path.split("/")[1];
        language = Object.hasOwn(editions, code) ? code : "en";
        const edition = editions[language];
        document.documentElement.lang = edition.tag;
        pageIndex.then(pages => {
          const page = pages.find(row => row[language]?.route === path);
          if (!page) { next(markdown); return; }
          const alternate = languages.map(code =>
            `[${editions[code].name}](${page[code]?.route ?? `/${code}/`})`,
          );
          next(`${markdown}\n\n---\n\n[${edition.edit}](https://github.com/workhold/doca/edit/main/docs/${page[language].source})\n\n${alternate.join(" · ")}\n`);
        }).catch(error => {
          console.error(error);
          next(markdown);
        });
      });
      hook.doneEach(async () => {
        localizeSearch();
        const diagrams = [...document.querySelectorAll('.markdown-section pre[data-lang="mermaid"]')];
        if (!diagrams.length) return;
        try {
          mermaid ??= import("https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.esm.min.mjs").then(module => {
            module.default.initialize({ startOnLoad: false, securityLevel: "strict" });
            return module.default;
          });
          const renderer = await mermaid;
          for (const pre of diagrams) {
            if (!pre.isConnected) continue;
            const node = document.createElement("div");
            node.className = "mermaid";
            node.textContent = pre.querySelector("code")?.textContent ?? pre.textContent;
            pre.replaceWith(node);
            await renderer.run({ nodes: [node] });
          }
        } catch (error) { console.error("Mermaid rendering failed", error); }
      });
    }]
  };
})();
