export function splitFileName(fileName) {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot) };
}


export function qualityLabelFromSize(size) {
  const value = Number(size);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1080) return "1080";
  if (value >= 720) return "720";
  if (value >= 480) return "480";
  if (value >= 360) return "360";
  return String(value);
}

export function withQualitySuffix(fileName, quality) {
  if (!quality) return fileName;
  const { base, ext } = splitFileName(fileName);
  const suffix = ` (${quality})`;
  return base.toLowerCase().endsWith(suffix.toLowerCase())
    ? fileName
    : `${base}${suffix}${ext}`;
}

export function uniqueDriveFileName(requestedName, existingNames) {
  const taken = new Set(existingNames);
  if (!taken.has(requestedName)) return requestedName;
  const { base, ext } = splitFileName(requestedName);
  let number = 2;
  while (taken.has(`${base} (${number})${ext}`)) number += 1;
  return `${base} (${number})${ext}`;
}
