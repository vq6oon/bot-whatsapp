export function splitFileName(fileName) {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot) };
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
