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
    textCache,
    error,
    isLoading,
  } = usePdfLoader(token);
  const { scale, setScale, zoomIn, zoomOut } = useZoom(1.0);
  const { matches, searching, search, clearSearch } = useSearch();

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
  }, [pages, setScale]);

  // scale 변경 시 현재 페이지 위치 유지
  const prevScaleRef = useRef(scale);
  useEffect(() => {
    if (!initialScaleSet.current) return;
    if (prevScaleRef.current === scale) return;
    prevScaleRef.current = scale;

    const el = document.getElementById(`page-${currentPage}`);
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps

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
    await search(term, pages, textCache);
  }

  // 검색 결과가 나오면 첫 결과 페이지로 스크롤
  useEffect(() => {
    if (matches.length > 0) {
      const targetPage = matches[0].pageIndex + 1;
      const el = document.getElementById(`page-${targetPage}`);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  }, [matches]);

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
      {/* 디버그 정보 (테스트 후 삭제) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 text-green-400 text-xs p-2 font-mono">
        pages:{pages.length} | textCache:{textCache.length} |
        searching:{String(searching)} | matches:{matches.length}
      </div>

      <Toolbar
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        searching={searching}
        searchCount={matches.reduce(
          (sum, m) => sum + m.rawMatches.length,
          0,
        )}
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

      <div ref={containerRef} className="pt-12 pb-8 overflow-x-auto">
        <div className="min-w-fit px-2">
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
                <div key={`skeleton-${i}`} className="mb-4">
                  <div
                    className="bg-gray-300 animate-pulse shadow-md mx-auto"
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
    </div>
  );
}
