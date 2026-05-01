"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePdfLoader } from "@/hooks/usePdfLoader";
import { useZoom } from "@/hooks/useZoom";
import { useSearch } from "@/hooks/useSearch";
import PdfPage from "@/components/PdfPage";
import Toolbar from "@/components/Toolbar";
import TocSidebar from "@/components/TocSidebar";

interface Props {
  token: string;
}

export default function PdfViewer({ token }: Props) {
  const { doc, pages, totalPages, loadedPages, outline, error, isLoading } = usePdfLoader(token);
  const { scale, setScale, zoomIn, zoomOut } = useZoom(1.0);
  const { matches, search, clearSearch } = useSearch();

  const [currentPage, setCurrentPage] = useState(1);
  const [tocOpen, setTocOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 첫 페이지 로드 후 화면 폭에 맞는 초기 scale 자동 계산
  useEffect(() => {
    if (pages.length === 0) return;

    const page = pages[0];
    const naturalViewport = page.getViewport({ scale: 1.0 });
    const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth;

    // PDF 페이지 폭이 컨테이너보다 크면 맞게 줄임, 작으면 1.0 유지
    const fitScale = Math.min(containerWidth / naturalViewport.width, 1.0);
    setScale(fitScale);
  }, [pages.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // 특정 페이지로 스크롤
  function goToPage(pageNumber: number) {
    const el = document.getElementById(`page-${pageNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(pageNumber);
    }
  }

  const handlePageVisible = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
  }, []);

  async function handleSearch(term: string) {
    await search(term, pages);
  }

  // 핀치줌: 손가락 거리 비율로 scale 부드럽게 조정
  const lastDistRef = useRef<number | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function getDistance(touches: TouchList) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      e.preventDefault();

      const dist = getDistance(e.touches);
      if (lastDistRef.current !== null) {
        const ratio = dist / lastDistRef.current;
        setScale(scaleRef.current * ratio);
      }
      lastDistRef.current = dist;
    }

    function onTouchEnd() {
      lastDistRef.current = null;
    }

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [setScale]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <p className="text-red-500 text-lg font-semibold mb-2">PDF를 불러올 수 없습니다</p>
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
        onPageSelect={(n) => { goToPage(n); setTocOpen(false); }}
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
          Array.from({ length: totalPages - loadedPages }).map((_, i) => (
            <div key={`skeleton-${i}`} className="flex justify-center mb-4">
              <div
                className="bg-gray-300 animate-pulse shadow-md"
                style={{ width: Math.round(595 * scale), height: Math.round(842 * scale) }}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
