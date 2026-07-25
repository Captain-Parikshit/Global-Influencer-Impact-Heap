import { Search, Filter, ChevronDown } from 'lucide-react';

/**
 * SearchFilter
 * Search bar + domain/sentiment filter dropdowns for the ranking table.
 */
export default function SearchFilter({
  searchQuery,
  onSearchChange,
  domainFilter,
  onDomainChange,
  sentimentFilter,
  onSentimentChange,
  domains = [],
}) {
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      {/* Search input */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none" />
        <input
          type="text"
          placeholder="Search influencers…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111111] py-[0.45rem] px-[0.7rem] pl-[2rem] rounded-[8px] text-[0.8rem] transition-all duration-200 focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[rgba(124,58,237,0.12)]"
        />
      </div>

      {/* Domain filter */}
      <div className="relative">
        <Filter size={12} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none" />
        <select
          value={domainFilter}
          onChange={e => onDomainChange(e.target.value)}
          className="appearance-none bg-[#f3f4f6] border border-[#e5e7eb] text-[#555555] py-[0.45rem] pl-[2rem] pr-[2rem] rounded-[8px] text-[0.78rem] font-medium cursor-pointer transition-all duration-200 focus:outline-none focus:border-[#7c3aed]"
        >
          <option value="All">All Domains</option>
          {domains.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none" />
      </div>

      {/* Sentiment filter */}
      <div className="relative">
        <select
          value={sentimentFilter}
          onChange={e => onSentimentChange(e.target.value)}
          className="appearance-none bg-[#f3f4f6] border border-[#e5e7eb] text-[#555555] py-[0.45rem] pl-[0.7rem] pr-[2rem] rounded-[8px] text-[0.78rem] font-medium cursor-pointer transition-all duration-200 focus:outline-none focus:border-[#7c3aed]"
        >
          <option value="All">All Sentiments</option>
          <option value="Positive">Positive</option>
          <option value="Negative">Negative</option>
          <option value="Mixed">Mixed</option>
        </select>
        <ChevronDown size={13} className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none" />
      </div>
    </div>
  );
}
