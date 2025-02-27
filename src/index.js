import { Hono } from "hono";
import { cors } from "hono/cors";
import index from "./routes/index";
import awards from "./routes/awards";
import reviews from "./routes/reviews";
import metacritics from "./routes/metacritics";
import title from "./routes/title";
import cache from "./helpers/cache";
import search from "./routes/search";
import userRoutes from "./routes/user";

const app = new Hono();

app.use("*", cors());
app.use("*", cache);
app.route("/awards", awards);
app.route("/metacritics", metacritics);
app.route("/search", search);
app.route("/title", title);
app.route("/reviews", reviews);
app.route("/user", userRoutes);

app.route("/", index);

app.fire();
