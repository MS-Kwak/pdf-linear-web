'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export interface PdfState {
  doc: PDFDocumentProxy | null;
  pages: PDFPageProxy[]; // 렌더링 완료된 페이지 객체 배열
  totalPages: number;
  loadedPages: number; // 현재까지 로드된 페이지 수
  outline: OutlineItem[]; // 목차
  error: string | null;
  isLoading: boolean;
}

export interface OutlineItem {
  title: string;
  dest: unknown; // PDF.js outline destination
  items?: OutlineItem[];
}

export function usePdfLoader(token: string | null) {
  const [state, setState] = useState<PdfState>({
    doc: null,
    pages: [],
    totalPages: 0,
    loadedPages: 0,
    outline: [],
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
        // pdfjs-dist는 브라우저 전용이라 동적으로 import
        const pdfjsLib = await import('pdfjs-dist');

        // worker 경로 지정 (next.config.ts에서 public에 복사한 파일)
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          '/pdf.worker.min.mjs';

        const wasUrl =
          process.env.NEXT_PUBLIC_WAS_URL || 'http://localhost:3001';
        const pdfUrl = `${wasUrl}/pdf/${token}`;

        // PDF.js에 URL을 주면, 내부적으로 Range Request를 보내서
        // 처음엔 1페이지만 필요한 바이트만 받아옴 (Linear 로딩 핵심!)
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
          cMapUrl:
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;

        const totalPages = doc.numPages;

        // 목차(outline) 가져오기
        const rawOutline = await doc.getOutline();
        const outline = (rawOutline || []) as OutlineItem[];

        setState((prev) => ({
          ...prev,
          doc,
          totalPages,
          outline,
          isLoading: false,
        }));

        // Linear 로딩: 1페이지부터 순서대로 로드
        const pages: PDFPageProxy[] = [];
        for (let i = 1; i <= totalPages; i++) {
          const page = await doc.getPage(i);
          pages.push(page);

          // 페이지 로드될 때마다 즉시 state 업데이트 → 1페이지 먼저 보임
          setState((prev) => ({
            ...prev,
            pages: [...pages],
            loadedPages: i,
          }));
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
