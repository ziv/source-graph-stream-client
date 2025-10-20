import { SourceGraphClient } from "./source-graph-client.js";

const token = process.env.SOURCEGRAPH_API_KEY as string;
const url = process.env.SOURCEGRAPH_API_URL as string;

const client = new SourceGraphClient({
  url,
  token,
});

for await (const ev of client.search("perry")) {
  console.log(
    ev.event,
    ev.data,
    "\n---\n",
  );
}
