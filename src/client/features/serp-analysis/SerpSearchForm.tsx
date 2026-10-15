import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { LocationSelect } from "@/client/components/LocationSelect";
import {
  getLanguageCode,
  SERP_LANGUAGE_OPTIONS,
} from "@/shared/keyword-locations";
import type { SerpPageSearch } from "@/types/schemas/serp-analysis";
export function SerpSearchForm({
  keyword,
  locationCode,
  languageCode,
  locationName,
  busy,
  onSearch,
}: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  locationName?: string;
  busy: boolean;
  onSearch: (search: SerpPageSearch) => void;
}) {
  const [draft, setDraft] = useState(keyword);
  const [country, setCountry] = useState(locationCode);
  const [language, setLanguage] = useState(languageCode);
  const [local, setLocal] = useState(locationName);
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (draft.trim() && !busy)
          onSearch({
            q: draft.trim(),
            loc: country,
            lang: language,
            locName: local,
          });
      }}
    >
      <label className="min-w-48 flex-1 space-y-1 text-sm">
        <span>Keyword</span>
        <Input
          aria-label="Keyword"
          placeholder="e.g. CRM software"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={200}
          required
        />
      </label>
      <div className="w-56 space-y-1 text-sm">
        <span>Country</span>
        <LocationSelect
          value={country}
          onChange={(code) => {
            setCountry(code);
            setLanguage(getLanguageCode(code));
            setLocal(undefined);
          }}
        />
      </div>
      <label className="space-y-1 text-sm">
        <span>Language</span>
        <select
          aria-label="Language"
          className="block h-9 w-40 rounded-md border bg-background px-3 text-sm"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {SERP_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={!draft.trim()} pending={busy}>
        <Search className="size-4" />
        Analyze
      </Button>
      <p className="w-full text-xs text-muted-foreground">
        New lookups use credits. Cached data is reused.
      </p>
      {local ? (
        <p className="w-full text-xs text-muted-foreground">
          Using local results for {local}.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setCountry(locationCode);
              setLocal(undefined);
            }}
          >
            Use country-wide results
          </button>
        </p>
      ) : null}
    </form>
  );
}
