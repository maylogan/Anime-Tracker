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

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const monthDayYearMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (monthDayYearMatch) {
    const [, month, day, year] = monthDayYearMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Day MonthName YYYY  (e.g., 12 Jan 2020)
  const dayMonthYearMatch = text.match(
    /^(\d{1,2})\s+([a-z]{3,9})\.?\,?\s+(\d{4})$/i,
  );
  if (dayMonthYearMatch) {
    const [, day, monthName, year] = dayMonthYearMatch;
    const month = MONTH_LOOKUP[monthName.toLowerCase().replace(/\.$/, "")];
    if (month) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // MonthName Day, YYYY  (e.g., Jan 12, 2020) or MonthName-Day-YYYY
  const monthNameMatch = text.match(
    /^(?:([a-z]{3,9})\.?[-\s]?)(\d{1,2})[,\s-]+(\d{4})$/i,
  );
  if (monthNameMatch) {
    const [, monthName, day, year] = monthNameMatch;
    const month = MONTH_LOOKUP[monthName.toLowerCase().replace(/\.$/, "")];
    if (month) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // MonthName YYYY (e.g., January 2020) -> use first day of month
  const monthYearMatch = text.match(/^([a-z]{3,9})\.?\s+(\d{4})$/i);
  if (monthYearMatch) {
    const [, monthName, year] = monthYearMatch;
    const month = MONTH_LOOKUP[monthName.toLowerCase().replace(/\.$/, "")];
    if (month) {
      return `${year}-${String(month).padStart(2, "0")}-01`;
    }
  }

  // YYYY-MM or YYYY/MM -> treat as year-month
  const yyyyMmMatch = text.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyyMmMatch) {
    const [, year, month] = yyyyMmMatch;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }

  // MM/YYYY or MM-YYYY -> treat as month-year
  const mmYearMatch = text.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmYearMatch) {
    const [, month, year] = mmYearMatch;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }

  // Year only
  const yearOnlyMatch = text.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    const [, year] = yearOnlyMatch;
    return `${year}-01-01`;
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

  // number first, e.g. "1000 episodes"
  const numberFirstMatch = text.match(/^(\d{1,4})\s*(?:episodes?|eps?|ep\.?)/i);
  if (numberFirstMatch) {
    return Number(numberFirstMatch[1]);
  }

  if (/^\d{1,4}$/.test(text)) {
    const n = Number(text);
    // treat obvious years as years, not episodes
    if (n >= 1900 && n <= 2100) return null;
    return n;
  }

  return null;
};

const parseReleaseDate = (value) => {
  const text = normalizeText(value);
  if (!text) return null;

  // trailing year in parentheses e.g. "Title (2013)"
  const parenYearMatch = text.match(/\((\d{4})\)\s*$/);
  if (parenYearMatch) {
    return normalizeDateValue(parenYearMatch[1]);
  }

  // allow commas inside the labeled value (some exports include commas)
  const labeledMatch = text.match(
    /^(?:release\s*date|aired|air\s*date|date)\s*[:=-]\s*([^|\t]+)/i,
  );
  if (labeledMatch) {
    return normalizeDateValue(labeledMatch[1]);
  }

  const inlineIsoMatch = text.match(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/);
  if (inlineIsoMatch) {
    return normalizeDateValue(inlineIsoMatch[0]);
  }

  // year-month like 2018-10 or 2018/10
  const yearMonthMatch = text.match(/\b(\d{4})[-/](\d{1,2})\b/);
  if (yearMonthMatch) {
    return normalizeDateValue(yearMonthMatch[0]);
  }

  const inlineMonthDayYearMatch = text.match(
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i,
  );
  if (inlineMonthDayYearMatch) {
    return normalizeDateValue(inlineMonthDayYearMatch[0]);
  }
  // fallback: if the whole text is a year, month-year, or other supported pattern
  const fallback = normalizeDateValue(text);
  if (fallback) return fallback;

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
    // Merge segments where a month/day was split from its year by the comma split
    for (let i = 0; i < commaSegments.length - 1; i++) {
      const a = commaSegments[i];
      const b = commaSegments[i + 1];
      if (
        /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(
          a,
        ) &&
        /^\d{4}$/.test(b)
      ) {
        commaSegments[i] = `${a}, ${b}`;
        commaSegments.splice(i + 1, 1);
        i--; // re-evaluate current index
      }
    }
    const metadataSegments = commaSegments.filter(
      (segment, index) => index > 0 && isMetadataSegment(segment),
    );
    if (metadataSegments.length > 0) return commaSegments;
  }

  // split on common dash separators (e.g. " - ", en-dash, em-dash)
  // split on dashes but avoid splitting when hyphen is between digits (dates like 2020-04-03)
  const dashSegments = cleaned
    .split(/(?<!\d)\s*[-–—]\s*|\s*[-–—](?!\d)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (dashSegments.length > 1) return dashSegments;

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
