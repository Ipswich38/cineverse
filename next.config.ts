import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // The standalone /packages listing was retired — packages now live on the BMR
  // provider storefront. Redirect old links (including ?item= deep-links) there.
  async redirects() {
    return [{ source: "/packages", destination: "/providers", permanent: false }];
  },
};

export default nextConfig;
