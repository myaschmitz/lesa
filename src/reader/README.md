# `src/reader`

The `ReaderView` abstraction and its two implementations (`EpubReader`,
`PdfReader`). App screens talk only to this interface — never to epub.js,
Readium, or a PDF library directly. Swapping a rendering engine must be a
one-file change in here.

- `pdf-reader.tsx` — PDF engine (`@kishannareshpal/expo-pdf`), page+offset token.
- `epub-reader.tsx` — EPUB engine (epub.js via `@epubjs-react-native/core`),
  scroll-first, opaque CFI token, chapter ToC. `epub-file-system.ts` is the
  SDK 56 legacy-API adapter epub.js needs (the published expo adapter imports the
  removed module API). If scroll feel ever lags on long books, swap this file for
  `react-native-readium` — screens won't change.
