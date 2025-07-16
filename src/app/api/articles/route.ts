import { NextRequest, NextResponse } from 'next/server';
import type { Article } from '../../types';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const GUARDIAN_KEY = process.env.GUARDIAN_KEY;
const NYTIMES_KEY = process.env.NYTIMES_KEY;

const PAGE_SIZE = 9;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sourceParam = searchParams.get('source') || '';
  const authorParam = searchParams.get('author') || '';

  const sources = sourceParam ? sourceParam.split(',').map(s => s.trim()).filter(Boolean) : ['newsapi', 'guardian', 'nytimes'];
  const authors = authorParam ? authorParam.split(',').map(a => a.trim()).filter(Boolean) : [];

  try {
    let allArticles: Article[] = [];
    let newsApiArticles: Article[] = [];
    let guardianArticles: Article[] = [];
    let nyTimesArticles: Article[] = [];

    // --- NewsAPI ---
    if (sources.includes('newsapi')) {
      let newsApiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${NEWSAPI_KEY}&pageSize=${PAGE_SIZE}&page=${page}`;
      if (keyword) newsApiUrl += `&q=${encodeURIComponent(keyword)}`;
      if (category) newsApiUrl += `&category=${category}`;
      if (dateFrom) newsApiUrl += `&from=${dateFrom}`;
      if (dateTo) newsApiUrl += `&to=${dateTo}`;
      if (!keyword && !category && !dateFrom && !dateTo) newsApiUrl += `&country=us`;
      try {
        const newsApiRes = await fetch(newsApiUrl);
        const newsApiData = await newsApiRes.json();
        newsApiArticles = (newsApiData.articles || []).map((a: any, i: number): Article => ({
          id: a.url || i,
          title: a.title,
          description: a.description,
          content: a.content,
          url: a.url,
          urlToImage: a.urlToImage,
          publishedAt: a.publishedAt,
          source: { id: a.source?.id || 'newsapi', name: a.source?.name || 'NewsAPI' },
          author: a.author,
          category: category || 'general',
        }));
      } catch (err) {
        console.error('NewsAPI fetch error:', err);
      }
    }

    // --- Guardian ---
    if (sources.includes('guardian')) {
      let guardianUrl = `https://content.guardianapis.com/search?api-key=${GUARDIAN_KEY}&show-fields=trailText,thumbnail,bodyText,byline&page-size=${PAGE_SIZE}&page=${page}`;
      if (keyword) guardianUrl += `&q=${encodeURIComponent(keyword)}`;
      if (category) guardianUrl += `&section=${category}`;
      if (dateFrom) guardianUrl += `&from-date=${dateFrom}`;
      if (dateTo) guardianUrl += `&to-date=${dateTo}`;
      try {
        const guardianRes = await fetch(guardianUrl);
        const guardianData = await guardianRes.json();
        guardianArticles = (guardianData.response?.results || []).map((a: any, i: number): Article => ({
          id: a.id,
          title: a.webTitle,
          description: a.fields?.trailText,
          content: a.fields?.bodyText,
          url: a.webUrl,
          urlToImage: a.fields?.thumbnail,
          publishedAt: a.webPublicationDate,
          source: { id: 'guardian', name: 'The Guardian' },
          author: a.fields?.byline,
          category: category || 'general',
        }));
      } catch (err) {
        console.error('Guardian fetch error:', err);
      }
    }

    // --- NYTimes ---
    if (sources.includes('nytimes')) {
      let nyTimesUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?api-key=${NYTIMES_KEY}&page=${page-1}`;
      if (keyword) nyTimesUrl += `&q=${encodeURIComponent(keyword)}`;
      if (dateFrom) nyTimesUrl += `&begin_date=${dateFrom.replace(/-/g, '')}`;
      if (dateTo) nyTimesUrl += `&end_date=${dateTo.replace(/-/g, '')}`;
      try {
        const nyTimesRes = await fetch(nyTimesUrl);
        const nyTimesData = await nyTimesRes.json();
        nyTimesArticles = (nyTimesData.response?.docs || []).map((a: any, i: number): Article => ({
          id: a._id,
          title: a.headline?.main,
          description: a.snippet,
          content: a.lead_paragraph,
          url: a.web_url,
          urlToImage: a.multimedia?.length ? `https://www.nytimes.com/${a.multimedia[0].url}` : '',
          publishedAt: a.pub_date,
          source: { id: 'nytimes', name: 'NYTimes' },
          author: a.byline?.original,
          category: category || 'general',
        }));
      } catch (err) {
        console.error('NYTimes fetch error:', err);
      }
    }

    // Combine all articles
    let allArticlesCombined: Article[] = [...newsApiArticles, ...guardianArticles, ...nyTimesArticles];

    // Filter by author if provided
    if (authors.length > 0) {
      allArticlesCombined = allArticlesCombined.filter(article =>
        article.author && authors.some(a => article.author?.toLowerCase().includes(a.toLowerCase()))
      );
    }

    // Sort by publishedAt (newest first)
    allArticlesCombined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json(allArticlesCombined);
  } catch (error: unknown) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 