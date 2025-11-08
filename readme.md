# SourceGraph Search Streaming Client

A streaming client for SourceGraph search results.

Implements a client for streaming search results from a SourceGraph instance,
async generators for the search results, and support for authentication via
access tokens or OAuth tokens.

Battle-tested in production environments.

[![auto-release](https://github.com/ziv/source-graph-stream-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ziv/source-graph-stream-client/actions/workflows/ci.yml)

## Usage

Install the package:

```shell
npm i source-graph-stream-client
```

### Creating a client

Create a client with your SourceGraph instance URL and access token:

```ts
import { SourceGraphClient } from "source-graph-stream-client";

const client = new SourceGraphClient({
  url: "https://example.sourcegraph.com/.api/search/stream",
  accessToken: "your-access-token",
});
```

#### Client Options

The minimal required options are `url` and either `accessToken` or `oauthToken`.

| Option         | Type          | Description                                                            | Default      |
| -------------- | ------------- | ---------------------------------------------------------------------- | ------------ |
| `url`          | `string`      | The SourceGraph instance search stream endpoint.                       | **required** |
| `accessToken`  | `string`      | The access token for authentication. Can not use with `oauthToken`     | `undefined`  |
| `oauthToken`   | `string`      | The OAuth token for authentication. Can not use with `accessToken`     | `undefined`  |
| `throwOnError` | `boolean`     | Whether to throw an error for fail to parse a message or just skip it. | `false`      |
| `init`         | `RequestInit` | Additional fetch options to use when making requests.                  | `undefined`  |

---

### Streaming search results

Stream search results using for-await-of:

```ts
for await (const result of client.search("your search query")) {
  console.log(result);
}
```

### Using search options

```ts
for await (const results of client.search("query", { displayLimit: 10 })) {
  console.log(results);
}
```

See the [SearchOptions](./source-graph-client.ts) type for all available search
options.

### Streaming all SourceGraph search events

You can also stream all SourceGraph events (not just search results) using the
`raw` method:

```ts
for await (const event of client.raw("your search query")) {
  console.log(event);
}
```
