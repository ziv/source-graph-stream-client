import test from "node:test";
import assert from "node:assert/strict";
import { SourceGraphClient } from "./source-graph-client.js";

// backup original fetch for restoration later
const originalFetch = globalThis.fetch;

function mockFetchWithStream(data: string) {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          async start(controller) {
            while (data.length > 0) {
              const next = data.slice(0, 10);
              data = data.slice(10);

              if (!next) {
                continue;
              }

              controller.enqueue(new TextEncoder().encode(next));
              await new Promise((resolve) => setTimeout(resolve, 1));
            }

            controller.close();
          },
        }),
      ),
    );
}

function restoreOriginalFetch() {
  globalThis.fetch = originalFetch;
}

test("should not yield empty messages", async () => {
  mockFetchWithStream(`

event: ping

event: custom

no: data

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const items = [];
  for await (const item of client.search("test")) {
    items.push(item);
  }

  assert.equal(items.length, 0);

  restoreOriginalFetch();
});

test("should yield matches messages only", async () => {
  mockFetchWithStream(`

event: matches
data: [{}, {}]

event: custom

data: [{}, {}, {}]

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const items = [];
  for await (const item of client.search("test")) {
    items.push(item);
  }

  assert.equal(items.length, 2);

  restoreOriginalFetch();
});

// Authentication tests
test("should set Authorization header with access token", () => {
  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "my-access-token",
  });

  assert.equal(client.headers.get("Authorization"), "token my-access-token");
  assert.equal(client.headers.get("Accept"), "text/event-stream");
});

test("should set Authorization header with OAuth token", () => {
  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    oauthToken: "my-oauth-token",
  });

  assert.equal(client.headers.get("Authorization"), "Bearer my-oauth-token");
  assert.equal(client.headers.get("Accept"), "text/event-stream");
});

test("should throw error when neither accessToken nor oauthToken is provided", () => {
  assert.throws(
    () => {
      new SourceGraphClient({
        url: "https://example.sourcegraph.com/.api/search/stream",
      });
    },
    {
      message: "Either accessToken or oauthToken must be provided",
    },
  );
});

// Error handling tests
test("should skip invalid JSON by default", async () => {
  mockFetchWithStream(`
event: matches
data: invalid json

event: matches
data: [{"type": "content"}]

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const items = [];
  for await (const item of client.search("test")) {
    items.push(item);
  }

  assert.equal(items.length, 1);
  assert.equal(items[0].type, "content");

  restoreOriginalFetch();
});

test("should throw error on invalid JSON when throwOnError is true", async () => {
  mockFetchWithStream(`
event: matches
data: invalid json

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
    throwOnError: true,
  });

  await assert.rejects(
    async () => {
      for await (const item of client.search("test")) {
        // Should not reach here
      }
    },
    {
      message: "Error parsing Sourcegraph search result",
    },
  );

  restoreOriginalFetch();
});

test("should skip non-array matches data", async () => {
  mockFetchWithStream(`
event: matches
data: {"not": "an array"}

event: matches
data: [{"type": "repo"}]

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const items = [];
  for await (const item of client.search("test")) {
    items.push(item);
  }

  assert.equal(items.length, 1);
  assert.equal(items[0].type, "repo");

  restoreOriginalFetch();
});

test("should throw error on HTTP error response", async () => {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(null, {
        status: 404,
        statusText: "Not Found",
      }),
    );

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  await assert.rejects(
    async () => {
      for await (const item of client.search("test")) {
        // Should not reach here
      }
    },
    {
      message: "Unable to fetch from Sourcegraph: 404 Not Found",
    },
  );

  restoreOriginalFetch();
});

test("should throw error when response body is missing", async () => {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(null, {
        status: 200,
      }),
    );

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  await assert.rejects(
    async () => {
      for await (const item of client.search("test")) {
        // Should not reach here
      }
    },
    {
      message: "Missing body in Sourcegraph response",
    },
  );

  restoreOriginalFetch();
});

// raw() method tests
test("raw() should yield all event types", async () => {
  mockFetchWithStream(`
event: progress
data: {"done": 10}

event: matches
data: [{"type": "content"}]

event: done
data: {"complete": true}

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const events = [];
  for await (const event of client.raw("test")) {
    events.push(event);
  }

  assert.equal(events.length, 3);
  assert.equal(events[0].event, "progress");
  assert.equal(events[1].event, "matches");
  assert.equal(events[2].event, "done");

  restoreOriginalFetch();
});

test("raw() should parse JSON data automatically", async () => {
  mockFetchWithStream(`
event: progress
data: {"done": 10, "total": 100}

event: matches
data: [{"type": "content"}]

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const events = [];
  for await (const event of client.raw("test")) {
    events.push(event);
  }

  assert.equal(events.length, 2);
  assert.deepEqual(events[0].data, { done: 10, total: 100 });
  assert.deepEqual(events[1].data, [{ type: "content" }]);

  restoreOriginalFetch();
});

test("raw() should keep unparseable data as string", async () => {
  mockFetchWithStream(`
event: custom
data: not valid json

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const events = [];
  for await (const event of client.raw("test")) {
    events.push(event);
  }

  assert.equal(events.length, 1);
  assert.equal(events[0].data, "not valid json");

  restoreOriginalFetch();
});

// Search options tests
test("should build URL with search options", async () => {
  let capturedUrl = "";

  globalThis.fetch = (input: RequestInfo | URL) => {
    capturedUrl = input.toString();
    return Promise.resolve(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(""));
            controller.close();
          },
        }),
      ),
    );
  };

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const results = [];
  for await (
    const result of client.search("test query", {
      version: "V3",
      patternType: "regexp",
      displayLimit: 50,
      maxLineLength: 200,
      enableChunkMatches: true,
      contextLines: 3,
    })
  ) {
    results.push(result);
  }

  const url = new URL(capturedUrl);
  assert.equal(url.searchParams.get("q"), "test query");
  assert.equal(url.searchParams.get("v"), "V3");
  assert.equal(url.searchParams.get("t"), "regexp");
  assert.equal(url.searchParams.get("display"), "50");
  assert.equal(url.searchParams.get("max-line-len"), "200");
  assert.equal(url.searchParams.get("cm"), "true");
  assert.equal(url.searchParams.get("cl"), "3");

  restoreOriginalFetch();
});

test("should not include contextLines without enableChunkMatches", async () => {
  let capturedUrl = "";

  globalThis.fetch = (input: RequestInfo | URL) => {
    capturedUrl = input.toString();
    return Promise.resolve(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(""));
            controller.close();
          },
        }),
      ),
    );
  };

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const results = [];
  for await (
    const result of client.search("test query", {
      contextLines: 5,
      // enableChunkMatches is false/undefined
    })
  ) {
    results.push(result);
  }

  const url = new URL(capturedUrl);
  assert.equal(url.searchParams.get("cl"), null);

  restoreOriginalFetch();
});

// Edge case tests
test("should handle multiple results in single matches event", async () => {
  mockFetchWithStream(`
event: matches
data: [{"type": "content", "path": "file1.ts"}, {"type": "path", "path": "file2.ts"}, {"type": "repo", "path": "repo1"}]

`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const items = [];
  for await (const item of client.search("test")) {
    items.push(item);
  }

  assert.equal(items.length, 3);
  assert.equal(items[0].type, "content");
  assert.equal(items[0].path, "file1.ts");
  assert.equal(items[1].type, "path");
  assert.equal(items[1].path, "file2.ts");
  assert.equal(items[2].type, "repo");
  assert.equal(items[2].path, "repo1");

  restoreOriginalFetch();
});

test("should handle empty matches array", async () => {
  mockFetchWithStream(`
event: matches
data: []
`);

  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
  });

  const items = [];
  for await (const item of client.search("test")) {
    items.push(item);
  }

  assert.equal(items.length, 0);

  restoreOriginalFetch();
});

test("should handle custom headers in init options", () => {
  const client = new SourceGraphClient({
    url: "https://example.sourcegraph.com/.api/search/stream",
    accessToken: "test",
    init: {
      headers: {
        "X-Custom-Header": "custom-value",
      },
    },
  });

  assert.equal(client.headers.get("X-Custom-Header"), "custom-value");
  assert.equal(client.headers.get("Authorization"), "token test");
  assert.equal(client.headers.get("Accept"), "text/event-stream");
});
