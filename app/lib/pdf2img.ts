export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  loadPromise = import("pdfjs-dist/legacy/build/pdf").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; // ES module worker
    pdfjsLib = lib;
    return lib;
  });

  return loadPromise;
}

export async function convertPdfToImage(file: File) {
  try {
    const pdfjs = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 3 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve({ imageUrl: "", file: null, error: "Blob failed" });
          return;
        }

        resolve({
          imageUrl: URL.createObjectURL(blob),
          file: new File([blob], file.name.replace(".pdf", ".png"), {
            type: "image/png",
          }),
        });
      }, "image/png");
    });
  } catch (err: any) {
    return { imageUrl: "", file: null, error: err.message };
  }
}
