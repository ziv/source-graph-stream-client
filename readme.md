# SourceGraph Search Streaming Client

## Usage

Install the package:

```shell
npm i source-graph-stream-client
```

Create a client with your SourceGraph instance URL and access token:

```ts
import { SourceGraphClient } from "source-graph-stream-client";

const client = new SourceGraphClient({
  url: "https://example.sourcegraph.com/.api/search/stream",
  token: "your-access-token",
});
```

Stream search results using for-await-of:

```ts
for await (const result of client.search("your search query")) {
  console.log(result);
}
```
