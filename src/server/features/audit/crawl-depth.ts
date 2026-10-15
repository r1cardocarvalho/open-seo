interface DepthPage {
  pageId: string;
  url: string;
  redirectUrl: string | null;
}

/** Shortest link paths over crawled pages. Redirects cost no extra click.
 * Read targets one page at a time so a large graph stays in SQLite. */
export function calculateCrawlDepths(
  pages: Iterable<DepthPage>,
  startUrl: string,
  getTargets: (pageId: string) => Iterable<string>,
): Array<{ pageId: string; depth: number | null }> {
  const byUrl = new Map(Array.from(pages, (page) => [page.url, page]));
  const depths = new Map<string, number>();
  let current = [startUrl];
  depths.set(startUrl, 0);

  for (let depth = 0; current.length > 0; depth++) {
    const next = new Set<string>();
    for (let i = 0; i < current.length; i++) {
      const url = current[i];
      if (depths.get(url) !== depth) continue;
      const page = byUrl.get(url);
      if (!page) continue;

      const redirect = page.redirectUrl;
      if (
        redirect &&
        byUrl.has(redirect) &&
        (depths.get(redirect) ?? Infinity) > depth
      ) {
        depths.set(redirect, depth);
        current.push(redirect);
      }
      for (const target of getTargets(page.pageId)) {
        if (byUrl.has(target) && (depths.get(target) ?? Infinity) > depth + 1) {
          depths.set(target, depth + 1);
          next.add(target);
        }
      }
    }
    current = Array.from(next);
  }

  return Array.from(byUrl.values(), (page) => ({
    pageId: page.pageId,
    depth: depths.get(page.url) ?? null,
  }));
}
