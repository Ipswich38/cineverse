import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // pdfkit loads its standard-font metrics (.afm) — and fontkit its shaping
  // tables (.trie/.json) — at runtime via dynamic fs reads the bundler can't
  // follow. Without this they're missing from the deployed function and every
  // PDF render (quotation/contract/invoice preview + send) throws → 500.
  outputFileTracingIncludes: {
    "/api/admin/**": [
      "./node_modules/pdfkit/js/data/**/*",
      "./node_modules/fontkit/**/*.trie",
      "./node_modules/fontkit/**/*.json",
    ],
  },
  // The standalone /packages listing was retired — packages now live on the BMR
  // provider storefront. Redirect old links (including ?item= deep-links) there.
  async redirects() {
    return [{ source: "/packages", destination: "/providers", permanent: false }];
  },
};

export default nextConfig;
