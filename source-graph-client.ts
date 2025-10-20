/**
 * Options for configuring the SourceGraphClient.
 */
export type SourceGraphClientOptions = {
  /**
   * The base URL of the Sourcegraph instance.
   * @example "https://example.sourcegraph,com/.api/search/stream"
   */
  url: string;

  /**
   * The authentication token for accessing the Sourcegraph API.
   */
  token: string;

  /**
   * Optional fetch request initialization options.
   */
  init?: RequestInit;
};

/**
 * A single search result from Sourcegraph.
 */
export type SearchResult = {
  type: "content" | "path" | "repo";
  path: string;
  repositoryID: number;
  repository: string;
  repoLastFetched: string;
  branches: string[];
  commit: string;
  hunks?: unknown;
  repoStars?: number;
  lineMatches: {
    line: string;
    lineNumber: number;
    offsetAndLengths: [number, number][];
  }[];
  language: string;
  [key: string]: unknown;
};

/**
 * Message separator for SSE.
 */
const SEP = "\n\n";

/**
 * Client for interacting querying Sourcegraph's search streaming API.
 */
export class SourceGraphClient {
  readonly headers: Headers;

  constructor(readonly options: SourceGraphClientOptions) {
    this.headers = new Headers(options?.init?.headers || []);
    this.headers.set("Accept", "text/event-stream");
    this.headers.set("Authorization", `token ${options.token}`);
  }

  /**
   * Search Sourcegraph with the given query.
   * Returns an async generator yielding search results as they are received.
   *
   * @example
   * ```ts
   * const client = new SourceGraphClient({
   *      url: "https://example.sourcegraph.com/.api/search/stream",
   *      token: "your-token
   *  });
   *
   *  for await (const result of client.search("search-term")) {
   *      console.log(result);
   *  }
   *
   * ```
   *
   * @param query
   */
  async *search(query: string): AsyncGenerator<SearchResult> {
    const init = this.options.init ?? {};
    init.headers = this.headers;

    const res = await fetch(
      `${this.options.url}?q=${encodeURIComponent(query)}`,
      init,
    );

    if (!res.ok) {
      throw Error(
        `Unable to fetch from Sourcegraph: ${res.status} ${res.statusText}`,
      );
    }

    if (!res.body) {
      throw Error("Missing body in Sourcegraph response");
    }

    const decoder = new TextDecoder();
    let raw = "";

    for await (const chunk of res.body) {
      raw += decoder.decode(chunk);

      while (raw.includes(SEP)) {
        const index = (raw.indexOf(SEP) + 2) as number; // position after the double newlines
        const part = raw.slice(0, index).trim() as string;
        raw = raw.slice(index); // .trim();

        if (!part) {
          continue; // skip empty events
        }

        const [ev, dt] = chunk.split("\n");

        if (!ev.startsWith("event:")) {
          console.error(`Unable to process chunk, missing event line`);
          continue;
        }

        if (!dt.startsWith("data:")) {
          console.error("unable to process chunk, missing data line");
          continue;
        }

        const event = ev.replace("event:", "").trim();

        if (event === "done") {
          return;
        }

        if (event !== "matches") {
          continue; // skip non-matches events
        }

        const data = dt.replace("data:", "").trim();
        let results: SearchResult[];

        try {
          results = JSON.parse(data) as SearchResult[];
        } catch (error) {
          console.error("unable to parse chunk data as JSON", error);
          continue;
        }

        for (const result of results) {
          yield result;
        }
      }
    }
  }
}
