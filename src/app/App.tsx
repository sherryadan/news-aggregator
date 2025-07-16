import { useState, useMemo } from 'react';
import './App.css';
import { Header } from './components/Header';
import SearchBar from './components/SearchBar';
import ArticleList from './components/ArticleList';
import PreferencesModal from './components/PreferenceModal';
import type { SearchFilters, EnhancedSearchFilters, UserPreferences, Article } from './types';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 10;

// Infinite fetcher function
async function fetchArticles({ pageParam = 1, filters }: { pageParam?: number; filters: EnhancedSearchFilters }): Promise<Article[]> {
  const params = new URLSearchParams({ ...filters, page: pageParam.toString() } as Record<string, string>).toString();
  const res = await fetch(`/api/articles?${params}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

const defaultPreferences: UserPreferences = {
  sources: [],
  categories: [],
  authors: [],
};

function App() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [searchFilters, setSearchFilters] = useState<EnhancedSearchFilters>({});

  // Merge preferences and searchFilters for fetching
  const mergedFilters = useMemo(() => ({
    ...(preferences.sources.length ? { source: preferences.sources.join(',') } : {}),
    ...(preferences.categories.length ? { category: preferences.categories.join(',') } : {}),
    ...(preferences.authors.length ? { author: preferences.authors.join(',') } : {}),
    ...searchFilters,
  }), [preferences, searchFilters]);

  // Use TanStack Query for infinite fetching
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<Article[], Error>({
    queryKey: ['articles', mergedFilters],
    queryFn: ({ pageParam }) => fetchArticles({ pageParam: Number(pageParam) || 1, filters: mergedFilters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Article[], allPages: Article[][]) =>
      lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });

  // Flatten all pages into a single articles array
  const articles: Article[] = data ? data.pages.flat() : [];

  const handleSearch = (newFilters: SearchFilters | EnhancedSearchFilters) => {
    setSearchFilters(newFilters);
  };

  const handlePreferencesSave = (newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
    setShowPreferences(false);
  };

  return (
    <div className="app">
      <Header onOpenPreferences={() => setShowPreferences(true)} />
      <main className="main-content">
        <div className="search-section">
          <SearchBar filters={searchFilters} setFilters={setSearchFilters} onSearch={handleSearch} />
        </div>
        <ArticleList
          articles={articles}
          loading={isLoading || isFetchingNextPage}
          error={error ? error.message : undefined}
          hasMore={!!hasNextPage}
          onLoadMore={fetchNextPage}
        />
      </main>
      <PreferencesModal
        isOpen={showPreferences}
        preferences={preferences}
        onSave={handlePreferencesSave}
        onClose={() => setShowPreferences(false)}
      />
    </div>
  );
}

export default App;

