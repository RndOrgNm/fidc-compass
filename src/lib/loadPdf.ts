import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Opens the PDF in `bytes`, which are kept to be opened again: a source is closed and opened once
 * more, or another one is opened from the same file. PDF.js takes over the buffer it is given and
 * leaves it empty, and on an empty one getDocument throws at once, before it returns anything, which
 * no `.catch` on its promise sees: the error unmounts the whole page. So PDF.js gets a copy, and a
 * failure to open is a rejected promise like any other, for the viewer to show.
 */
export function loadPdf(bytes: ArrayBuffer): ReturnType<typeof getDocument>["promise"] {
  try {
    return getDocument({ data: bytes.slice(0) }).promise;
  } catch (error) {
    return Promise.reject(error);
  }
}
