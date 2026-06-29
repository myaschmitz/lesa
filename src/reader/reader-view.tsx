import type { PdfFit } from '@/store/settings-store';

import type { BookFormat } from '@/types/book';

import { EpubReader } from './epub-reader';
import { PdfReader } from './pdf-reader';
import type { ReaderViewProps } from './types';

export interface ReaderViewComponentProps extends ReaderViewProps {
  /** Chooses the engine. Screens pass the book's format; nothing else branches. */
  format: BookFormat;
  /** PDF-only: page-snap vs free scroll. Ignored by EPUB. */
  pdfPaging?: boolean;
  /** PDF-only: how the page scales to the viewport. Ignored by EPUB. */
  pdfFit?: PdfFit;
}

/**
 * The single entry point screens use to render a book. It dispatches to the
 * matching engine by format, keeping every rendering library sealed inside
 * `src/reader`. Adding or swapping an engine is a change here plus its impl file.
 */
export function ReaderView({ format, pdfPaging, pdfFit, ...props }: ReaderViewComponentProps) {
  switch (format) {
    case 'pdf':
      return <PdfReader {...props} paging={pdfPaging} fit={pdfFit} />;
    case 'epub':
      return <EpubReader {...props} />;
  }
}
