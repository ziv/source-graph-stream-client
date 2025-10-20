import { createSourceGraphClient } from "./source-graph-client.js";

const token = process.env.SOURCEGRAPH_API_KEY as string;
const url = process.env.SOURCEGRAPH_API_URL as string;

const search = createSourceGraphClient({
  url,
  token,
});

for await (const ev of search("perry")) {
  console.log(
    ev.event,
    ev.data,
    "\n---\n",
  );
}
