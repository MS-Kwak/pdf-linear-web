'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { RawMatch, SearchMatch } from '@/hooks/useSearch';

interface Props {
  page: PDFPageProxy;
  pageNumber: number;
  scale: number;
  searchMatches: SearchMatch | undefined;
  onVisible: (pageNumber: number) => void;
}

function toViewportRect(
  match: RawMatch,
  viewportTransform: number[],
  scale: number,
): DOMRect {
  const [a, b, c, d, e, f] = viewportTransform;
  const [, , , , px, py] = match.transform;

  const baseX = a * px + c * py + e;
  const baseY = b * px + d * py + f;

  const fontUserH =
    Math.abs(match.transform[3]) ||
    Math.abs(match.transform[0]) ||
    10;
  const h = fontUserH * scale;

  const fullW = match.itemWidth * scale;

  let rectX = baseX;
  let w = fullW > 0 ? fullW : h;

  if (fullW > 0 && match.strLen > 0) {
    const charW = fullW / match.strLen;
    rectX = baseX + charW * match.charStart;
    w = charW * (match.charEnd - match.charStart);
  }

  return new DOMRect(rectX, baseY - h, Math.max(w, 6), h);
}

export default function PdfPage({
  page,
  pageNumber,
  scale,
  searchMatches,
  onVisible,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  const viewport = page.getViewport({ scale });
  const cssWidth = Math.floor(viewport.width);
  const cssHeight = Math.floor(viewport.height);

  // 렌더링용: 뷰포트 근처(위아래 1000px)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsNearViewport(entries[0].isIntersecting);
      },
      { rootMargin: '1000px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 페이지 번호 감지용: 화면에 50% 이상 보일 때만
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible(pageNumber);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onVisible]);

  // 보이는 페이지만 canvas 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isNearViewport) return;

    renderTaskRef.current?.cancel();

    const dpr = window.devicePixelRatio || 1;
    const outputScale = Math.min(dpr, 2);
    const renderScale = scale * outputScale;

    const renderViewport = page.getViewport({ scale: renderScale });
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const task = page.render({ canvas, viewport: renderViewport });
    renderTaskRef.current = task;

    task.promise.catch((err) => {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(
          `[PdfPage] 렌더링 오류 (p.${pageNumber}):`,
          err,
        );
      }
    });

    return () => renderTaskRef.current?.cancel();
  }, [page, scale, pageNumber, isNearViewport, cssWidth, cssHeight]);

  const viewportTransform = viewport.transform;

  return (
    <div
      ref={containerRef}
      id={`page-${pageNumber}`}
      className="mb-4"
      style={{ minHeight: cssHeight, scrollMarginTop: 48 }}
    >
      {isNearViewport ? (
        <div
          className="relative shadow-md mx-auto"
          style={{ width: cssWidth }}
        >
          <canvas ref={canvasRef} />

          {searchMatches?.rawMatches.map((match, i) => {
            const rect = toViewportRect(
              match,
              viewportTransform,
              scale,
            );
            return (
              <div
                key={i}
                className="absolute bg-yellow-300 opacity-50 pointer-events-none"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                }}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="bg-white shadow-md mx-auto"
          style={{ width: cssWidth, height: cssHeight }}
        />
      )}
    </div>
  );
}
