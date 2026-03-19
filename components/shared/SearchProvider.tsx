'use client';

import { KBarSearchProvider } from '@shipixen/pliny/search/KBar';

export const SearchProvider = ({ children }) => {
  // Navigation actions are registered by SearchProviderWrapper with community slug prefix.
  // Do NOT add defaultActions here — they lack the slug and cause duplicate 404 results.
  return (
    <KBarSearchProvider
      kbarConfig={{
        searchDocumentsPath: '',
        defaultActions: [],
      }}
    >
      {children}
    </KBarSearchProvider>
  );
};

export default SearchProvider;
