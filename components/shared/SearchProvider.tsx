'use client';

import { KBarSearchProvider } from '@shipixen/pliny/search/KBar';
import { useRouter } from 'next/navigation';
import { searchLinks } from '@/data/config/searchLinks';

export const SearchProvider = ({ children }) => {
  const router = useRouter();

  const defaultActions = searchLinks.map((link) => ({
    id: link.id,
    name: link.name,
    keywords: link.keywords,
    section: link.section,
    perform: () => router.push(link.href),
  }));

  return (
    <KBarSearchProvider
      kbarConfig={{
        searchDocumentsPath: '',
        defaultActions,
      }}
    >
      {children}
    </KBarSearchProvider>
  );
};

export default SearchProvider;
