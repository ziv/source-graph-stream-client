# SourceGraph Search Streaming Client

## Usage

Install the package:

```shell
npm i source-graph-stream-client
```

Create a client with your SourceGraph instance URL and access token:

```ts
import {createSourceGraphClient} from 'source-graph-stream-client';

const search = createSourceGraphClient({
    url: 'https://example.sourcegraphcloud.com/.api/search/stream',
    token: 'your-access-token',
});

```

Stream search results using for-await-of:

```ts


for await (const event of search('your search query')) {
    if (event.event === 'done') {
        console.log('Search complete');
        break;
    }
    console.log(event);
}
```