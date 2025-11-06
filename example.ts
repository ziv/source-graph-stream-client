import { SourceGraphClient } from "./source-graph-client.js";

const accessToken = process.env.SOURCEGRAPH_API_KEY as string;
const url = process.env.SOURCEGRAPH_API_URL as string;

const client = new SourceGraphClient({
  url,
  accessToken,
});

for await (const ev of client.search("@angular/core/testing")) {
  console.log(ev);
}
