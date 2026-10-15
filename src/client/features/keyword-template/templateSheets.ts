export type TemplateColumn = {
  key: string;
  label: string;
  kind?: "yesno";
};

export type TemplateRow = {
  id: string;
  cells: Record<string, string>;
};

export type TemplateSheet = {
  id: string;
  label: string;
  columns: TemplateColumn[];
  seed: TemplateRow[];
};

export function textRow(
  id: string,
  columns: TemplateColumn[],
  values: Record<string, string> = {},
): TemplateRow {
  const cells: Record<string, string> = {};
  for (const column of columns) {
    cells[column.key] =
      values[column.key] ?? (column.kind === "yesno" ? "No" : "");
  }
  return { id, cells };
}

export const keywordColumns: TemplateColumn[] = [
  { key: "keyword", label: "Keyword" },
  { key: "category1", label: "Category 1" },
  { key: "category2", label: "Category 2" },
  { key: "avgVolume", label: "Avg Volume" },
  { key: "difficulty", label: "Difficulty" },
  { key: "serpCtr", label: "SERP CTR" },
  { key: "mozPriority", label: "Moz Priority" },
  { key: "onSiteRelevance", label: "SITE On Site Relevance" },
  { key: "notes", label: "Notes" },
  { key: "minVolume", label: "Min Volume" },
  { key: "maxVolume", label: "Max Volume" },
  { key: "targeted", label: "Targeted?", kind: "yesno" },
];

const siteColumns: TemplateColumn[] = [
  { key: "keywords", label: "Keyword(s)" },
  { key: "category1", label: "Category 1" },
  { key: "category2", label: "Category 2" },
  { key: "hubPageCategory", label: "Hub Page Category" },
  { key: "product", label: "Product" },
  { key: "url", label: "URL" },
  { key: "pageTitle", label: "Page Title" },
  { key: "ogTitle", label: "OG Title" },
  { key: "metaDescription", label: "Meta Description" },
  { key: "ogDescription", label: "OG Description" },
  { key: "h1", label: "H1" },
  { key: "h2One", label: "H2-1" },
  { key: "h2Two", label: "H2-2" },
  { key: "h2Three", label: "H2-3" },
  { key: "h2Four", label: "H2-4" },
  { key: "contentNotes", label: "Content Notes" },
  { key: "done", label: "Done?", kind: "yesno" },
];

const architectureColumns: TemplateColumn[] = [
  { key: "topNavigation", label: "Top Navigation (For Brand & Selling)" },
  { key: "footer", label: "Footer" },
  { key: "blog", label: "Blog" },
];

const youtubeColumns: TemplateColumn[] = [
  { key: "targetKeyword", label: "Target Keyword" },
  { key: "videoTitle", label: "Video Title" },
  { key: "description", label: "Description" },
  { key: "hashtags", label: "1-3 Hashtags" },
  { key: "released", label: "Released?", kind: "yesno" },
  { key: "notes", label: "Notes" },
];

const reelsColumns: TemplateColumn[] = [
  { key: "targetKeyword", label: "Target Keyword" },
  { key: "description", label: "Description" },
  { key: "hashtags", label: "4 Hashtags (For TikTok Only)" },
  { key: "released", label: "Released?", kind: "yesno" },
  { key: "notes", label: "Notes" },
];

export const templateSheets: TemplateSheet[] = [
  {
    id: "keywords",
    label: "Keywords",
    columns: keywordColumns,
    seed: [
      textRow("keywords-1", keywordColumns, {
        keyword: "Keyword 1",
        category1: "Category A",
        category2: "Category C",
        avgVolume: "31",
        difficulty: "17",
        serpCtr: "64",
        mozPriority: "46",
        onSiteRelevance: "1",
        notes: "Notes about SERP",
        minVolume: "11",
        maxVolume: "50",
        targeted: "Yes",
      }),
      textRow("keywords-2", keywordColumns, {
        keyword: "Keyword 2",
        category1: "Category B",
        category2: "Category D",
        avgVolume: "31",
        difficulty: "17",
        serpCtr: "62",
        mozPriority: "46",
        onSiteRelevance: "1",
        notes: "Notes about SERP",
        minVolume: "11",
        maxVolume: "50",
        targeted: "No",
      }),
    ],
  },
  {
    id: "site-seo-layout",
    label: "Site SEO Layout",
    columns: siteColumns,
    seed: [
      textRow("site-1", siteColumns, {
        keywords: "Keyword 1, Keyword 2, Keyword 3",
        category1: "Home",
        category2: "Paid",
        hubPageCategory: "Blue",
        product: "Product",
        url: "test.com/uses/keyword-1",
        ogTitle: "TBD",
        ogDescription: "TBD",
        h1: "TBD",
        h2One: "TBD",
        h2Two: "TBD",
        h2Three: "TBD",
        h2Four: "TBD",
        contentNotes: "TBD",
        done: "Yes",
      }),
      textRow("site-2", siteColumns, {
        keywords: "N/A",
        category1: "Home",
        product: "Product",
        url: "Another URL",
        ogTitle: "TBD",
        ogDescription: "TBD",
        h1: "TBD",
        h2One: "TBD",
        h2Two: "TBD",
        h2Three: "TBD",
        h2Four: "TBD",
        contentNotes: "TBD",
        done: "No",
      }),
    ],
  },
  {
    id: "information-architecture",
    label: "Information Architecture",
    columns: architectureColumns,
    seed: [textRow("architecture-1", architectureColumns)],
  },
  {
    id: "youtube-seo",
    label: "YouTube SEO",
    columns: youtubeColumns,
    seed: [textRow("youtube-1", youtubeColumns)],
  },
  {
    id: "ig-reels-tiktok-seo",
    label: "IG ReelsTikTok SEO",
    columns: reelsColumns,
    seed: [textRow("reels-1", reelsColumns)],
  },
];

export function seedWorkbook(): Record<string, TemplateRow[]> {
  return Object.fromEntries(
    templateSheets.map((sheet) => [sheet.id, sheet.seed]),
  );
}
