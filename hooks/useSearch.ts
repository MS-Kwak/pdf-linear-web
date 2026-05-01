'use client';

import { useState, useCallback } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { PageTextCache } from '@/hooks/usePdfLoader';

export interface RawMatch {
  transform: number[];
  itemWidth: number;
  itemHeight: number;
  charStart: number;
  charEnd: number;
  strLen: number;
}

export interface SearchMatch {
  pageIndex: number;
  rawMatches: RawMatch[];
}

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
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(
    async (
      term: string,
      pages: PDFPageProxy[],
      textCache?: PageTextCache[],
    ) => {
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

        // 캐시된 텍스트로 먼저 해당 페이지에 매치가 있는지 빠르게 확인
        const cached = textCache?.find((c) => c.pageIndex === i);
        if (cached && !cached.text.toLowerCase().includes(lower)) {
          continue; // 이 페이지에는 매치 없음 → 건너뛰기
        }

        // 매치가 있거나 캐시가 없는 경우, 상세 위치 추출을 위해 getTextContent 호출
        let textContent;
        try {
          textContent = await Promise.race([
            page.getTextContent(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 8000),
            ),
          ]);
        } catch {
          // getTextContent 실패 시 캐시 텍스트로 간단 매치 (위치 하이라이트 없이 건수만)
          if (cached && cached.text.toLowerCase().includes(lower)) {
            const lowerCached = cached.text.toLowerCase();
            let count = 0;
            let pos = 0;
            while ((pos = lowerCached.indexOf(lower, pos)) !== -1) {
              count++;
              pos++;
            }
            if (count > 0) {
              results.push({ pageIndex: i, rawMatches: [] });
            }
          }
          continue;
        }

        const items = (
          textContent.items as Array<TextItem | { type: string }>
        ).filter(
          (it): it is TextItem =>
            'str' in it && (it as TextItem).str.length > 0,
        );

        let fullText = '';
        const itemRanges: {
          start: number;
          end: number;
          item: TextItem;
        }[] = [];

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

            const charStart = Math.max(0, pos - start);
            const charEnd = Math.min(
              item.str.length,
              matchEnd - start,
            );

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
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setMatches([]);
  }, []);

  return { query, matches, searching, search, clearSearch };
}
