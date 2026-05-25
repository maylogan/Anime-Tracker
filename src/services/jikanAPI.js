import axios from "axios";

const ANILIST_API = "https://graphql.anilist.co";
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map();
const pendingSearches = new Map();

export const searchAnime = async (query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const cached = searchCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.results;
  }

  if (pendingSearches.has(normalizedQuery)) {
    return pendingSearches.get(normalizedQuery);
  }

  const request = (async () => {
    try {
      const { data } = await axios.post(ANILIST_API, {
        query: `
          query Search($search: String!) {
            Page(perPage: 50) {
              media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                id
                title {
                  english
                  romaji
                  native
                }
                genres
                averageScore
                coverImage {
                  extraLarge
                  large
                }
                episodes
                startDate {
                  year
                  month
                  day
                }
              }
            }
          }
        `,
        variables: { search: query.trim() },
      });

      const results = data.data?.Page?.media || [];
      searchCache.set(normalizedQuery, {
        timestamp: Date.now(),
        results,
      });
      console.log(
        `Search for "${query}" - Found ${results.length} results:`,
        results.slice(0, 5),
      );
      return results;
    } catch (error) {
      console.error("Error searching anime:", error);
      return [];
    }
  })();

  pendingSearches.set(normalizedQuery, request);

  try {
    return await request;
  } finally {
    pendingSearches.delete(normalizedQuery);
  }
};

export const getAnimeDetails = async (animeId) => {
  try {
    const { data } = await axios.post(ANILIST_API, {
      query: `
        query GetAnime($id: Int!) {
          Media(id: $id, type: ANIME) {
            id
            title {
              english
              romaji
            }
            genres
            averageScore
            coverImage {
              extraLarge
              large
            }
          }
        }
      `,
      variables: { id: animeId },
    });
    return data.data?.Media || null;
  } catch (error) {
    console.error("Error fetching anime details:", error);
    return null;
  }
};

export const formatAnimeForEntry = (anime) => {
  // Format start date to YYYY-MM-DD format if available
  let releaseDate = "";
  if (anime.startDate?.year) {
    const month = String(anime.startDate.month || 1).padStart(2, "0");
    const day = String(anime.startDate.day || 1).padStart(2, "0");
    releaseDate = `${anime.startDate.year}-${month}-${day}`;
  }

  return {
    anime_id: anime.id,
    title: anime.title?.english || anime.title?.romaji || "Unknown",
    poster_url: anime.coverImage?.extraLarge || anime.coverImage?.large || "",
    categories: anime.genres || [],
    episodes: anime.episodes || null,
    release_date: releaseDate || null,
    audience_rating:
      typeof anime.averageScore === "number" && anime.averageScore > 0
        ? Number((anime.averageScore / 10).toFixed(1))
        : null,
  };
};
