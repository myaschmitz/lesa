# `src/reader`

The `ReaderView` abstraction and its two implementations (`EpubReader`,
`PdfReader`). App screens talk only to this interface — never to epub.js,
Readium, or a PDF library directly. Swapping a rendering engine must be a
one-file change in here.

_Empty for Phase 1 (scaffold). Implementations land in the PDF and EPUB phases._
