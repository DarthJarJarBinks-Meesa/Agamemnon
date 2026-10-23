export function usptoPdfUrl(identifier: string | null | undefined) {
  if (!identifier) return null;
  const cleaned = identifier.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = cleaned.match(/^US(\d{7,11})/);
  if (!match) return null;
  return `https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/${match[1]}`;
}

export function priorisPdfPath(identifier: string, demoKey: string) {
  const params = new URLSearchParams({ id: identifier, key: demoKey });
  return `/api/prioris/pdf?${params}`;
}
