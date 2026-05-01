'use client';

import { useEffect, useRef } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { RawMatch, SearchMatch } from '@/hooks/useSearch';

interface Props {
  page: PDFPageProxy;
  pageNumber: number;
  scale: number;
  searchMatches: SearchMatch | undefined;
  onVisible: (pageNumber: number) => void;
}

/**
 * PDF 원본 좌표(scale 무관) → 현재 viewport 픽셀 좌표로 변환
 *
 * PDF 좌표계: 원점이 좌하단, y축 위로 증가
 * Canvas 좌표계: 원점이 좌상단, y축 아래로 증가
 * viewport.transform이 이 변환을 처리해줌
 */
function toViewportRect(
  match: RawMatch,
  viewportTransform: number[],
  scale: number,
): DOMRect {
  const [a, b, c, d, e, f] = viewportTransform;
  const [, , , , px, py] = match.transform;

  // 텍스트 기준점(baseline)의 canvas 좌표
  const baseX = a * px + c * py + e;
  const baseY = b * px + d * py + f;

  // 폰트 높이: transform의 수직 성분 크기
  // item.transform[3]이 0인 CID 폰트는 [0] 값을 사용
  const fontUserH =
    Math.abs(match.transform[3]) ||
    Math.abs(match.transform[0]) ||
    10;
  const h = fontUserH * scale;

  // 아이템 전체 너비 → canvas 픽셀
  const fullW = match.itemWidth * scale;

  // 단어가 아이템의 일부일 때 너비·위치 보정 (예: "보험계약"에서 "보험"만 표시)
  let rectX = baseX;
  let w = fullW > 0 ? fullW : h; // width 0이면 정사각형 fallback

  if (fullW > 0 && match.strLen > 0) {
    const charW = fullW / match.strLen;
    rectX = baseX + charW * match.charStart;
    w = charW * (match.charEnd - match.charStart);
  }

  // top = baseline - 높이 (canvas y는 아래로 증가하므로 뺀다)
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

  // Intersection Observer: 화면에 보일 때만 현재 페이지 번호 업데이트
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onVisible(pageNumber);
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onVisible]);

  // canvas에 PDF 페이지 렌더링 (devicePixelRatio 반영하여 고해상도 렌더)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderTaskRef.current?.cancel();

    const dpr = window.devicePixelRatio || 1;
    const outputScale = Math.min(dpr, 3);
    const renderScale = scale * outputScale;

    const viewport = page.getViewport({ scale: renderScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
    canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;

    const task = page.render({ canvas, viewport });
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
  }, [page, scale, pageNumber]);

  // 현재 scale 기준 viewport transform (하이라이트 위치 계산용)
  const viewportTransform = page.getViewport({ scale }).transform;

  return (
    <div
      ref={containerRef}
      id={`page-${pageNumber}`}
      className="flex justify-center mb-4"
    >
      {/* canvas와 하이라이트를 같은 relative 컨테이너로 묶어 기준점 일치 */}
      <div className="relative shadow-md">
        <canvas ref={canvasRef} />

        {/* scale 바뀔 때마다 현재 viewport로 재계산 → zoom 시에도 정확한 위치 */}
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
    </div>
  );
}
