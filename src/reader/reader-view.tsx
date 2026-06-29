import type { BookFormat } from '@/types/book';

import { EpubReader } from './epub-reader';
import { PdfReader } from './pdf-reader';
import type { ReaderViewProps } from './types';

export interface ReaderViewComponentProps extends ReaderViewProps {
  /** Chooses the engine. Screens pass the book's format; nothing else branches. */
  format: BookFormat;
}

/**
 * The single entry point screens use to render a book. It dispatches to the
 * matching engine by format, keeping every rendering library sealed inside
 * `src/reader`. Adding or swapping an engine is a change here plus its impl file.
 */
export function ReaderView({ format, ...props }: ReaderViewComponentProps) {
  switch (format) {
    case 'pdf':
      return <PdfReader {...props} />;
    case 'epub':
      return <EpubReader {...props} />;
  }
}
