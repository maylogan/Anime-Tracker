import { parseAnimeImportFile } from "../src/services/bulkImport.js";

const samples = [
  "Black Clover | 170 | Release Date: 10/08/2017",
  "One Piece, 1000 episodes, Aired: Jul 22, 1999",
  "Naruto - 220 - 2002",
  "Some Anime - 2020",
  "Some Anime - January 2020",
  "Some Anime - 2020-04-03",
  "Some Anime (2013)",
  "Title\tEpisodes: 12\tAir Date: 12 Jan 2015",
  "Title, eps: 24, release date: October 5, 2018",
  "Title - release date: 2018/10/05",
  "Title - aired: 2018-10",
  "Title - date: 2018",
  "JoJo's Bizarre Adventure - Stardust Crusaders - 48 episodes",
  "86 -Eighty Six- | Episodes: 23",
];

for (const s of samples) {
  const parsed = parseAnimeImportFile(s);
  console.log("INPUT:", s);
  console.log("PARSED:", JSON.stringify(parsed, null, 2));
  console.log("---");
}

console.log("Done");
