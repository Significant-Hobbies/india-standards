import assert from "node:assert/strict";
import test from "node:test";
import { handleAgentEdge } from "../agent-edge.mjs";

const ORIGINS = [
  "https://india-standards.significanthobbies.com",
  "https://india-numbers.significanthobbies.com",
];

async function request(origin, path, headers) {
  const response = handleAgentEdge(new Request(`${origin}${path}`, { headers }));
  assert.ok(response, `expected agent response for ${path}`);
  assert.equal(response.status, 200);
  return response;
}

for (const origin of ORIGINS) {
  test(`keeps every public agent surface on ${origin}`, async () => {
    const llms = await request(origin, "/llms.txt");
    assert.match(llms.headers.get("content-type") ?? "", /text\/plain/);
    assert.match(await llms.text(), new RegExp(`${origin}/api/ai`));

    const llmsFull = await request(origin, "/llms-full.txt");
    assert.match(await llmsFull.text(), new RegExp(`${origin}/sitemap\\.xml`));

    const index = await request(origin, "/index.md");
    assert.match(index.headers.get("content-type") ?? "", /text\/markdown/);
    assert.match(await index.text(), new RegExp(`${origin}/index\\.md`));

    const negotiated = await request(origin, "/", { accept: "text/markdown" });
    assert.match(negotiated.headers.get("content-type") ?? "", /text\/markdown/);

    const catalog = await request(origin, "/api/ai").then((response) => response.json());
    assert.equal(catalog.url, origin);
    assert.equal(catalog.sitemap, `${origin}/sitemap.xml`);
    assert.equal(catalog.robots, `${origin}/robots.txt`);
    assert.deepEqual(
      catalog.surfaces.map((surface) => surface.url),
      [`${origin}/`, `${origin}/changelog`],
    );

    const sitemap = await request(origin, "/sitemap.xml");
    assert.match(sitemap.headers.get("content-type") ?? "", /application\/xml/);
    assert.match(await sitemap.text(), new RegExp(`${origin}/changelog`));

    const robots = await request(origin, "/robots.txt");
    assert.match(await robots.text(), new RegExp(`Sitemap: ${origin}/sitemap\\.xml`));
  });
}
