export type SourceGraphClientOptions = {
    url: string;
    token: string;
    init?: RequestInit;
};

export type SearchResult = {
    type: 'content' | 'path' | 'repo';
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

export type SearchEvent = {
    event: string;
    data: unknown;
};

function processChunk(chunk: string): SearchEvent {
    // event line and data line
    const [ev, dt] = chunk.split('\n');

    if (!ev.startsWith('event:')) {
        throw new Error('unable to process chunk, missing event line');
    }
    if (!dt.startsWith('data:')) {
        throw new Error('unable to process chunk, missing data line');
    }

    const event = ev.replace('event:', '').trim();
    const data = dt.replace('data:', '').trim();

    return {
        event,
        data: JSON.parse(data),
    };
}

export function createSourceGraphClient(options: SourceGraphClientOptions) {

    const headers = new Headers(options?.init?.headers || []);
    headers.set('Accept', 'text/event-stream');
    headers.set('Authorization', `token ${options.token}`);

    return async function* search(query: string): AsyncGenerator<SearchEvent> {
        const init = options.init ?? {};
        init.headers = headers;

        const res = await fetch(`${options.url}?q=${encodeURIComponent(query)}`, init);

        if (!res.ok) {
            throw Error(`Unable to fetch from Sourcegraph: ${res.status} ${res.statusText}`);
        }

        if (!res.body) {
            throw Error('Missing body in Sourcegraph response');
        }

        const decoder = new TextDecoder();
        let raw = '';

        for await (const chunk of res.body) {
            raw += decoder.decode(chunk);
            // console.log(decoder.decode(chunk));


            // console.log('\n--- chunk ---\n');
            //
            // // each message is separated by double newlines
            while (raw.includes('\n\n')) {
                const index = (raw.indexOf('\n\n') + 2) as number; // position after the double newlines
                const part = raw.slice(0, index).trim() as string;
                raw = raw.slice(index); // .trim();

                if (!part) {
                    continue; // skip empty events
                }

                // console.log(part);
                // console.log('\n--- end chunk ---\n');

                yield processChunk(part);
            }
        }

        // we have leftover data without double newlines
        // if (raw.includes('event:') && raw.includes('\ndata:')) {
        //     yield processChunk(raw);
        // }
    }
}