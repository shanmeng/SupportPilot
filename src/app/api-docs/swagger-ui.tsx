"use client";

import Script from "next/script";

const VERSION = "5.17.14";
const BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}`;

declare global {
  interface Window {
    SwaggerUIBundle?: (options: { url: string; dom_id: string; deepLinking: boolean }) => unknown;
  }
}

/** Swagger UI for /api/v1/openapi.json, loaded from a pinned version with Subresource Integrity. */
export function SwaggerUi() {
  return (
    <>
      <link
        rel="stylesheet"
        href={`${BASE}/swagger-ui.css`}
        integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn"
        crossOrigin="anonymous"
      />
      <Script
        src={`${BASE}/swagger-ui-bundle.js`}
        integrity="sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep"
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onReady={() => {
          window.SwaggerUIBundle?.({ url: "/api/v1/openapi.json", dom_id: "#swagger-ui", deepLinking: true });
        }}
      />
      <div id="swagger-ui" className="bg-white" />
    </>
  );
}
