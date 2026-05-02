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
  serverMatchCount?: number; // 서버 검색일 때만 있음 (위치 하이라이트 없이 건수만)
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

interface ServerSearchResult {
  pageIndex: number;
  matchCount: number;
  preview: string;
}

interface ServerSearchResponse {
  totalCount: number;
  results: ServerSearchResult[];
}

// iOS Safari는 pdf.js 텍스트 추출이 불안정해서 서버 검색 사용
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * 서버 사이드 검색 (WAS가 미리 추출한 텍스트에서 검색)
 * iOS Safari처럼 클라이언트 텍스트 추출이 불안정한 환경용.
 * 위치 하이라이트는 없지만, 매치된 페이지 번호와 건수는 정확함.
 */
async function searchOnServer(
  token: string,
  query: string,
): Promise<SearchMatch[]> {
  const wasUrl = process.env.NEXT_PUBLIC_WAS_URL || 'http://localhost:3001';

  const res = await fetch(`${wasUrl}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, query }),
  });

  if (!res.ok) {
    throw new Error(`서버 검색 실패: ${res.status}`);
  }

  const data: ServerSearchResponse = await res.json();

  return data.results.map((r) => ({
    pageIndex: r.pageIndex,
    rawMatches: [],
    serverMatchCount: r.matchCount,
  }));
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
      token?: string,
    ) => {
      setQuery(term);

      if (!term.trim()) {
        setMatches([]);
        return;
      }

      setSearching(true);

      // iOS는 항상 서버 검색 우선 시도
      if (isIOS() && token) {
        try {
          const serverResults = await searchOnServer(token, term);
          setMatches(serverResults);
          setSearching(false);
          return;
        } catch (err) {
          console.warn('[useSearch] 서버 검색 실패, 클라이언트 검색으로 폴백:', err);
        }
      }

      const results: SearchMatch[] = [];
      const lower = term.toLowerCase();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        const cached = textCache?.find((c) => c.pageIndex === i);
        if (
          cached &&
          cached.text.length > 0 &&
          !cached.text.toLowerCase().includes(lower)
        ) {
          continue;
        }

        let textContent;
        try {
          textContent = await Promise.race([
            page.getTextContent(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 8000),
            ),
          ]);
        } catch {
          if (cached && cached.text.toLowerCase().includes(lower)) {
            const lowerCached = cached.text.toLowerCase();
            let count = 0;
            let pos = 0;
            while ((pos = lowerCached.indexOf(lower, pos)) !== -1) {
              count++;
              pos++;
            }
            if (count > 0) {
              results.push({ pageIndex: i, rawMatches: [], serverMatchCount: count });
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

      // 클라이언트 검색 결과가 0건이고 iOS가 아닌 경우에도 token이 있으면 서버 검색 폴백
      if (results.length === 0 && token) {
        try {
          const serverResults = await searchOnServer(token, term);
          if (serverResults.length > 0) {
            setMatches(serverResults);
            setSearching(false);
            return;
          }
        } catch {
          // 무시
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
