import { Capacitor } from "@capacitor/core";

export async function downloadPdf(base64: string, filename: string) {
  if (Capacitor.isNativePlatform()) {
    const [{ Directory, Filesystem }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const saved = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: filename,
      url: saved.uri,
      dialogTitle: "Save or share PDF",
    });
    return;
  }
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
