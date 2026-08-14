import { useState } from 'react';

export default function SearchBar({ onSearch, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      <input
        type="search"
        placeholder="Search documents..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn">Search</button>
      {query && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => { setQuery(''); onSearch(''); }}
        >
          Clear
        </button>
      )}
    </form>
  );
}
