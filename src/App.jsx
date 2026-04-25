import { useState, useRef, useCallback, useEffect } from 'react';
import { MaxHeap } from './lib/MaxHeap';
import { getLLMScore, getEthicalAnalysis } from './lib/groqApi';
import { calculateSystemScore, calculateFinalScore } from './lib/rankingLogic';
import { fetchInfluencerProfile, formatFollowers, QuotaError } from './lib/socialApi';
import {
  Crown, TrendingUp, Users, Zap, Plus, Loader2,
  Sparkles, AlertTriangle, Star, BarChart3,
  Trophy, Eye, Brain, Shield, Flame, X,
  Search, Trash2
} from 'lucide-react';
import './App.css';

/* ── Platform SVG Icons ─────────────────────────────── */
const IGIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const XIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const YTIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const PlatformBadge = ({ platform, count }) => {
  const config = {
    instagram: { icon: <IGIcon size={12} />, cls: 'platform-ig' },
    x: { icon: <XIcon size={12} />, cls: 'platform-x' },
    youtube: { icon: <YTIcon size={12} />, cls: 'platform-yt' },
  };
  const c = config[platform];
  return (
    <span className={`platform-badge ${c.cls}`} title={`${platform}: ${formatFollowers(count)}`}>
      {c.icon} {formatFollowers(count)}
    </span>
  );
};

/* ── Seed Data ─────────────────────────────────────── */
// const SEED_INFLUENCERS = [
//   { name: 'Elon Musk', domain: 'Technology', sentiment: 'Positive', event: 'Launched affordable global satellite internet' },
//   { name: 'Malala Yousafzai', domain: 'Education', sentiment: 'Positive', event: 'Expanded girls education fund to 30 new countries' },
//   { name: 'Dr. Fauci', domain: 'Healthcare', sentiment: 'Neutral', event: 'Published landmark pandemic preparedness report' },
//   { name: 'Greta Thunberg', domain: 'Environment', sentiment: 'Positive', event: 'Led global climate summit for youth activists' },
//   { name: 'MrBeast', domain: 'Entertainment', sentiment: 'Positive', event: 'Built 100 wells across Sub-Saharan Africa' },
// ];

/* ── Helpers ─────────────────────────────────────────── */
const rankMedal = (rank) => {
  if (rank === 1) return <Crown size={18} className="medal gold" />;
  if (rank === 2) return <Trophy size={18} className="medal silver" />;
  if (rank === 3) return <Star size={18} className="medal bronze" />;
  return <span className="rank-num">{rank}</span>;
};

const domainIcon = (domain) => {
  const map = {
    Technology: <Zap size={13} />, Science: <Brain size={13} />,
    Education: <Sparkles size={13} />, Healthcare: <Shield size={13} />,
    Environment: <Flame size={13} />, Entertainment: <Star size={13} />,
    Sports: <Trophy size={13} />, Business: <BarChart3 size={13} />,
    Arts: <Sparkles size={13} />, Politics: <AlertTriangle size={13} />,
  };
  return map[domain] || <Zap size={13} />;
};

/* ── Main Component ──────────────────────────────────── */
function App() {
  const heapRef = useRef(new MaxHeap());

  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const seedingRef = useRef(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [ethicalData, setEthicalData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [quotaError, setQuotaError] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(0); // seconds left in auto-retry wait

  // form state
  const [formName, setFormName] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  const refreshRankings = useCallback(() => {
    setRankings(heapRef.current.getAll());
  }, []);

  /* add a single influencer to the heap */
  const addInfluencer = useCallback(async (inf) => {
    setLoading(true);
    try {
      let socials = inf.socials;
      let justification = inf.justification || null;
      let aiScores = inf.scores || null;

      if (!socials || !aiScores) {
        // Only fetch if we don't already have the data (should not happen with new flow)
        const profile = await fetchInfluencerProfile(inf.name);
        socials = profile.socials;
        justification = profile.justification;
        aiScores = profile.scores;
      }

      // No extra getLLMScore call — scores come from the single profile fetch

      const systemScore = calculateSystemScore(socials.total * 1_000_000, inf.sentiment);
      const finalScore = calculateFinalScore(aiScores.final_ai_score, systemScore);

      heapRef.current.insert({
        id: inf.name.toLowerCase().replace(/\s+/g, '-'),
        name: inf.name,
        domain: inf.domain,
        followers: socials.total,
        socials,
        sentiment: inf.sentiment,
        event: inf.event,
        justification,
        ...aiScores,
        systemScore: Math.round(systemScore),
        score: Math.round(finalScore),
        originalScore: Math.round(finalScore),
        addedAt: Date.now(),
      });

      refreshRankings();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [refreshRankings]);

  /* seed initial data */
  useEffect(() => {
    if (seedingRef.current) return;
    seedingRef.current = true;
    (async () => {
      setLoading(true);
      // for (const s of SEED_INFLUENCERS) {
      //   await addInfluencer(s);
      // }
      setLoading(false);
    })();
  }, [addInfluencer]);

  /* name input — just updates state, no auto-fetch */
  const handleNameChange = (newName) => {
    setFormName(newName);
    setProfileData(null);
    setQuotaError(null);
  };

  /* manual fetch triggered by button click */
  const handleFetchProfile = async () => {
    if (formName.trim().length < 2) return;
    setFetchingProfile(true);
    setProfileData(null);
    setQuotaError(null);
    setRetryCountdown(0);
    try {
      const data = await fetchInfluencerProfile(
        formName.trim(),
        (secondsLeft) => setRetryCountdown(secondsLeft) // live countdown during auto-retry
      );
      setProfileData(data);
      setRetryCountdown(0);
    } catch (e) {
      if (e instanceof QuotaError) {
        // Auto-retry also failed — show static error
        setQuotaError({ retryAfterSec: e.retryAfterSec });
      } else {
        console.error(e);
      }
    } finally {
      setFetchingProfile(false);
      setRetryCountdown(0);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !profileData) return;
    await addInfluencer({
      name: formName,
      domain: profileData.domain,
      sentiment: profileData.sentiment,
      event: profileData.event,
      socials: profileData.socials,
      justification: profileData.justification,
      scores: profileData.scores,   // use scores from single fetch — no 2nd API call
    });
    setFormName('');
    setProfileData(null);
    setShowForm(false);
  };

  const viewDetails = async (inf) => {
    setSelectedInfluencer(inf);
    const eth = await getEthicalAnalysis(inf.name, inf.domain);
    setEthicalData(eth);
  };

  const removeInfluencer = (inf) => {
    heapRef.current.remove(inf.id);
    if (selectedInfluencer?.id === inf.id) {
      setSelectedInfluencer(null);
      setEthicalData(null);
    }
    refreshRankings();
  };

  return (
    <div className="container animate-fade-in">
      {/* ── Header ──────────────────────────────── */}
      <header className="header">
        <div>
          <h1 className="app-title flex items-center gap-2">
            <Crown size={24} className="text-accent" /> Impact Heap
          </h1>
          <p className="text-secondary" style={{ marginTop: '0.2rem', fontSize: '0.85rem' }}>
            Rank influencers by long-term impact using Max-Heap ordering
          </p>
        </div>
        <button className="btn" id="add-influencer-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Close' : 'Add Influencer'}
        </button>
      </header>

      {/* ── Add Form ────────────────────────────── */}
      {showForm && (
        <div className="card mb-4 animate-slide-down" id="add-form">
          <h3 className="flex items-center gap-2 mb-3" style={{ fontSize: '1rem' }}>
            <Sparkles size={16} className="text-accent" /> New Influencer
          </h3>
          <form onSubmit={onSubmit} className="add-form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Influencer Name</label>
              <div className="input-with-status">
                <Search size={15} className="input-icon text-muted" />
                <input
                  className="input input-icon-padded"
                  id="input-name"
                  placeholder="e.g. Virat Kohli"
                  value={formName}
                  onChange={e => handleNameChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !fetchingProfile && formName.trim().length >= 2 && handleFetchProfile()}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Step 1: Fetch Data button — shown when name is long enough and no data yet */}
            {!profileData && !fetchingProfile && formName.trim().length >= 2 && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  className="btn w-full"
                  id="fetch-profile-btn"
                  onClick={handleFetchProfile}
                  disabled={fetchingProfile}
                >
                  <Search size={15} /> Fetch Profile Data
                </button>
              </div>
            )}
            {/* Quota error */}
            {quotaError && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <div className="follower-fetch-bar" style={{ borderColor: 'var(--danger, #ef4444)', background: 'rgba(239,68,68,0.08)' }}>
                  <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                    <strong>Groq quota exceeded.</strong> Wait ~{quotaError.retryAfterSec}s then try again, or{' '}
                    <a href="https://ai.dev/rate-limit" target="_blank" rel="noreferrer" style={{ color: '#ef4444' }}>upgrade your plan</a>.
                  </span>
                </div>
              </div>
            )}

            {/* Loading indicator — changes message during auto-retry countdown */}
            {fetchingProfile && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <div className="follower-fetch-bar" style={retryCountdown > 0 ? { borderColor: '#eab308', background: 'rgba(234,179,8,0.08)' } : {}}>
                  <Loader2 size={15} className="spin" style={{ color: retryCountdown > 0 ? '#eab308' : 'var(--accent)' }} />
                  <span className="text-secondary">
                    {retryCountdown > 0
                      ? `Rate limited — auto-retrying in ${retryCountdown}s…`
                      : 'Fetching profile from Groq…'}
                  </span>
                </div>
              </div>
            )}

            {/* Step 2: Profile preview — shown after successful fetch */}
            {profileData && (
              <>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div className="auto-profile-grid">
                    <div className="auto-profile-item">
                      <span className="form-label">Domain</span>
                      <span className="badge badge-blue flex items-center gap-2" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                        {domainIcon(profileData.domain)} {profileData.domain}
                      </span>
                    </div>
                    <div className="auto-profile-item">
                      <span className="form-label">Public Sentiment</span>
                      <span className={`badge ${profileData.sentiment === 'Positive' ? 'badge-green' : profileData.sentiment === 'Negative' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                        {profileData.sentiment}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <span className="form-label">Key Contribution</span>
                  <div className="auto-event-display">
                    <Sparkles size={14} className="text-accent" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{profileData.event}</span>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Platform Followers</label>
                  <div className="follower-platforms">
                    <div className="platform-card platform-ig-card">
                      <IGIcon size={18} />
                      <div>
                        <span className="platform-card-label">Instagram</span>
                        <span className="platform-card-value">{formatFollowers(profileData.socials.instagram)}</span>
                      </div>
                    </div>
                    <div className="platform-card platform-x-card">
                      <XIcon size={18} />
                      <div>
                        <span className="platform-card-label">X (Twitter)</span>
                        <span className="platform-card-value">{formatFollowers(profileData.socials.x)}</span>
                      </div>
                    </div>
                    <div className="platform-card platform-yt-card">
                      <YTIcon size={18} />
                      <div>
                        <span className="platform-card-label">YouTube</span>
                        <span className="platform-card-value">{formatFollowers(profileData.socials.youtube)}</span>
                      </div>
                    </div>
                    <div className="platform-card platform-total-card">
                      <Users size={18} />
                      <div>
                        <span className="platform-card-label">Total</span>
                        <span className="platform-card-value" style={{ color: 'var(--accent)' }}>{formatFollowers(profileData.socials.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* Step 3: Add to Heap button */}
            {profileData && (
              <div style={{ gridColumn: '1 / -1' }}>
                <button className="btn w-full" id="add-to-heap-btn" type="submit" disabled={loading}>
                  {loading ? <><Loader2 size={16} className="spin" /> Scoring…</> : <><Brain size={16} /> Add to Heap</>}
                </button>
              </div>
            )}

          </form>
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────── */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <Users size={20} />
          </div>
          <div>
            <div className="stat-label">Total Influencers</div>
            <div className="stat-value">{rankings.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-emerald">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="stat-label">Avg Impact Score</div>
            <div className="stat-value">
              {rankings.length > 0
                ? Math.round(rankings.reduce((s, r) => s + r.score, 0) / rankings.length)
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────── */}
      <div className="grid grid-cols-12">
        {/* Ranking Table */}
        <div className="col-span-8 card" id="ranking-panel">
          <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: '1rem' }}>
            <BarChart3 size={18} className="text-accent" /> Impact Rankings
          </h2>

          {loading && rankings.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={28} className="spin text-accent" />
              <p className="text-secondary" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Scoring influencers…</p>
            </div>
          ) : rankings.length === 0 ? (
            <div className="empty-rankings">
              <div className="empty-rankings-icon">
                <Crown size={32} />
              </div>
              <p className="empty-rankings-title">No influencers ranked yet</p>
              <p className="empty-rankings-sub">Click <strong>Add Influencer</strong> above to get started</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table" id="ranking-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Influencer</th>
                    <th>Domain</th>
                    <th>Impact Score</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((inf, i) => (
                    <tr key={inf.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="rank-cell">{rankMedal(i + 1)}</td>
                      <td>
                        <div className="influencer-name">{inf.name}</div>
                        <div className="influencer-followers-row">
                          {inf.socials && (
                            <>
                              <PlatformBadge platform="instagram" count={inf.socials.instagram} />
                              <PlatformBadge platform="x" count={inf.socials.x} />
                              <PlatformBadge platform="youtube" count={inf.socials.youtube} />
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue flex items-center gap-2">
                          {domainIcon(inf.domain)} {inf.domain}
                        </span>
                      </td>
                      <td>
                        <span className="impact-score">{inf.score}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => viewDetails(inf)} aria-label="View details">
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => removeInfluencer(inf)} aria-label="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Sidebar: Details Panel ──────────── */}
        <div className="col-span-4">
          {selectedInfluencer ? (
            <div className="card animate-slide-down" id="details-panel">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2" style={{ fontSize: '0.95rem' }}>
                  <Brain size={16} className="text-accent" /> Score Breakdown
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedInfluencer(null); setEthicalData(null); }}>
                  <X size={14} />
                </button>
              </div>

              <div className="detail-name">{selectedInfluencer.name}</div>
              <div className="badge badge-blue mb-2 flex items-center gap-2">{domainIcon(selectedInfluencer.domain)} {selectedInfluencer.domain}</div>

              {selectedInfluencer.socials && (
                <div className="detail-socials">
                  <PlatformBadge platform="instagram" count={selectedInfluencer.socials.instagram} />
                  <PlatformBadge platform="x" count={selectedInfluencer.socials.x} />
                  <PlatformBadge platform="youtube" count={selectedInfluencer.socials.youtube} />
                  <span className="platform-badge platform-total"><Users size={12} /> {formatFollowers(selectedInfluencer.socials.total)}</span>
                </div>
              )}

              <p className="text-secondary" style={{ fontSize: '0.82rem', marginBottom: '1rem', marginTop: '0.5rem' }}>{selectedInfluencer.event}</p>

              {/* Score dimensions */}
              {[
                { label: 'Knowledge', value: selectedInfluencer.knowledge_score, color: '#6366f1' },
                { label: 'Social Impact', value: selectedInfluencer.social_impact, color: '#3b82f6' },
                { label: 'Ethics', value: selectedInfluencer.ethical_score, color: '#22c55e' },
                { label: 'Longevity', value: selectedInfluencer.longevity_score, color: '#eab308' },
              ].map((dim) => (
                <div key={dim.label} className="score-dim">
                  <div className="flex items-center justify-between">
                    <span className="dim-label">{dim.label}</span>
                    <span className="dim-value">{dim.value}</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${dim.value}%`, background: dim.color }} />
                  </div>
                </div>
              ))}

              <div className="detail-divider" />
              <div className="flex items-center justify-between">
                <span className="text-secondary" style={{ fontSize: '0.82rem' }}>Impact Score</span>
                <span className="impact-score" style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>{selectedInfluencer.score}</span>
              </div>

              {/* LLM Justification Table */}
              {selectedInfluencer.justification && (
                <>
                  <div className="detail-divider" />
                  <h4 className="flex items-center gap-2 mb-2" style={{ fontSize: '0.85rem' }}>
                    <Brain size={14} className="text-accent" /> Groq Justification
                  </h4>
                  <div className="llm-table-wrapper">
                    <table className="llm-table">
                      <thead>
                        <tr>
                          <th>Dimension</th>
                          <th>AI Reasoning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { dim: 'Knowledge', key: 'knowledge', color: '#6366f1' },
                          { dim: 'Social Impact', key: 'social_impact', color: '#3b82f6' },
                          { dim: 'Ethics', key: 'ethics', color: '#22c55e' },
                          { dim: 'Longevity', key: 'longevity', color: '#eab308' },
                        ].map(({ dim, key, color }) => (
                          <tr key={key}>
                            <td>
                              <span className="llm-dim-label" style={{ borderLeft: `3px solid ${color}` }}>{dim}</span>
                            </td>
                            <td className="llm-reasoning">{selectedInfluencer.justification[key]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="llm-overall">
                    <Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    {selectedInfluencer.justification.overall}
                  </p>
                </>
              )}

              {/* Ethical analysis */}
              {ethicalData && (
                <>
                  <div className="detail-divider" />
                  <h4 className="flex items-center gap-2 mb-2" style={{ fontSize: '0.85rem' }}>
                    <Shield size={14} className="text-accent" /> Ethical Analysis
                  </h4>
                  <p className="text-secondary" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>{ethicalData.impact_summary}</p>
                  <div className="trait-group">
                    {ethicalData.positive_traits.map((t) => (
                      <span key={t} className="badge badge-green">{t}</span>
                    ))}
                    {ethicalData.negative_traits.map((t) => (
                      <span key={t} className="badge badge-red">{t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card empty-details" id="details-panel-empty">
              <Eye size={28} className="text-muted" />
              <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Select an influencer to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="footer">
        <p className="text-muted" style={{ fontSize: '0.78rem' }}>
          Built with <span className="text-accent">Max-Heap</span> data structure & AI scoring — DS/CP Project
        </p>
      </footer>
    </div>
  );
}

export default App;
