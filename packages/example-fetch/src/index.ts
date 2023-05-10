import { Dependency, TugBuilder, Tug } from "tug-ts";
import type { Response, RequestInfo, RequestInit } from "node-fetch";
import fetch from "node-fetch";
interface Logger {
    log: (message: string) => void;
}
const Logger = Dependency<Logger>();
const logger: Logger = {
    log: (message: string) => {
        console.log(message);
    },
};

interface Fetcher {
    fetch(
        input: RequestInfo,
        init?: RequestInit | undefined
    ): Tug<Logger, Response>;
}
const Fetcher = Dependency<Fetcher>();
const fetcher: Fetcher = {
    fetch: (input: RequestInfo, init?: RequestInit | undefined) =>
        TugBuilder.depends(Logger).try(async (ctx) => {
            ctx.deps.log(`Fetching ${input}`);
            const response = await fetch(input, init);
            return response;
        }),
};

const fetchJson = (input: RequestInfo, init?: RequestInit | undefined) =>
    TugBuilder.depends(Fetcher)
        .ofDeps()
        .flatMap(({ deps }) => deps.fetch(input, init))
        .try((it) => it.json());

const app = async () => {
    const response = await fetchJson(
        "https://jsonplaceholder.typicode.com/todos/1"
    )
        .provide(Logger, logger)
        .provide(Fetcher, fetcher)
        .exec.orThrow();
    return response;
};

app().then(console.log);
