# SourceGraph Search Streaming Client

A streaming client for SourceGraph search results.

Implements a client for streaming search results from a SourceGraph instance,
provide an async generators for the search results, and support for authentication via
access tokens or OAuth tokens.

See the [Sourcegraph Stream API](https://sourcegraph.com/docs/api/stream_api) for more details.

_Battle-tested in production environments._

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

#### Client Options

The minimal required options are `url` and either `accessToken` or `oauthToken`.

| Option         | Type          | Description                                                            | Default      |
|----------------|---------------|------------------------------------------------------------------------|--------------|
| `url`          | `string`      | The SourceGraph instance search stream endpoint.                       | **required** |
| `accessToken`  | `string`      | The access token for authentication. Can not use with `oauthToken`     | `undefined`  |
| `oauthToken`   | `string`      | The OAuth token for authentication. Can not use with `accessToken`     | `undefined`  |
| `throwOnError` | `boolean`     | Whether to throw an error for fail to parse a message or just skip it. | `false`      |
| `init`         | `RequestInit` | Additional fetch options to use when making requests.                  | `undefined`  |

See [options](./source-graph-client.ts#L9-L36) definition for more details

---

### Streaming search results

Stream search results using for-await-of:

```ts
for await (const result of client.search("your search query")) {
    console.log(result);
}
```

### Streaming search results with search options

```ts
for await (const result of client.search("query", {displayLimit: 10})) {
    console.log(result);
}
```

See the [SearchOptions](./source-graph-client.ts#L42-L83) type for all available search
options.

### Exported Search Result Types

The client exports the following search result types:

- `ContentSearchResult` - represents a result from a file content.
- `RepoSearchResult` - represents a result from a repository name/path.
- `PathSearchResult` - represents a result from a file/directory path.

See the [types](./source-graph-client.ts#L85-L149) definitions for more details.

### Streaming all SourceGraph search events

You can also stream all SourceGraph events (not just search results) using the
`raw` method:

```ts
for await (const event of client.raw("your search query")) {
    console.log(event);
}
```

See the [SourceGraph Event-Types](https://sourcegraph.com/docs/api/stream_api#event-types) for more details.