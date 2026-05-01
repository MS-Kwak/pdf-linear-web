"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import type { OutlineItem } from "@/hooks/usePdfLoader";

interface Props {
  isOpen: boolean;
  outline: OutlineItem[];
  doc: PDFDocumentProxy | null;
  onClose: () => void;
  onPageSelect: (pageNumber: number) => void;
}

export default function TocSidebar({ isOpen, outline, doc, onClose, onPageSelect }: Props) {
  async function handleItemClick(dest: unknown) {
    if (!doc || !dest) return;

    try {
      // PDF outline destination → 페이지 번호 변환
      const resolvedDest = typeof dest === "string"
        ? await doc.getDestination(dest)
        : dest as unknown[];

      if (!resolvedDest) return;

      const pageRef = resolvedDest[0] as { num: number; gen: number };
      const pageIndex = await doc.getPageIndex(pageRef);
      onPageSelect(pageIndex + 1); // 0-based → 1-based
    } catch (err) {
      console.error("목차 이동 오류:", err);
    }
  }

  function renderItems(items: OutlineItem[], depth = 0) {
    return items.map((item, i) => (
      <div key={i}>
        <button
          onClick={() => handleItemClick(item.dest)}
          className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm truncate"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {item.title}
        </button>
        {item.items && item.items.length > 0 && renderItems(item.items, depth + 1)}
      </div>
    ));
  }

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 (모바일 터치로 닫기) */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* 사이드바 */}
      <div className="fixed top-10 left-0 bottom-0 z-50 w-64 bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
          <span className="font-medium text-sm">목차</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>

        {outline.length === 0 ? (
          <p className="text-sm text-gray-400 p-3">목차가 없습니다.</p>
        ) : (
          <div>{renderItems(outline)}</div>
        )}
      </div>
    </>
  );
}
