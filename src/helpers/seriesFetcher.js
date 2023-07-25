import DomParser from "dom-parser";
import { decode as entityDecoder } from "html-entities";
import apiRequestRawHtml from "./apiRequestRawHtml";

const MAX_SEASONS = 2;

export default async function seriesFetcher(id) {
  try {
    const parser = new DomParser();
    const rawHtml = await apiRequestRawHtml(
      `https://www.imdb.com/title/${id}/episodes/_ajax`
    );
    const dom = parser.parseFromString(rawHtml);

    const seasonOption = dom.getElementById("bySeason");
    const seasonOptions = seasonOption.getElementsByTagName("option");
    const allSeasons = Array.from(seasonOptions).map((option) => ({
      id: option.getAttribute("value"),
      name: `Season ${option.getAttribute("value")}`,
      api_path: `/title/${id}/season/${option.getAttribute("value")}`,
    }));

    const selectedSeasons = Array.from(seasonOptions)
      .filter((option) => option.getAttribute("selected") === "selected")
      .map((option) => ({
        id: option.getAttribute("value"),
        api_path: `/title/${id}/season/${option.getAttribute("value")}`,
      }));

    const seasons = await Promise.all(
      selectedSeasons.map(async (season) => {
        try {
          let html = rawHtml;
          if (!season.isSelected) {
            html = await apiRequestRawHtml(
              `https://www.imdb.com/title/${id}/episodes/_ajax?season=${season.id}`
            );
          }

          const parsed = parseEpisodes(html, season.id);
          return {
            ...season,
            name: parsed.name,
            episodes: parsed.episodes,
          };
        } catch (sfe) {
          return { ...season, error: sfe.toString() };
        }
      })
    );

    const filteredSeasons = seasons.filter((s) => s.episodes.length).map((s) => {
      const { isSelected, ...rest } = s;
      return rest;
    });

    return {
      all_seasons: allSeasons,
      seasons: filteredSeasons.slice(-MAX_SEASONS),
    };
  } catch (error) {
    // Handle the error here
    console.error("Error occurred while fetching series:", error);
    return { all_seasons: [], seasons: [] };
  }
}

export function parseEpisodes(raw, seasonId) {
  const parser = new DomParser();
  const dom = parser.parseFromString(raw);

  const nameElement = dom.getElementById("episode_top");
  const name = entityDecoder(nameElement.textContent.trim(), { level: "html5" });

  const itemNodes = dom.getElementsByClassName("list_item");
  const episodes = Array.from(itemNodes).map((node, index) => {
    try {
      const imageElement = node.getElementsByTagName("img")[0];
      const image = imageElement?.getAttribute("src") || null;
      const image_large = image?.replace(/[.]_.*_[.]/, ".") || null;

      const noStr = `S${seasonId}, Ep${index + 1}`;

      const publishedDateElement = node.getElementsByClassName("airdate")[0];
      const publishedDate = publishedDateElement?.textContent.trim() || null;

      const titleElement = node.getElementsByTagName("a");
      const title = entityDecoder(
        Array.from(titleElement)
          .find((t) => t.getAttribute("itemprop") === "name")
          ?.textContent.trim() || "",
        { level: "html5" }
      );

      const plotElement = node.getElementsByTagName("div");
      const plot = entityDecoder(
        Array.from(plotElement)
          .find((t) => t.getAttribute("itemprop") === "description")
          ?.textContent.trim() || "",
        { level: "html5" }
      );

      const starElement = node.getElementsByClassName("ipl-rating-star__rating")[0];
      const star = parseFloat(starElement?.textContent.trim() || "0");

      const countElement = node.getElementsByClassName("ipl-rating-star__total-votes")[0];
      const count = parseInt((countElement?.textContent.trim() || "0").replace(/[(]|[)]|,|[.]/g, ""), 10);

      if (image?.includes(`spinning-progress.gif`) && plot.includes("Know what this is about")) {
        return null;
      }

      return {
        idx: index + 1,
        no: noStr,
        title,
        image,
        image_large,
        plot,
        publishedDate,
        rating: {
          count,
          star,
        },
      };
    } catch (ss) {
      console.log(ss.message);
      return null;
    }
  });

  return {
    name,
    episodes: episodes.filter((ep) => ep !== null),
  };
}
