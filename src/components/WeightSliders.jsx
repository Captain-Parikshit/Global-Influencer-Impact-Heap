import { RotateCcw, Sliders } from 'lucide-react';

/**
 * WeightSliders
 * 4 range sliders for custom scoring weights.
 * Weights auto-normalize to sum to 100.
 */
export default function WeightSliders({ weights, onWeightsChange, isOpen, onToggle }) {
  const dimensions = [
    { key: 'knowledge', label: 'Knowledge',     color: '#7c3aed' },
    { key: 'social',    label: 'Social Impact',  color: '#0ea5e9' },
    { key: 'ethics',    label: 'Ethics',         color: '#16a34a' },
    { key: 'longevity', label: 'Longevity',      color: '#d97706' },
  ];

  const handleSliderChange = (key, rawValue) => {
    const newWeights = { ...weights, [key]: rawValue };
    // Normalize: distribute remainder proportionally among other keys
    const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
    if (total !== 100) {
      const otherKeys = Object.keys(newWeights).filter(k => k !== key);
      const otherTotal = otherKeys.reduce((s, k) => s + newWeights[k], 0);
      const remainder = 100 - rawValue;
      otherKeys.forEach(k => {
        newWeights[k] = otherTotal > 0
          ? Math.round((newWeights[k] / otherTotal) * remainder)
          : Math.round(remainder / otherKeys.length);
      });
      // Fix rounding errors
      const finalTotal = Object.values(newWeights).reduce((s, v) => s + v, 0);
      if (finalTotal !== 100) {
        const diff = 100 - finalTotal;
        const adjustKey = otherKeys[0];
        newWeights[adjustKey] += diff;
      }
    }
    onWeightsChange(newWeights);
  };

  const resetWeights = () => {
    onWeightsChange({ knowledge: 25, social: 25, ethics: 25, longevity: 25 });
  };

  const isDefault = weights.knowledge === 25 && weights.social === 25 &&
                    weights.ethics === 25 && weights.longevity === 25;

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 text-[0.78rem] font-semibold text-[#555555] hover:text-[#7c3aed] transition-colors duration-200 mb-2 cursor-pointer bg-transparent border-none p-0"
      >
        <Sliders size={14} />
        Custom Weights
        {!isDefault && <span className="text-[0.65rem] text-[#7c3aed] font-bold ml-1">Modified</span>}
      </button>

      {isOpen && (
        <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em]">
              Dimension Weights (must sum to 100%)
            </span>
            <button
              onClick={resetWeights}
              disabled={isDefault}
              className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-[#999999] hover:text-[#7c3aed] transition-colors duration-200 cursor-pointer bg-transparent border-none p-0 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {dimensions.map(dim => (
              <div key={dim.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-semibold text-[#555555]">{dim.label}</span>
                  <span className="text-[0.75rem] font-bold" style={{ color: dim.color }}>{weights[dim.key]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="70"
                  value={weights[dim.key]}
                  onChange={e => handleSliderChange(dim.key, Number(e.target.value))}
                  className="weight-slider"
                  style={{ '--slider-color': dim.color }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
