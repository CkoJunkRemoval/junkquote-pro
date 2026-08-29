import type { MetadataRoute } from "next";
const paths = ["", "/pricing", "/features", "/customers", "/about"];
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://junkquotepro.com"; return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() })); }
