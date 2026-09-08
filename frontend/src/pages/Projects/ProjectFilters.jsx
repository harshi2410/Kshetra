import React from 'react';
import { Search, RotateCcw, X, SlidersHorizontal } from 'lucide-react';

export default function ProjectFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  cityFilter,
  setCityFilter,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy,
  citiesList = [],
  onReset
}) {
  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL' || cityFilter !== 'ALL' || typeFilter !== 'ALL' || sortBy !== 'newest';

  const selectStyle = {
    height: '36px',
    padding: '0 10px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: 'var(--df-input-bg)',
    color: 'var(--df-text)',
    border: '1px solid var(--df-border-input)',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: 'var(--df-card-bg)',
      flexWrap: 'wrap',
    }}>
      {/* Search Bar */}
      <div style={{ flex: '1 1 260px', minWidth: '220px', position: 'relative' }}>
        <Search style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          width: '15px', height: '15px', color: 'var(--df-text-muted)', pointerEvents: 'none'
        }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, location, developer…"
          style={{
            width: '100%', height: '36px',
            padding: '0 32px 0 34px',
            border: '1px solid var(--df-border-input)',
            borderRadius: '8px',
            fontSize: '13px',
            backgroundColor: 'var(--df-input-bg)',
            color: 'var(--df-text)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: 0
            }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <SlidersHorizontal style={{ width: '13px', height: '13px' }} /> Filters:
        </div>

        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Upcoming">Upcoming</option>
        </select>

        <select style={selectStyle} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
          <option value="ALL">All Cities</option>
          {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select style={selectStyle} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="ALL">All Project Types</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="Mixed Use">Mixed Use</option>
        </select>

        <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="revenue">Sort: Highest Revenue</option>
          <option value="alphabetical">Sort: Alphabetical (A-Z)</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              height: '36px', padding: '0 12px', borderRadius: '8px',
              border: '1px solid var(--df-border)', background: 'transparent',
              fontSize: '12px', fontWeight: 700, color: 'var(--df-accent)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw style={{ width: '13px', height: '13px' }} /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
