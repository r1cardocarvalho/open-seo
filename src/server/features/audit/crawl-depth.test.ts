import { expect, it } from "vitest";
import { calculateCrawlDepths } from "./crawl-depth";

it("finds shortest paths for sitemap pages, leaving disconnected cycles unknown", () => {
  const links = new Map([
    ["home", ["a", "shortcut"]],
    ["a", ["b"]],
    ["b", ["target"]],
    ["shortcut", ["target"]],
    ["target", ["home"]],
    ["orphan", ["other-orphan"]],
    ["other-orphan", ["orphan"]],
  ]);
  const pages = Array.from(links.keys(), (url) => ({
    pageId: url,
    url,
    redirectUrl: null,
  }));
  expect(
    calculateCrawlDepths(pages, "home", (id) => links.get(id) ?? []),
  ).toEqual([
    { pageId: "home", depth: 0 },
    { pageId: "a", depth: 1 },
    { pageId: "b", depth: 2 },
    { pageId: "shortcut", depth: 1 },
    { pageId: "target", depth: 2 },
    { pageId: "orphan", depth: null },
    { pageId: "other-orphan", depth: null },
  ]);
});

it("keeps redirects at the same depth, preferring them over longer link paths", () => {
  const pages = [
    { pageId: "home", url: "home", redirectUrl: "canonical" },
    { pageId: "canonical", url: "canonical", redirectUrl: null },
    { pageId: "a", url: "a", redirectUrl: null },
    { pageId: "redirect", url: "redirect", redirectUrl: "target" },
    { pageId: "target", url: "target", redirectUrl: "redirect" },
    { pageId: "child", url: "child", redirectUrl: null },
  ];
  const links = new Map([
    ["canonical", ["a", "redirect"]],
    ["a", ["target"]],
    ["redirect", ["target"]],
    ["target", ["child"]],
  ]);
  expect(
    calculateCrawlDepths(pages, "home", (id) => links.get(id) ?? []),
  ).toEqual([
    { pageId: "home", depth: 0 },
    { pageId: "canonical", depth: 0 },
    { pageId: "a", depth: 1 },
    { pageId: "redirect", depth: 1 },
    { pageId: "target", depth: 1 },
    { pageId: "child", depth: 2 },
  ]);
});
