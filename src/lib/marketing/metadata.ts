import type { Metadata } from "next";

export const siteUrl = new URL("https://junkquoteprohq.com");

const socialImage = {
  url: "/branding/dashboard-hero.webp",
  width: 1600,
  height: 675,
  alt: "Junk removal crew loading furniture into a truck",
};

export function marketingMetadata(
  path: "/" | "/about" | "/compare" | "/features" | "/pricing" | "/vs-housecall-pro" | "/vs-jobber" | "/vs-junkiq",
  title: string,
  description: string,
): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "JunkQuote Pro",
      url: path,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage.url],
    },
  };
}
