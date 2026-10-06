import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type ViewerProps = {
  signedUrl: string;
  extension: string;
  name: string;
};

function LoadingDocument() {
  return <div className="grid h-full min-h-72 place-items-center p-8 text-sm text-muted-foreground">Rendering document…</div>;
}

function ViewerError({ message }: { message: string }) {
  return <div className="grid h-full min-h-72 place-items-center p-8 text-center text-sm text-destructive">{message}</div>;
}

function PdfPage({ page, pageNumber }: { page: any; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewport = page.getViewport({ scale: 1.45 });
    const context = canvas.getContext("2d");
    if (!context) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const task = page.render({ canvas, canvasContext: context, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] });
    void task.promise.catch((renderError: { name?: string }) => {
      if (renderError.name !== "RenderingCancelledException") throw renderError;
    });
    return () => task.cancel();
  }, [page]);

  return (
    <figure className="mx-auto w-fit max-w-full bg-background shadow-sm">
      <canvas ref={canvasRef} aria-label={`Page ${pageNumber}`} className="block max-w-full" />
      <figcaption className="border-t px-3 py-1 text-center text-xs text-muted-foreground">Page {pageNumber}</figcaption>
    </figure>
  );
}

function PdfViewer({ signedUrl }: { signedUrl: string }) {
  const [pages, setPages] = useState<any[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    let loadingTask: any;
    setPages([]);
    setError(undefined);

    void (async () => {
      try {
        const [{ getDocument, GlobalWorkerOptions }, response] = await Promise.all([
          import("pdfjs-dist"),
          fetch(signedUrl),
        ]);
        if (!response.ok) throw new Error("Unable to load this PDF");
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
        loadingTask = getDocument({ data: await response.arrayBuffer() });
        const pdf = await loadingTask.promise;
        const loadedPages = await Promise.all(Array.from({ length: pdf.numPages }, (_, index) => pdf.getPage(index + 1)));
        if (active) setPages(loadedPages);
      } catch (loadError) {
        if (active && (loadError as { name?: string }).name !== "RenderingCancelledException") {
          setError(loadError instanceof Error ? loadError.message : "Unable to render this PDF");
        }
      }
    })();

    return () => {
      active = false;
      void loadingTask?.destroy();
    };
  }, [signedUrl]);

  if (error) return <ViewerError message={error} />;
  if (pages.length === 0) return <LoadingDocument />;
  return <div className="space-y-4 p-4">{pages.map((page, index) => <PdfPage key={index} page={page} pageNumber={index + 1} />)}</div>;
}

function extractLegacyDocText(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const ascii = Array.from(bytes, (byte) => (byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9 ? String.fromCharCode(byte) : " ").join("");
  const unicode = new TextDecoder("utf-16le").decode(bytes).replace(/[^\x20-\x7E\u00A0-\u024F\n\r\t]/g, " ");
  const clean = (value: string) => value.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return clean(unicode).length > clean(ascii).length ? clean(unicode) : clean(ascii);
}

function WordViewer({ signedUrl, extension }: { signedUrl: string; extension: string }) {
  const [html, setHtml] = useState<string>();
  const [text, setText] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    setHtml(undefined);
    setText(undefined);
    setError(undefined);
    void (async () => {
      try {
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error("Unable to load this Word document");
        const buffer = await response.arrayBuffer();
        if (extension === "docx") {
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (active) setHtml(DOMPurify.sanitize(result.value));
        } else if (active) {
          const extracted = extractLegacyDocText(buffer);
          if (!extracted) throw new Error("This older Word file cannot be rendered. Please download it to open the original.");
          setText(extracted);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to render this Word document");
      }
    })();
    return () => { active = false; };
  }, [extension, signedUrl]);

  if (error) return <ViewerError message={error} />;
  if (!html && !text) return <LoadingDocument />;
  if (html) return <article className="prose prose-sm mx-auto min-h-full max-w-3xl bg-background p-8 text-foreground" dangerouslySetInnerHTML={{ __html: html }} />;
  return <pre className="mx-auto min-h-full max-w-3xl whitespace-pre-wrap break-words bg-background p-8 font-sans text-sm text-foreground">{text}</pre>;
}

export function DocumentViewer({ signedUrl, extension, name }: ViewerProps) {
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    return <img src={signedUrl} alt={name} className="h-full w-full object-contain" />;
  }
  if (extension === "pdf") return <PdfViewer signedUrl={signedUrl} />;
  if (extension === "doc" || extension === "docx") return <WordViewer signedUrl={signedUrl} extension={extension} />;
  return <ViewerError message="Preview is not available for this file type. Download the file to open it." />;
}