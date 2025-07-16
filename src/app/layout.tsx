import QueryProvider from './QueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>News Aggregator</title>
        <meta name="description" content="Stay updated with the latest news from top sources like NewsAPI, The Guardian, and NYTimes. Customize your feed by source, category, and author." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="News Aggregator" />
        <meta property="og:description" content="Stay updated with the latest news from top sources. Personalize your news experience." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta name="theme-color" content="#1a202c" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
} 