/**
 * Portable agent-edge handler — copy or generate into each product.
 * Spec: foundry/ops/docs/agent-indexing-standard.md
 *
 * Usage in worker.mjs (before openNext.fetch):
 *   import { handleAgentEdge } from './agent-edge.mjs'
 *   const agent = handleAgentEdge(request)
 *   if (agent) return agent
 */

/** @type {{ name: string, url: string, llmsTxt: string, llmsFullTxt?: string, indexMd: string, catalog: object }} */
// biome-ignore format: generated payload from apply-agent-surfaces (JSON keys/quotes)
export const AGENT_SURFACE = {
  "name": "India Standards",
  "url": "https://india-numbers.significanthobbies.com",
  "llmsFullTxt": "# India Standards — full agent brief\n\nEvidence-bounded demographic standards calculator using aggregate Indian survey data.\n\n## Index\n\n# India Standards\n\nEvidence-bounded demographic standards calculator using aggregate Indian survey data.\n\n## Current data boundary\n\n- PLFS-backed preview with aggregate-only serving tables\n- Explicit central estimate, 95% uncertainty range, and range tightness\n- Height remains unavailable until the NFHS source and usage gates pass\n- The product does not predict dating success, compatibility, or individual outcomes\n\n## Agent entrypoints\n\n- https://india-numbers.significanthobbies.com/llms.txt\n- https://india-numbers.significanthobbies.com/api/ai\n- https://india-numbers.significanthobbies.com/index.md\n\n## Product links\n\n- Home: https://india-numbers.significanthobbies.com/ — Demographic standards calculator\n- Changelog: https://india-numbers.significanthobbies.com/changelog — Verified product releases\n\n## Machine surfaces\n\n- https://india-numbers.significanthobbies.com/llms.txt\n- https://india-numbers.significanthobbies.com/llms-full.txt\n- https://india-numbers.significanthobbies.com/api/ai\n- https://india-numbers.significanthobbies.com/index.md\n- https://india-numbers.significanthobbies.com/sitemap.xml\n- https://india-numbers.significanthobbies.com/robots.txt\n\n## Contact\n\n- Owner: https://sarthakagrawal.dev\n- Agent email for directory verification: sarthakagrawal@agentmail.to\n",
  "llmsTxt": "# India Standards\n\n> Evidence-bounded demographic standards calculator using aggregate Indian survey data.\n\n## Product\n\n- [Home](https://india-numbers.significanthobbies.com/): Demographic standards calculator\n- [Changelog](https://india-numbers.significanthobbies.com/changelog): Verified product releases\n\n## Machine surfaces\n\n- [Agent catalog](https://india-numbers.significanthobbies.com/api/ai): JSON inventory of public surfaces\n- [Homepage markdown](https://india-numbers.significanthobbies.com/index.md): Product brief without JS\n- [This index](https://india-numbers.significanthobbies.com/llms.txt)\n",
  "indexMd": "# India Standards\n\nEvidence-bounded demographic standards calculator using aggregate Indian survey data.\n\n## Current data boundary\n\n- PLFS-backed preview with aggregate-only serving tables\n- Explicit central estimate, 95% uncertainty range, and range tightness\n- Height remains unavailable until the NFHS source and usage gates pass\n- The product does not predict dating success, compatibility, or individual outcomes\n\n## Agent entrypoints\n\n- https://india-numbers.significanthobbies.com/llms.txt\n- https://india-numbers.significanthobbies.com/api/ai\n- https://india-numbers.significanthobbies.com/index.md\n",
  "catalog": {
    "name": "India Standards",
    "version": "1",
    "url": "https://india-numbers.significanthobbies.com",
    "llms": "https://india-numbers.significanthobbies.com/llms.txt",
    "llmsFull": "https://india-numbers.significanthobbies.com/llms-full.txt",
    "sitemap": "https://india-numbers.significanthobbies.com/sitemap.xml",
    "robots": "https://india-numbers.significanthobbies.com/robots.txt",
    "markdown": {
      "suffix": ".md",
      "negotiation": true
    },
    "surfaces": [
      {
        "id": "home",
        "url": "https://india-numbers.significanthobbies.com/",
        "md": "https://india-numbers.significanthobbies.com/index.md",
        "kind": "static",
        "description": "Product home"
      },
      {
        "id": "changelog",
        "url": "https://india-numbers.significanthobbies.com/changelog",
        "md": "https://india-numbers.significanthobbies.com/changelog.md",
        "kind": "static",
        "description": "Verified product releases"
      }
    ],
    "auth": {
      "public": true,
      "notes": "Auth-walled app routes are not agent-indexed unless listed here."
    }
  }
};

/**
 * @param {Request} request
 * @returns {Response | null}
 */
export function handleAgentEdge(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = url.pathname === '' ? '/' : url.pathname;

  if (path === '/llms.txt') {
    return text(forOrigin(AGENT_SURFACE.llmsTxt, url.origin), 'text/plain; charset=utf-8');
  }
  if (path === '/llms-full.txt' && AGENT_SURFACE.llmsFullTxt) {
    return text(forOrigin(AGENT_SURFACE.llmsFullTxt, url.origin), 'text/plain; charset=utf-8');
  }
  if (path === '/index.md') {
    return text(forOrigin(AGENT_SURFACE.indexMd, url.origin), 'text/markdown; charset=utf-8');
  }
  if (path === '/sitemap.xml') {
    return text(sitemapForCatalog(catalogForOrigin(url.origin)), 'application/xml; charset=utf-8');
  }
  if (path === '/robots.txt') {
    return text(robotsForOrigin(url.origin), 'text/plain; charset=utf-8');
  }
  if (path === '/api/ai') {
    return json(catalogForOrigin(url.origin));
  }

  // Homepage markdown negotiation
  if ((path === '/' || path === '') && wantsMarkdown(request)) {
    return text(forOrigin(AGENT_SURFACE.indexMd, url.origin), 'text/markdown; charset=utf-8', {
      Link: '</index.md>; rel="alternate"; type="text/markdown"',
      Vary: 'Accept',
    });
  }

  return null;
}

function catalogForOrigin(origin) {
  return {
    ...AGENT_SURFACE.catalog,
    url: origin,
    llms: `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
    sitemap: `${origin}/sitemap.xml`,
    robots: `${origin}/robots.txt`,
    surfaces: (AGENT_SURFACE.catalog.surfaces || []).map((surface) => ({
      ...surface,
      url: forOrigin(surface.url, origin),
      md: forOrigin(surface.md, origin),
    })),
  };
}

function forOrigin(value, origin) {
  return String(value).split(AGENT_SURFACE.url).join(origin);
}

function sitemapForCatalog(catalog) {
  const routes = catalog.surfaces
    .map((surface) => `  <url><loc>${escapeXml(surface.url)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes}\n</urlset>\n`;
}

function robotsForOrigin(origin) {
  return `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
# Agent indexing
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /index.md
Allow: /api/ai
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wantsMarkdown(request) {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function text(body, type, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300',
      ...extra,
    },
  });
}

function json(data) {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
