import ThreeBackground from './ThreeBackground.jsx';

/**
 * SkeletonScreen
 * Full-page loading skeleton that mirrors the app layout.
 * Light theme: gray shimmer placeholders on white cards.
 */
export default function SkeletonScreen() {
  return (
    <>
      <ThreeBackground nodeCount={40} />
      <div className="max-w-[1340px] mx-auto px-8 py-12 animate-fade-in relative z-10">

        {/* ── Header skeleton ───────────────────────── */}
        <div className="flex justify-between items-center mb-8 px-7 py-4 bg-white border border-[#e5e7eb] rounded-[14px]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex flex-col gap-[0.3rem]">
            <div className="sk-bar w-[180px] h-[28px] rounded-md animate-shimmer" />
            <div className="sk-bar w-[260px] h-[14px] rounded-md mt-2 animate-shimmer" />
          </div>
          <div className="flex items-center gap-3">
            <div className="sk-pill h-[34px] w-[96px] rounded-md animate-shimmer" />
            <div className="sk-pill h-[34px] w-[96px] rounded-md animate-shimmer" />
            <div className="sk-pill h-[34px] w-[130px] rounded-md animate-shimmer" />
            <div className="sk-avatar w-8 h-8 rounded-full animate-shimmer" />
          </div>
        </div>

        {/* ── Stat cards skeleton ───────────────────── */}
        <div className="grid grid-cols-2 gap-5 mb-7">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-[1.1rem] p-[1.4rem_1.6rem] bg-white border border-[#e5e7eb] rounded-[14px] cursor-default pointer-events-none" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="sk-icon-box w-[48px] h-[48px] rounded-[12px] shrink-0 animate-shimmer" />
              <div style={{ flex: 1 }}>
                <div className="sk-bar w-[110px] h-[11px] rounded-md animate-shimmer" />
                <div className="sk-bar w-[60px] h-[30px] rounded-md mt-2 animate-shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Main grid skeleton ────────────────────── */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left — Rankings panel */}
          <div className="col-span-12 lg:col-span-5 bg-white border border-[#e5e7eb] rounded-[14px] p-6 pointer-events-none" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="sk-bar w-[55%] h-[18px] rounded-md mb-6 animate-shimmer" />
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-[0.85rem] py-[0.85rem] border-b border-[#e5e7eb] last:border-none animate-fade-in opacity-0" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="sk-circle w-[34px] h-[34px] rounded-full shrink-0 animate-shimmer" />
                <div style={{ flex: 1 }}>
                  <div className="sk-bar w-[85%] h-[13px] rounded-md animate-shimmer" />
                  <div className="sk-bar w-[65%] h-[10px] rounded-md mt-[0.35rem] animate-shimmer" />
                </div>
                <div className="sk-bar w-[38px] h-[22px] rounded-md shrink-0 animate-shimmer" />
              </div>
            ))}
          </div>

          {/* Right — Detail panel (empty placeholder) */}
          <div className="col-span-12 lg:col-span-7 bg-white border border-[#e5e7eb] rounded-[14px] p-6 flex flex-col pointer-events-none" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="sk-bar w-[45%] h-[18px] rounded-md mb-5 animate-shimmer" />
            <div className="sk-bar w-[55%] h-[26px] rounded-md animate-shimmer" />
            <div className="sk-bar h-[20px] rounded-[20px] mt-2 w-[22%] animate-shimmer" />
            <div className="sk-bar h-[12px] rounded-md mt-4 w-[90%] animate-shimmer" />
            <div className="sk-bar h-[12px] rounded-md mt-[0.4rem] w-[70%] animate-shimmer" />

            {/* Fake score rings grid */}
            <div className="grid grid-cols-4 gap-[1rem] mt-[1.5rem]">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-[0.4rem] p-[0.75rem] bg-[#f9fafb] border border-[#e5e7eb] rounded-[12px]">
                  <div className="sk-ring-circle w-[68px] h-[68px] rounded-full animate-shimmer" />
                  <div className="sk-bar w-[55px] h-[10px] rounded-md animate-shimmer" />
                </div>
              ))}
            </div>

            {/* Fake progress bars */}
            <div style={{ marginTop: '1.5rem' }}>
              {[80, 65, 55, 72].map((w, i) => (
                <div key={i} className="mb-[0.85rem] animate-fade-in opacity-0" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="sk-bar w-[80px] h-[11px] rounded-md mb-2 animate-shimmer" />
                  <div className="w-full h-[5px] bg-[#e5e7eb] rounded-[3px] overflow-hidden">
                    <div className="sk-progress-fill h-full rounded-[3px] animate-shimmer" style={{ width: `${w}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
