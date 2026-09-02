import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/marketing/metadata";
const paths = ["", "/features", "/pricing", "/about"];
export default function sitemap(): MetadataRoute.Sitemap { const base = siteUrl.toString().replace(/\/$/, ""); return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() })); }
