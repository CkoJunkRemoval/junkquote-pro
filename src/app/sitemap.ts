import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/marketing/metadata";
const paths = ["", "/features", "/compare", "/about", "/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"];
export default function sitemap(): MetadataRoute.Sitemap { const base = siteUrl.toString().replace(/\/$/, ""); return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() })); }
