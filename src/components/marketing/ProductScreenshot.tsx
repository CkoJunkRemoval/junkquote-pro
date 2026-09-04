import Image from "next/image";
import type { ProductScreenshot as ProductScreenshotData } from "@/lib/marketing/productScreenshots";

export default function ProductScreenshot({ image, caption }: { image: ProductScreenshotData; caption: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-[#a4ef29]/25 bg-[#0d130e] shadow-2xl shadow-black/30">
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(min-width: 1280px) 1216px, calc(100vw - 40px)"
        className="h-auto w-full"
      />
      <figcaption className="border-t border-white/10 px-5 py-4 text-sm font-semibold text-slate-300">{caption}</figcaption>
    </figure>
  );
}
