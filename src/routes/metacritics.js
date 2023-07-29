import { Hono } from "hono";
import DomParser from "dom-parser";
import { decode as entityDecoder } from "html-entities";
import apiRequestRawHtml from "../helpers/apiRequestRawHtml";

const metacritics = new Hono();

metacritics.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = {
        id: id,
        score: -1,
        reviews: [],
    };

    try {
        const parser = new DomParser();
        const rawHtml = await apiRequestRawHtml(`https://www.imdb.com/title/${id}/criticreviews`);
        const dom = parser.parseFromString(rawHtml);

        const nextData = JSON.parse(dom.getElementById("__NEXT_DATA__")?.innerHTML);

        if (nextData) {
            const allData = nextData.props.pageProps.contentData;
            response.score = allData?.score ?? response.score;
            response.reviews = allData?.section?.items?.map((e) => ({
                score: e.score,
                reviewer: e.reviewer,
                site: e.site,
                url: e.url,
                quote: e.quote,
            })) ?? response.reviews;
        }

        return c.json(response);
    } catch (error) {
        c.status(500);
        return c.json({
            message: error.message,
        });
    }
});

export default metacritics;

function getNode(dom, tag, id) {
    return dom.getElementsByTagName(tag).find((e) => e.attributes.find((e) => e.value === id));
}
