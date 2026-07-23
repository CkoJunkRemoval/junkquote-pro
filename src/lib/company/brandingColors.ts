export function readableBrandForeground(value: string | null | undefined) {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return "#ffffff";
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(value.slice(start, start + 2), 16),
  );
  const linear = (channel: number) => {
    const ratio = channel / 255;
    return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;
  return whiteContrast >= darkContrast ? "#ffffff" : "#0f172a";
}
