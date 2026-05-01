'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';

interface Props {
  currentPage: number;
  totalPages: number;
  scale: number;
  searching: boolean;
  searchCount: number;
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
  searching,
  searchCount,
  onZoomIn,
  onZoomOut,
  onGoToPage,
  onSearch,
  onClearSearch,
  onToggleToc,
}: Props) {
  const [pageInput, setPageInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searched, setSearched] = useState(false);

  function handlePageSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const num = parseInt(pageInput, 10);
    if (num >= 1 && num <= totalPages) {
      onGoToPage(num);
    }
    setPageInput('');
  }

  function doSearch() {
    if (searchInput.trim()) {
      onSearch(searchInput);
      setSearched(true);
    }
  }

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    doSearch();
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setSearchInput('');
      setSearched(false);
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
      <button
        onClick={onZoomOut}
        className="px-2 py-1 rounded hover:bg-gray-600 text-lg font-bold"
      >
        −
      </button>
      <span className="text-sm w-12 text-center">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="px-2 py-1 rounded hover:bg-gray-600 text-lg font-bold"
      >
        ＋
      </button>

      {/* 구분선 */}
      <div className="w-px h-5 bg-gray-500" />

      {/* 페이지 이동 */}
      <form
        onSubmit={handlePageSubmit}
        className="flex items-center gap-1 text-sm"
      >
        <input
          type="number"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          placeholder={String(currentPage)}
          className="w-12 bg-gray-700 text-white text-center rounded px-1 py-0.5"
          min={1}
          max={totalPages}
        />
        <span>/ {totalPages}</span>
      </form>

      {/* 구분선 */}
      <div className="w-px h-5 bg-gray-500" />

      {/* 검색 */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center gap-1"
      >
        <input
          type="text"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setSearched(false);
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="검색"
          enterKeyHint="search"
          className="bg-gray-700 text-white rounded px-2 py-0.5 text-sm w-28"
        />
        <button
          type="button"
          onClick={doSearch}
          className="bg-blue-600 active:bg-blue-400 text-white text-sm px-2 py-0.5 rounded"
        >
          검색
        </button>
        {(searched || searching) && (
          <span className="text-xs text-yellow-300">
            {searching ? '검색중...' : `${searchCount}건`}
          </span>
        )}
        {searchInput && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearched(false);
              onClearSearch();
            }}
            className="text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        )}
      </form>
    </div>
  );
}
