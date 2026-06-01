import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { StoreProvider } from "./providers";
import SiteChrome from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "VissionLink",
  description: "Premium rental marketplace for film, TV, and entertainment production equipment.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <SiteChrome>{children}</SiteChrome>
        </StoreProvider>
      </body>
    </html>
  );
}
