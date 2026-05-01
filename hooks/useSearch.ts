"use client";

import { useState, useCallback } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

// PDF 원본 좌표로 저장 (scale 무관) → zoom해도 정확한 위치 유지
export interface RawMatch {
  transform: number[];  // 텍스트 아이템의 PDF 변환 행렬 [a,b,c,d,tx,ty]
  itemWidth: number;    // 아이템 전체 너비 (PDF 유저 단위)
  itemHeight: number;   // 아이템 높이 (PDF 유저 단위)
  charStart: number;    // 매칭 시작 위치 (item.str 내 인덱스)
  charEnd: number;      // 매칭 끝 위치
  strLen: number;       // item.str 전체 길이
}

export interface SearchMatch {
  pageIndex: number;
  rawMatches: RawMatch[];
}

// pdfjs-dist가 TextItem을 named export 하지 않으므로 직접 정의
interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (term: string, pages: PDFPageProxy[]) => {
    setQuery(term);

    if (!term.trim()) {
      setMatches([]);
      return;
    }

    setSearching(true);
    const results: SearchMatch[] = [];
    const lower = term.toLowerCase();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const textContent = await page.getTextContent();

      const items = (textContent.items as Array<TextItem | { type: string }>).filter(
        (it): it is TextItem => "str" in it && (it as TextItem).str.length > 0
      );

      // 페이지 전체 텍스트를 이어붙여서 한국어 분리 저장 문제 해결
      let fullText = "";
      const itemRanges: { start: number; end: number; item: TextItem }[] = [];

      for (const item of items) {
        const start = fullText.length;
        fullText += item.str;
        itemRanges.push({ start, end: fullText.length, item });
      }

      const lowerFull = fullText.toLowerCase();
      const pageRawMatches: RawMatch[] = [];

      let pos = 0;
      while ((pos = lowerFull.indexOf(lower, pos)) !== -1) {
        const matchEnd = pos + term.length;

        for (const { start, end, item } of itemRanges) {
          if (end <= pos || start >= matchEnd) continue;

          // 아이템 내에서 실제 매칭된 글자 범위
          const charStart = Math.max(0, pos - start);
          const charEnd = Math.min(item.str.length, matchEnd - start);

          pageRawMatches.push({
            transform: [...item.transform],
            itemWidth: item.width,
            itemHeight: item.height,
            charStart,
            charEnd,
            strLen: item.str.length,
          });
        }

        pos++;
      }

      if (pageRawMatches.length > 0) {
        results.push({ pageIndex: i, rawMatches: pageRawMatches });
      }
    }

    setMatches(results);
    setSearching(false);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setMatches([]);
  }, []);

  return { query, matches, searching, search, clearSearch };
}
