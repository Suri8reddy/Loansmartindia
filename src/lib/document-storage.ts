import { supabase } from "@/integrations/supabase/client";

const DOCUMENT_BUCKET = "loan-documents";
const URL_MARKERS = [
  `/storage/v1/object/public/${DOCUMENT_BUCKET}/`,
  `/storage/v1/object/sign/${DOCUMENT_BUCKET}/`,
  `/storage/v1/object/authenticated/${DOCUMENT_BUCKET}/`,
];

export function getDocumentObjectPath(reference: string) {
  const cleanReference = reference.trim();
  if (!cleanReference) throw new Error("Document location is missing");

  for (const marker of URL_MARKERS) {
    const markerIndex = cleanReference.indexOf(marker);
    if (markerIndex >= 0) {
      const encodedPath = cleanReference.slice(markerIndex + marker.length).split("?")[0];
      return decodeURIComponent(encodedPath);
    }
  }

  return decodeURIComponent(cleanReference.replace(/^\/+/, "").split("?")[0]);
}

export async function createDocumentAccessUrl(reference: string, downloadName?: string) {
  const path = getDocumentObjectPath(reference);
  const options = downloadName ? { download: downloadName } : undefined;
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(path, 60 * 60, options);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to open this document");
  }

  return data.signedUrl;
}

export async function downloadDocument(reference: string, name: string) {
  const signedUrl = await createDocumentAccessUrl(reference, name);
  const link = document.createElement("a");
  link.href = signedUrl;
  link.download = name;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}