'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePdfLoader } from '@/hooks/usePdfLoader';
import { useZoom } from '@/hooks/useZoom';
import { useSearch } from '@/hooks/useSearch';
import PdfPage from '@/components/PdfPage';
import Toolbar from '@/components/Toolbar';
import TocSidebar from '@/components/TocSidebar';

interface Props {
  token: string;
}

export default function PdfViewer({ token }: Props) {
  const {
    doc,
    pages,
    totalPages,
    loadedPages,
    outline,
    error,
    isLoading,
  } = usePdfLoader(token);
  const { scale, setScale, zoomIn, zoomOut } = useZoom(1.0);
  const { matches, search, clearSearch } = useSearch();

  const [currentPage, setCurrentPage] = useState(1);
  const [tocOpen, setTocOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialScaleSet = useRef(false);

  useEffect(() => {
    if (pages.length === 0 || initialScaleSet.current) return;

    const page = pages[0];
    const naturalViewport = page.getViewport({ scale: 1.0 });
    const containerWidth =
      containerRef.current?.clientWidth ?? window.innerWidth;

    const fitScale = Math.min(
      containerWidth / naturalViewport.width,
      1.0,
    );
    setScale(fitScale);
    initialScaleSet.current = true;
  }, [pages.length, setScale]);

  function goToPage(pageNumber: number) {
    const el = document.getElementById(`page-${pageNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      setCurrentPage(pageNumber);
    }
  }

  const handlePageVisible = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
  }, []);

  async function handleSearch(term: string) {
    await search(term, pages);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <p className="text-red-500 text-lg font-semibold mb-2">
          PDF를 불러올 수 없습니다
        </p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  if (isLoading && pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">PDF 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-200 min-h-screen">
      <Toolbar
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onGoToPage={goToPage}
        onSearch={handleSearch}
        onClearSearch={clearSearch}
        onToggleToc={() => setTocOpen((v) => !v)}
      />

      <TocSidebar
        isOpen={tocOpen}
        outline={outline}
        doc={doc}
        onClose={() => setTocOpen(false)}
        onPageSelect={(n) => {
          goToPage(n);
          setTocOpen(false);
        }}
      />

      <div ref={containerRef} className="pt-12 pb-8 px-2">
        {pages.map((page, i) => {
          const pageNumber = i + 1;
          return (
            <PdfPage
              key={pageNumber}
              page={page}
              pageNumber={pageNumber}
              scale={scale}
              searchMatches={matches.find((m) => m.pageIndex === i)}
              onVisible={handlePageVisible}
            />
          );
        })}

        {loadedPages < totalPages &&
          Array.from({ length: totalPages - loadedPages }).map(
            (_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex justify-center mb-4"
              >
                <div
                  className="bg-gray-300 animate-pulse shadow-md"
                  style={{
                    width: Math.round(595 * scale),
                    height: Math.round(842 * scale),
                  }}
                />
              </div>
            ),
          )}
      </div>
    </div>
  );
}
