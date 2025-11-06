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
          start(controller) {
            controller.enqueue(new TextEncoder().encode(data));
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
