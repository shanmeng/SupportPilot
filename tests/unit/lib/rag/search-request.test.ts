import { describe, expect, it } from "vitest";
import { searchRequestSchema, toKeywordQuery } from "@/lib/rag/search";

describe("searchRequestSchema", () => {
  it("trims the query and defaults the limit to 5", () => {
    expect(searchRequestSchema.parse({ query: "  webhook 410  " })).toEqual({ query: "webhook 410", limit: 5 });
  });

  it.each([
    [{}, "query"],
    [{ query: "a" }, "query"],
    [{ query: "x".repeat(501) }, "query"],
    [{ query: 42 }, "query"],
    [{ query: "webhook", limit: 0 }, "limit"],
    [{ query: "webhook", limit: 11 }, "limit"],
    [{ query: "webhook", limit: 2.5 }, "limit"],
  ])("rejects %j (field %s)", (input, field) => {
    const result = searchRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });
});

describe("toKeywordQuery", () => {
  it("turns a question into OR-ed keywords for websearch_to_tsquery", () => {
    expect(toKeywordQuery("What happens after an endpoint returns HTTP 410?")).toBe(
      "what or happens or after or an or endpoint or returns or http or 410",
    );
  });

  it("keeps identifiers such as error codes and document IDs intact", () => {
    expect(toKeywordQuery("FP-ACCESS-403 in KB-FIX-003")).toBe("fp-access-403 or in or kb-fix-003");
  });

  it("strips operators and quotes so user input cannot change the query syntax", () => {
    expect(toKeywordQuery('"webhook" -retry or OR (gone)')).toBe("webhook or retry or gone");
  });

  it("returns an empty string when there are no usable words", () => {
    expect(toKeywordQuery("?? !! --")).toBe("");
  });
});
