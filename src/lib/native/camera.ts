import { Capacitor } from "@capacitor/core";

export async function captureNativePhoto(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
    quality: 88,
    correctOrientation: true,
    allowEditing: false,
    saveToGallery: false,
  });
  if (!photo.webPath) return null;
  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const extension = photo.format === "png" ? "png" : "jpeg";
  return new File([blob], `field-photo-${Date.now()}.${extension}`, {
    type: blob.type || `image/${extension}`,
  });
}
