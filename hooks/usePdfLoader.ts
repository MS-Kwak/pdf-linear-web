'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export interface PageTextCache {
  pageIndex: number;
  text: string;
}

export interface PdfState {
  doc: PDFDocumentProxy | null;
  pages: PDFPageProxy[];
  totalPages: number;
  loadedPages: number;
  outline: OutlineItem[];
  textCache: PageTextCache[];
  error: string | null;
  isLoading: boolean;
}

export interface OutlineItem {
  title: string;
  dest: unknown;
  items?: OutlineItem[];
}

export function usePdfLoader(token: string | null) {
  const [state, setState] = useState<PdfState>({
    doc: null,
    pages: [],
    totalPages: 0,
    loadedPages: 0,
    outline: [],
    textCache: [],
    error: null,
    isLoading: false,
  });

  const loadingRef = useRef(false);

  useEffect(() => {
    if (!token || loadingRef.current) return;

    async function load() {
      loadingRef.current = true;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const pdfjsLib = await import('pdfjs-dist');

        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const wasUrl =
          process.env.NEXT_PUBLIC_WAS_URL || 'http://localhost:3001';
        const pdfUrl = `${wasUrl}/pdf/${token}`;

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
          cMapUrl:
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        const totalPages = doc.numPages;

        const rawOutline = await doc.getOutline();
        const outline = (rawOutline || []) as OutlineItem[];

        setState((prev) => ({
          ...prev,
          doc,
          totalPages,
          outline,
          isLoading: false,
        }));

        // 1단계: 페이지 렌더링 우선 (빠른 표시)
        const pages: PDFPageProxy[] = [];
        for (let i = 1; i <= totalPages; i++) {
          const page = await doc.getPage(i);
          pages.push(page);

          setState((prev) => ({
            ...prev,
            pages: [...pages],
            loadedPages: i,
          }));
        }

        // 2단계: 텍스트 추출 (검색용 캐시, 백그라운드)
        const textCache: PageTextCache[] = [];
        for (let i = 0; i < pages.length; i++) {
          try {
            const textContent = await pages[i].getTextContent();
            const pageText = textContent.items
              .filter(
                (it) =>
                  'str' in it &&
                  (it as { str: string }).str.length > 0,
              )
              .map((it) => (it as { str: string }).str)
              .join('');
            textCache.push({ pageIndex: i, text: pageText });
          } catch {
            textCache.push({ pageIndex: i, text: '' });
          }

          // 10페이지마다 중간 업데이트 (진행 상황 확인용)
          if ((i + 1) % 10 === 0 || i === pages.length - 1) {
            setState((prev) => ({ ...prev, textCache: [...textCache] }));
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'PDF 로드 실패';
        setState((prev) => ({
          ...prev,
          error: message,
          isLoading: false,
        }));
      }
    }

    load();
  }, [token]);

  return state;
}
