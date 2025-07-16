import { useState } from 'react';
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
  const [filters, setFilters] = useState<EnhancedSearchFilters>({});
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

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
    queryKey: ['articles', filters],
    queryFn: ({ pageParam }) => fetchArticles({ pageParam: Number(pageParam) || 1, filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Article[], allPages: Article[][]) =>
      lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });

  // Flatten all pages into a single articles array
  const articles: Article[] = data ? data.pages.flat() : [];

  const handleSearch = (newFilters: SearchFilters | EnhancedSearchFilters) => {
    setFilters({ ...newFilters });
    refetch();
  };

  const handlePreferencesSave = (newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
    setShowPreferences(false);
    setFilters({
      source: newPreferences.sources.length ? newPreferences.sources.join(',') : undefined,
      category: newPreferences.categories.length ? newPreferences.categories.join(',') : undefined,
      author: newPreferences.authors.length ? newPreferences.authors.join(',') : undefined,
    });
  };

  return (
    <div className="app">
      <Header onOpenPreferences={() => setShowPreferences(true)} />
      <main className="main-content">
        <div className="search-section">
          <SearchBar onSearch={handleSearch} />
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

