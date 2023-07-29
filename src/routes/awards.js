import { Hono } from "hono";
import DomParser from "dom-parser";
import { decode as entityDecoder } from "html-entities";
import apiRequestRawHtml from "../helpers/apiRequestRawHtml";

const awards = new Hono();

awards.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = {
        id: id,
        nominations: -1,
        wins: -1,
        awards: [],
    };

    try {
        const parser = new DomParser();
        const rawHtml = await apiRequestRawHtml(`https://www.imdb.com/title/${id}/awards`);
        const dom = parser.parseFromString(rawHtml);

        const nextData = JSON.parse(dom.getElementById("__NEXT_DATA__")?.innerHTML);
        const allData = nextData?.props?.pageProps?.contentData;

        if (allData) {
            response.nominations = allData.nominationsCount ?? response.nominations;
            response.wins = allData.winsCount ?? response.wins;
            response.awards = allData.categories?.map((e) => ({
                event: e.name,
                href: e.href,
                nominations: e.section.total,
                items: e.section?.items?.map((f) => ({
                    name: f.rowTitle,
                    award: f.rowSubTitle,
                    awardFor: f.listContent[0]?.text ?? "",
                    nominated: f.subListContent?.map((g) => ({
                        name: g.text,
                        href: g.href,
                    })) ?? [],
                })) ?? [],
            })) ?? [];
        }

        return c.json(response);
    } catch (error) {
        c.status(500);
        return c.json({
            message: error.message,
        });
    }
});

export default awards;
