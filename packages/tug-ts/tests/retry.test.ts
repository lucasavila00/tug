import { expect, test } from "@jest/globals";
import {
    capDelay,
    exponentialBackoff,
    limitRetries,
    Monoid,
    defaultRetryStatus,
} from "retry-ts";
import { RetryPolicy } from "../src/retry";

const policy = capDelay(
    2000,
    Monoid.concat(exponentialBackoff(200), limitRetries(5))
);

const policy2 = RetryPolicy.concat(
    RetryPolicy.exponentialBackoff(200),
    RetryPolicy.limitRetries(5)
).capDelay(2000);

test("resolves", async () => {
    const it = policy({ ...defaultRetryStatus, iterNumber: 10 });
    const it2 = policy2.fn({ ...defaultRetryStatus, iterNumber: 10 });
    expect(it).toMatchInlineSnapshot(`
        {
          "_tag": "Some",
          "value": 200,
        }
    `);
    expect(it2).toMatchInlineSnapshot(`
    {
      "_tag": "Some",
      "value": 200,
    }
`);
});
