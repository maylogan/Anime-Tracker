const normalizeText = (value) => String(value || "").trim();

const DEFAULT_IMPORTED_STATUS = "Completed";

const MONTH_LOOKUP = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const IGNORED_SEGMENTS = new Set([
  "episode",
  "episodes",
  "ep",
  "eps",
  "genre",
  "genres",
  "season",
  "seasons",
  "special",
  "specials",
  "movie",
  "movies",
  "ova",
  "ovas",
  "folder",
  "folders",
  "info",
  "metadata",
]);

const stripKnownPrefixes = (value) =>
  normalizeText(value)
    .replace(/^\uFEFF/, "")
    .replace(/^\s*[•*-]\s*/, "")
    .replace(/^\s*\d+[.)-]\s*/, "")
    .trim();

const normalizeDateValue = (value) => {
  const text = normalizeText(value);
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthDayYearMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (monthDayYearMatch) {
    const [, month, day, year] = monthDayYearMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthNameMatch = text.match(
    /^(?:([a-z]{3,9})\.?\s+)(\d{1,2}),?\s+(\d{4})$/i,
  );
  if (monthNameMatch) {
    const [, monthName, day, year] = monthNameMatch;
    const month = MONTH_LOOKUP[monthName.toLowerCase().replace(/\.$/, "")];
    if (month) {
      return `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return null;
};

const parseEpisodeCount = (value) => {
  const text = normalizeText(value).toLowerCase();
  if (!text) return null;

  const labeledMatch = text.match(
    /(?:episodes?|eps?|ep\.?)\s*[:=-]?\s*(\d{1,4})/i,
  );
  if (labeledMatch) {
    return Number(labeledMatch[1]);
  }

  if (/^\d{1,4}$/.test(text)) {
    return Number(text);
  }

  return null;
};

const parseReleaseDate = (value) => {
  const text = normalizeText(value);
  if (!text) return null;

  const labeledMatch = text.match(
    /^(?:release\s*date|aired|air\s*date|date)\s*[:=-]\s*([^|,\t]+)/i,
  );
  if (labeledMatch) {
    return normalizeDateValue(labeledMatch[1]);
  }

  const inlineIsoMatch = text.match(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/);
  if (inlineIsoMatch) {
    return normalizeDateValue(inlineIsoMatch[0]);
  }

  const inlineMonthDayYearMatch = text.match(
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i,
  );
  if (inlineMonthDayYearMatch) {
    return normalizeDateValue(inlineMonthDayYearMatch[0]);
  }

  return null;
};

const isMetadataSegment = (segment) => {
  const text = normalizeText(segment);
  return Boolean(parseEpisodeCount(text) !== null || parseReleaseDate(text));
};

const splitImportLine = (line) => {
  const cleaned = stripKnownPrefixes(line);
  const pipeSegments = cleaned
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (pipeSegments.length > 1) return pipeSegments;

  const tabSegments = cleaned
    .split(/\t+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (tabSegments.length > 1) return tabSegments;

  const commaSegments = cleaned
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaSegments.length > 1) {
    const metadataSegments = commaSegments.filter(
      (segment, index) => index > 0 && isMetadataSegment(segment),
    );
    if (metadataSegments.length > 0) return commaSegments;
  }

  return [cleaned];
};

const extractPlainTitle = (line) => {
  const cleaned = stripKnownPrefixes(line).split(/[\t|]/)[0].trim();

  if (!cleaned) return "";

  const lowerCleaned = cleaned.toLowerCase();
  if (
    IGNORED_SEGMENTS.has(lowerCleaned) ||
    /^\d+$/.test(lowerCleaned) ||
    /^episode\s*\d+$/i.test(cleaned) ||
    /^season\s*\d+$/i.test(cleaned) ||
    /^genre(?:s)?$/i.test(cleaned)
  ) {
    return "";
  }

  const pathParts = cleaned.split(/[\\/]/).filter(Boolean);
  const pathCandidate = pathParts[pathParts.length - 1] || cleaned;
  const pathSegments = pathParts.map((segment) => segment.trim().toLowerCase());

  if (pathSegments.some((segment) => IGNORED_SEGMENTS.has(segment))) {
    return "";
  }

  if (pathCandidate.toLowerCase().startsWith("episode ")) {
    return "";
  }

  const withoutExtension = pathCandidate.replace(/\.[^\.\s/\\]+$/, "").trim();

  if (
    !withoutExtension ||
    IGNORED_SEGMENTS.has(withoutExtension.toLowerCase()) ||
    /^episode\s*\d+$/i.test(withoutExtension) ||
    /^season\s*\d+$/i.test(withoutExtension)
  ) {
    return "";
  }

  return withoutExtension || cleaned;
};

export const parseAnimeImportFile = (fileText, fileName = "") => {
  const text = normalizeText(fileText);
  if (!text) return [];

  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .map(({ line, index }) => {
      const segments = splitImportLine(line);
      const titleSegment = segments.find(
        (segment) => !isMetadataSegment(segment),
      );
      const fallbackTitle = extractPlainTitle(line);
      const title = normalizeText(titleSegment || fallbackTitle);
      if (!title) return null;

      const episodes =
        segments
          .map((segment) => parseEpisodeCount(segment))
          .find((value) => value !== null) ?? null;
      const releaseDate =
        segments
          .map((segment) => parseReleaseDate(segment))
          .find((value) => value) ?? parseReleaseDate(line);

      return {
        anime_id: Date.now() + index,
        title,
        poster_url: "",
        categories: [],
        rating: 0,
        audience_rating: null,
        status: DEFAULT_IMPORTED_STATUS,
        notes: "",
        episodes,
        release_date: releaseDate,
      };
    })
    .filter(Boolean);
};
