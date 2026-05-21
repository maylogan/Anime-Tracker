import axios from "axios";

const ANILIST_API = "https://graphql.anilist.co";

export const searchAnime = async (query) => {
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
    console.log(
      `Search for "${query}" - Found ${results.length} results:`,
      results.slice(0, 5),
    );
    return results;
  } catch (error) {
    console.error("Error searching anime:", error);
    return [];
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
  };
};
