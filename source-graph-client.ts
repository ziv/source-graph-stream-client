import {SseStreamTransform} from "sse-stream-transform";

/**
 * Options for configuring the SourceGraphClient.
 * @see https://sourcegraph.com/docs/api/stream_api
 */
export type SourceGraphClientOptions = {
    /**
     * Sourcegraph access token or OAuth token with user:all scope.
     * See GraphQL API authentication for details on token refresh and expiration handling.
     *
     * @see https://sourcegraph.com/docs/cli/how-tos/creating_an_access_token
     * @see https://sourcegraph.com/docs/admin/oauth_apps
     * @see https://sourcegraph.com/docs/api/graphql#quickstart
     */
    accessToken?: string;
    oauthToken?: string;

    /**
     * The URL of your Sourcegraph instance, or https://sourcegraph.com.
     * @example "https://example.sourcegraph,com/.api/search/stream"
     */
    url: string;

    /**
     * If true, will throw an if the parsing of a chunk fails.
     */
    throwOnError?: boolean;

    /**
     * Optional fetch request initialization options.
     */
    init?: RequestInit;
};

/**
 * Options for configuring the search query.
 * @see https://sourcegraph.com/docs/api/stream_api
 */
export type SearchOptions = {
    /**
     * The version of the search query syntax. We recommend to explicitly set the version. The latest version is "V3".
     * @default "V3"
     */
    version?: string;

    /**
     * Either "keyword", "standard", or "regexp". This pattern type is only used if the query doesn't already
     * contain a patternType: filter.
     * @default "standard"
     */
    patternType?: "keyword" | "standard" | "regexp";

    /**
     * If set, will truncate the context field of ChunkMatch such that no line is longer than max-line-len.
     * @default -1 (no limit)
     */
    maxLineLength?: number;

    /**
     * Enables chunk matches. Must be parseable as boolean.
     * @default false
     */
    enableChunkMatches?: boolean;

    /**
     * The maximum number of matches the backend returns. If the backend finds more than display-limit results, it will
     * keep searching and aggregating statistics, but the matches will not be returned anymore. Note that the
     * display-limit is different from the query filter count: which causes the search to stop and return once we
     * found count: matches.
     * @default -1 (no limit)
     */
    displayLimit?: number;

    /**
     * The number of lines around a match that should be returned. Works only in conjunction with cm=true. Must be
     * parseable as boolean.
     * @default 1
     */
    contextLines?: number;
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
        if (options.accessToken) {
            this.headers.set("Authorization", `token ${options.accessToken}`);
        } else if (options.oauthToken) {
            this.headers.set("Authorization", `Bearer ${options.oauthToken}`);
        } else {
            throw new Error("Either accessToken or oauthToken must be provided");
        }
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
     * @param options
     */
    async* search(
        query: string,
        options: SearchOptions = {},
    ): AsyncGenerator<SearchResult> {
        const init = this.options.init ?? {};
        init.headers = this.headers;

        const params = new URLSearchParams();
        params.append("q", query);

        if (options.version) {
            params.append("v", options.version);
        }

        if (options.patternType) {
            params.append("t", options.patternType);
        }

        if (options.maxLineLength) {
            params.append("max-line-len", options.maxLineLength.toString());
        }

        if (options.enableChunkMatches) {
            params.append("cm", options.enableChunkMatches.toString());
        }

        if (options.displayLimit) {
            params.append("display", options.displayLimit.toString());
        }

        if (options.contextLines && options.enableChunkMatches) {
            params.append("cl", options.contextLines.toString());
        }

        console.error(`${this.options.url}?${params.toString()}`);
        const res: Response = await fetch(
            `${this.options.url}?${params.toString()}`,
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

        for await (const msg of res.body.pipeThrough(new SseStreamTransform())) {
            if (msg.event !== "matches") {
                continue;
            }

            try {
                const results = JSON.parse(msg.data) as SearchResult[];
                yield* results;
            } catch (err) {
                this.handleError(
                    `Error parsing Sourcegraph search result: ${err}`,
                );
            }
        }
    }

    private handleError(error: string): void {
        if (this.options.throwOnError) {
            throw new Error(error);
        }
        // todo should we yield an error event instead?
        console.error(error);
    }
}
