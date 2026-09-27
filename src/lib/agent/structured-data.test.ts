import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { homeGraph, organization, serializeJsonLd } from "./structured-data";

describe("homeGraph", () => {
  test("carries Organization, WebSite and SoftwareApplication identities", () => {
    const types = homeGraph["@graph"].map((node) => node["@type"]);
    assert.deepEqual(types, ["Organization", "WebSite", "SoftwareApplication"]);
  });

  test("gives the Organization a contact point and no invented address", () => {
    assert.equal(organization.contactPoint[0]?.email, "im.kaiyu@gmail.com");
    assert.equal("address" in organization, false);
    assert.ok(organization.sameAs.length > 0);
  });
});

describe("serializeJsonLd", () => {
  test("escapes < so a value cannot close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>" });
    assert.equal(out.includes("<"), false);
    assert.deepEqual(JSON.parse(out), { name: "</script><script>" });
  });
});
