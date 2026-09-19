export const SECURE_FILE_MARKER = "__SECURE_FILE__:";

export function buildSecureMarker(path: string): string {
  return `${SECURE_FILE_MARKER}${path}`;
}

export function isSecureMarker(output: string): boolean {
  return output.startsWith(SECURE_FILE_MARKER);
}

export function extractSecureMarkerPaths(output: string): string[] {
  const paths: string[] = [];
  const re = /__SECURE_FILE__:(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(output)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}