import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Keep pdfkit/fontkit OUT of the webpack bundle so they run straight from
  // node_modules — pdfkit resolves its font data via __dirname, which only
  // points at the real package dir when it isn't bundled. Without this the data
  // lookup hits a wrong path and every render throws ENOENT (…/Helvetica.afm).
  serverExternalPackages: ["pdfkit", "fontkit"],
  // Belt-and-suspenders: also force the runtime data files (loaded via dynamic
  // fs reads the tracer can't follow) into the /api/admin function bundles.
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
