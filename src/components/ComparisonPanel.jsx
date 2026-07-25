import { X, Trophy, Users } from 'lucide-react';
import { formatFollowers } from '../lib/socialApi';

/**
 * ComparisonPanel
 * Side-by-side comparison of 2-3 influencers with bar charts.
 */
export default function ComparisonPanel({ influencers = [], onClose, onRemove }) {
  if (influencers.length < 2) return null;

  const dimensions = [
    { key: 'knowledge_score', label: 'Knowledge',     color: '#7c3aed' },
    { key: 'social_impact',   label: 'Social Impact',  color: '#0ea5e9' },
    { key: 'ethical_score',   label: 'Ethics',         color: '#16a34a' },
    { key: 'longevity_score', label: 'Longevity',      color: '#d97706' },
  ];

  const colors = ['#7c3aed', '#0ea5e9', '#d97706'];

  // Find winner per dimension
  const getWinner = (key) => {
    let max = -1, winnerId = null;
    influencers.forEach(inf => {
      if ((inf[key] || 0) > max) { max = inf[key] || 0; winnerId = inf.id; }
    });
    return winnerId;
  };

  // Max score for bar scaling
  const maxScore = Math.max(...influencers.flatMap(inf => dimensions.map(d => inf[d.key] || 0)), 1);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-6 transition-all duration-200 relative overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-[#111111] text-[0.95rem] font-bold">
          <Trophy size={16} style={{ color: '#7c3aed' }} /> Comparison Mode
          <span className="text-[0.72rem] text-[#999999] font-normal">({influencers.length} influencers)</span>
        </h3>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center bg-white border border-[#e5e7eb] text-[#555555] py-[0.38rem] px-[0.55rem] rounded-[6px] cursor-pointer transition-all duration-200 hover:bg-[#f3f4f6]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Influencer headers */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${influencers.length}, 1fr)` }}>
        {influencers.map((inf, i) => (
          <div key={inf.id} className="text-center p-3 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] relative">
            <button
              onClick={() => onRemove(inf.id)}
              className="absolute top-2 right-2 text-[#999999] hover:text-[#dc2626] bg-transparent border-none cursor-pointer p-0"
              title="Remove from comparison"
            >
              <X size={12} />
            </button>
            <div className="w-[36px] h-[36px] rounded-full mx-auto mb-2 flex items-center justify-center text-white text-[0.8rem] font-bold" style={{ background: colors[i] }}>
              {inf.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="font-bold text-[0.85rem] text-[#111111] truncate">{inf.name}</div>
            <div className="text-[0.7rem] text-[#999999] mt-0.5">{inf.domain}</div>
            <div className="flex items-center justify-center gap-1 mt-1 text-[0.7rem] text-[#555555]">
              <Users size={10} /> {inf.socials ? formatFollowers(inf.socials.total) : '—'}
            </div>
            <div className="text-[1.3rem] font-extrabold mt-2" style={{ color: colors[i] }}>{inf.score}</div>
          </div>
        ))}
      </div>

      {/* Dimension comparison bars */}
      <div className="space-y-4">
        {dimensions.map(dim => {
          const winnerId = getWinner(dim.key);
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.78rem] font-semibold text-[#555555]">{dim.label}</span>
                <div className="w-[8px] h-[8px] rounded-full" style={{ background: dim.color }} />
              </div>
              <div className="space-y-1.5">
                {influencers.map((inf, i) => {
                  const val = inf[dim.key] || 0;
                  const isWinner = inf.id === winnerId;
                  return (
                    <div key={inf.id} className="flex items-center gap-2">
                      <span className="text-[0.68rem] font-semibold w-[60px] truncate" style={{ color: colors[i] }}>
                        {inf.name?.split(' ')[0]}
                      </span>
                      <div className="flex-1 h-[6px] bg-[#e5e7eb] rounded-[3px] overflow-hidden">
                        <div
                          className="h-full rounded-[3px] transition-all duration-500"
                          style={{
                            width: `${(val / maxScore) * 100}%`,
                            background: colors[i],
                            opacity: isWinner ? 1 : 0.5,
                          }}
                        />
                      </div>
                      <span className={`text-[0.75rem] font-bold w-[28px] text-right ${isWinner ? '' : 'text-[#999999]'}`} style={isWinner ? { color: colors[i] } : {}}>
                        {val}
                      </span>
                      {isWinner && <Trophy size={10} style={{ color: '#d97706' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall winner */}
      <div className="mt-5 pt-4 border-t border-[#e5e7eb]">
        <div className="flex items-center justify-between">
          <span className="text-[0.82rem] font-semibold text-[#555555]">Overall Score</span>
          <div className="flex items-center gap-4">
            {influencers.map((inf, i) => (
              <span key={inf.id} className="text-[1.1rem] font-extrabold" style={{ color: colors[i] }}>
                {inf.score}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
