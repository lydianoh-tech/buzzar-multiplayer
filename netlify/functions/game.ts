import { getStore } from "@netlify/blobs";
import { createHandler } from "../lib/gameHandler.ts";

const store = getStore({ name: "bible-buzz-rooms", consistency: "strong" });
export default createHandler(store);
