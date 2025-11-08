import { SourceGraphClient } from "./source-graph-client.js";

const accessToken = process.env.SOURCEGRAPH_API_KEY as string;
const url = process.env.SOURCEGRAPH_API_URL as string;

const client = new SourceGraphClient({
  url,
  accessToken,
});

const query = "testing";
const options = { displayLimit: 10 };

for await (const searchResult of client.search(query, options)) {
  console.log("Search result:", searchResult);
}
