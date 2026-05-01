"use client";

import { useState, KeyboardEvent } from "react";

interface Props {
  currentPage: number;
  totalPages: number;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGoToPage: (page: number) => void;
  onSearch: (term: string) => void;
  onClearSearch: () => void;
  onToggleToc: () => void;
}

export default function Toolbar({
  currentPage,
  totalPages,
  scale,
  onZoomIn,
  onZoomOut,
  onGoToPage,
  onSearch,
  onClearSearch,
  onToggleToc,
}: Props) {
  const [pageInput, setPageInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  function handlePageSubmit(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const num = parseInt(pageInput, 10);
    if (num >= 1 && num <= totalPages) {
      onGoToPage(num);
    }
    setPageInput("");
  }

  function handleSearchSubmit(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      onSearch(searchInput);
    }
    if (e.key === "Escape") {
      setSearchInput("");
      onClearSearch();
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white flex items-center gap-3 px-3 py-2 flex-wrap">
      {/* 목차 토글 */}
      <button
        onClick={onToggleToc}
        className="p-1.5 rounded hover:bg-gray-600 text-sm"
        title="목차"
      >
        ☰
      </button>

      {/* 구분선 */}
      <div className="w-px h-5 bg-gray-500" />

      {/* 확대/축소 */}
      <button onClick={onZoomOut} className="px-2 py-1 rounded hover:bg-gray-600 text-lg font-bold">
        −
      </button>
      <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
      <button onClick={onZoomIn} className="px-2 py-1 rounded hover:bg-gray-600 text-lg font-bold">
        ＋
      </button>

      {/* 구분선 */}
      <div className="w-px h-5 bg-gray-500" />

      {/* 페이지 이동 */}
      <div className="flex items-center gap-1 text-sm">
        <input
          type="number"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={handlePageSubmit}
          placeholder={String(currentPage)}
          className="w-12 bg-gray-700 text-white text-center rounded px-1 py-0.5"
          min={1}
          max={totalPages}
        />
        <span>/ {totalPages}</span>
      </div>

      {/* 구분선 */}
      <div className="w-px h-5 bg-gray-500" />

      {/* 검색 */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchSubmit}
          placeholder="검색 (Enter)"
          className="bg-gray-700 text-white rounded px-2 py-0.5 text-sm w-36"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(""); onClearSearch(); }}
            className="text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
