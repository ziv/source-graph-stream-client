# SourceGraph Search Streaming Client

Implements a client for streaming search results from a SourceGraph instance.

https://sourcegraph.com/docs/api/stream_api

[![auto-release](https://github.com/ziv/source-graph-stream-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ziv/source-graph-stream-client/actions/workflows/ci.yml)

## Usage

Install the package:

```shell
npm i source-graph-stream-client
```

### Creating a client

Create a client with your SourceGraph instance URL and access token:

```ts
import {SourceGraphClient} from "source-graph-stream-client";

const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "your-access-token",
});
```

#### Construction options

| Option         | Type          | Description                                                            | Default      |
|----------------|---------------|------------------------------------------------------------------------|--------------|
| `url`          | `string`      | The SourceGraph instance search stream endpoint.                       | **required** |
| `accessToken`  | `string`      | The access token for authentication. Can not use with `oauthToken`     | `undefined`  |
| `oauthToken`   | `string`      | The OAuth token for authentication. Can not use with `accessToken`     | `undefined`  |
| `throwOnError` | `boolean`     | Whether to throw an error for fail to parse a message or just skip it. | `false`      |
| `init`         | `RequestInit` | Additional fetch options to use when making requests.                  | `undefined`  |

See the [SourceGraphClientOptions](./source-graph-client.ts) type for all available configuration options.

### Streaming search results

Stream search results using for-await-of:

```ts
for await (const result of client.search("your search query")) {
    console.log(result);
}
```

See the [SearchOptions](./source-graph-client.ts) type for all available search options.
