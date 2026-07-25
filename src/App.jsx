import { useState, useRef, useCallback, useEffect } from 'react';
import { MaxHeap } from './lib/MaxHeap';
import { getLLMScore, getEthicalAnalysis, getPlatformAnalysis } from './lib/groqApi';
import { calculateSystemScore, calculateFinalScore } from './lib/rankingLogic';
import { fetchInfluencerProfile, formatFollowers, QuotaError } from './lib/socialApi';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase.js';
import { loadHeap, saveHeap, clearHeap } from './lib/firestoreApi.js';
import LoginPage from './components/LoginPage.jsx';

import SkeletonScreen from './components/SkeletonScreen.jsx';
import RollingNumber from './components/RollingNumber.jsx';
import SearchFilter from './components/SearchFilter.jsx';
import WeightSliders from './components/WeightSliders.jsx';
import HeapVisualizer from './components/HeapVisualizer.jsx';
import ComparisonPanel from './components/ComparisonPanel.jsx';
import { useGsapAnimations } from './lib/useGsapAnimations.js';
import gsap from 'gsap';
import {
  Crown, TrendingUp, Users, Zap, Plus, Loader2,
  Sparkles, AlertTriangle, Star, BarChart3,
  Trophy, Eye, Brain, Shield, Flame, X,
  Search, Trash2, Download, LogOut, GitBranch
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    x:         { icon: <XIcon size={12} />, cls: 'platform-x' },
    youtube:   { icon: <YTIcon size={12} />, cls: 'platform-yt' },
  };
  const c = config[platform];
  return (
    <span className={`platform-badge ${c.cls}`} title={`${platform}: ${formatFollowers(count)}`}>
      {c.icon} {formatFollowers(count)}
    </span>
  );
};

/* ── Score Ring SVG Component ───────────────────────── */
function ScoreRing({ value = 0, color = '#7c3aed', size = 70, label = '' }) {
  const circleRef = useRef(null);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!circleRef.current) return;
    const target = circumference - (value / 100) * circumference;
    gsap.fromTo(
      circleRef.current,
      { strokeDashoffset: circumference },
      { strokeDashoffset: target, duration: 1.1, ease: 'power2.out', delay: 0.1 }
    );
  }, [value, circumference]);

  return (
    <div className="flex flex-col items-center justify-center p-[1rem] bg-[#f9fafb] border border-[#e5e7eb] rounded-[12px]">
      <svg width={size} height={size} viewBox="0 0 70 70" className="score-ring-svg">
        <circle cx="35" cy="35" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          ref={circleRef}
          cx="35" cy="35" r={radius}
          className="score-ring-fill"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ transformOrigin: '35px 35px', transform: 'rotate(-90deg)' }}
        />
        <text x="35" y="32" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 14, fill: '#111111', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
          {value}
        </text>
        <text x="35" y="47" textAnchor="middle" style={{ fontSize: 8, fill: '#999999', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
          {label}
        </text>
      </svg>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */
const rankMedal = (rank) => {
  if (rank === 1) return <Crown size={18} className="medal gold" />;
  if (rank === 2) return <Trophy size={18} className="medal silver" />;
  if (rank === 3) return <Star size={18} className="medal bronze" />;
  return <span className="rank-num">{rank}</span>;
};

const domainIcon = (domain) => {
  const map = {
    Technology:   <Zap size={13} />,    Science:      <Brain size={13} />,
    Education:    <Sparkles size={13} />, Healthcare: <Shield size={13} />,
    Environment:  <Flame size={13} />,  Entertainment: <Star size={13} />,
    Sports:       <Trophy size={13} />, Business:     <BarChart3 size={13} />,
    Arts:         <Sparkles size={13} />, Politics:   <AlertTriangle size={13} />,
  };
  return map[domain] || <Zap size={13} />;
};

/* ── Main Component ──────────────────────────────────── */
function App() {
  const heapRef    = useRef(new MaxHeap());
  const [user, setUser]         = useState(undefined);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const seedingRef = useRef(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [ethicalData, setEthicalData]   = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [quotaError, setQuotaError]     = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [formName, setFormName]         = useState('');
  const [profileData, setProfileData]   = useState(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  // 4 Features States
  const [searchQuery, setSearchQuery]         = useState('');
  const [domainFilter, setDomainFilter]       = useState('All');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [weights, setWeights]                 = useState({ knowledge: 25, social: 25, ethics: 25, longevity: 25 });
  const [showWeightSliders, setShowWeightSliders] = useState(false);
  const [showHeapViz, setShowHeapViz]         = useState(false);
  const [compareList, setCompareList]         = useState([]);

  // Recalculate scores based on custom dimension weights
  const applyCustomWeights = useCallback((currentWeights) => {
    const all = heapRef.current.heap;
    if (!all || all.length === 0) return;

    all.forEach(inf => {
      const k = inf.knowledge_score ?? 50;
      const s = inf.social_impact ?? 50;
      const e = inf.ethical_score ?? 50;
      const l = inf.longevity_score ?? 50;
      const aiScore = (k * currentWeights.knowledge + s * currentWeights.social + e * currentWeights.ethics + l * currentWeights.longevity) / 100;
      const sysScore = inf.systemScore ?? 50;
      const newScore = Math.round(calculateFinalScore(aiScore, sysScore));
      heapRef.current.updateKey(inf.id, newScore, { score: newScore });
    });
    setRankings(heapRef.current.getAll());
  }, []);

  const handleWeightsChange = (newWeights) => {
    setWeights(newWeights);
    applyCustomWeights(newWeights);
  };

  const toggleCompare = (id, e) => {
    e?.stopPropagation();
    setCompareList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  // Splitter state
  const [splitPercent, setSplitPercent] = useState(40);
  const isDragging = useRef(false);
  const splitContainerRef = useRef(null);

  const onSplitterMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => {
      if (!isDragging.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.min(70, Math.max(25, (x / rect.width) * 100));
      setSplitPercent(pct);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Row refs for GSAP animate-in
  const rowRefs = useRef({});
  const formContainerRef = useRef(null);
  const detailPanelRef   = useRef(null);
  const scoreBarsRef     = useRef(null);

  const {
    headerRef, statCardsRef, rankPanelRef,
    animateNewRow, animateDetailIn, animateScoreBars, attachTilt,
  } = useGsapAnimations();

  /* ── Tilt on stat cards ──────────────────────────── */
  useEffect(() => {
    if (!statCardsRef.current) return;
    const cleanups = Array.from(statCardsRef.current.children).map(attachTilt);
    return () => cleanups.forEach(fn => fn && fn());
  }, [attachTilt]);

  /* ── Auth listener ───────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser) {
        if (!seedingRef.current) {
          seedingRef.current = true;
          const saved = await loadHeap(firebaseUser.uid);
          heapRef.current = new MaxHeap();
          saved.forEach(inf => heapRef.current.insert(inf));
          setRankings(heapRef.current.getAll());
        }
      } else {
        heapRef.current = new MaxHeap();
        setRankings([]);
        seedingRef.current = false;
      }
    });
    return () => unsub();
  }, []);

  /* ── Animate new rows ────────────────────────────── */
  useEffect(() => {
    if (rankings.length === 0) return;
    const latestId = rankings[0]?.id;
    const el = rowRefs.current[latestId];
    if (el) animateNewRow(el);
  }, [rankings.length]);

  /* ── Animate detail panel ────────────────────────── */
  useEffect(() => {
    if (selectedInfluencer && detailPanelRef.current) {
      animateDetailIn(detailPanelRef.current);
    }
  }, [selectedInfluencer]);

  /* ── Animate score bars ──────────────────────────── */
  useEffect(() => {
    if (selectedInfluencer && scoreBarsRef.current) {
      animateScoreBars(scoreBarsRef.current);
    }
  }, [selectedInfluencer]);

  const handleLogout = async () => {
    await signOut(auth);
    seedingRef.current = false;
  };

  const refreshRankings = useCallback(async () => {
    const newRankings = heapRef.current.getAll();
    setRankings(newRankings);
    const currentUser = auth.currentUser;
    if (currentUser) await saveHeap(currentUser.uid, newRankings);
  }, []);

  const addInfluencer = useCallback(async (inf) => {
    setLoading(true);
    try {
      let socials      = inf.socials;
      let justification = inf.justification || null;
      let aiScores     = inf.scores || null;

      if (!socials || !aiScores) {
        const profile = await fetchInfluencerProfile(inf.name);
        socials       = profile.socials;
        justification = profile.justification;
        aiScores      = profile.scores;
      }

      const systemScore = calculateSystemScore(socials.total * 1_000_000, inf.sentiment);
      const finalScore  = calculateFinalScore(aiScores.final_ai_score, systemScore);

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
        systemScore:   Math.round(systemScore),
        score:         Math.round(finalScore),
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

  const clearAll = async () => {
    if (window.confirm('Are you sure you want to remove all influencers? This cannot be undone.')) {
      heapRef.current.clear();
      setSelectedInfluencer(null);
      setEthicalData(null);
      setRankings([]);
      const currentUser = auth.currentUser;
      if (currentUser) await clearHeap(currentUser.uid);
    }
  };

  const handleNameChange = (newName) => {
    setFormName(newName);
    setProfileData(null);
    setQuotaError(null);
  };

  const handleFetchProfile = async () => {
    if (formName.trim().length < 2) return;
    setFetchingProfile(true);
    setProfileData(null);
    setQuotaError(null);
    setRetryCountdown(0);
    try {
      const data = await fetchInfluencerProfile(
        formName.trim(),
        (secondsLeft) => setRetryCountdown(secondsLeft)
      );
      setProfileData(data);
      setRetryCountdown(0);
    } catch (e) {
      if (e instanceof QuotaError) {
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
      name:     formName,
      domain:   profileData.domain,
      sentiment: profileData.sentiment,
      event:    profileData.event,
      socials:  profileData.socials,
      justification: profileData.justification,
      scores:   profileData.scores,
    });
    setFormName('');
    setProfileData(null);
    setShowForm(false);
  };

  const viewDetails = async (inf) => {
    setSelectedInfluencer(inf);
    setEthicalData(null);
    const eth = await getEthicalAnalysis(inf.name, inf.domain);
    setEthicalData(eth);
  };

  const removeInfluencer = (inf) => {
    if (window.confirm(`Are you sure you want to remove ${inf.name}?`)) {
      heapRef.current.remove(inf.id);
      if (selectedInfluencer?.id === inf.id) {
        setSelectedInfluencer(null);
        setEthicalData(null);
      }
      refreshRankings();
    }
  };

  /* ── Form open/close with GSAP ───────────────────── */
  const toggleForm = () => {
    if (showForm) {
      if (formContainerRef.current) {
        gsap.to(formContainerRef.current, {
          height: 0, opacity: 0, y: -10, overflow: 'hidden',
          duration: 0.3, ease: 'power2.in',
          onComplete: () => setShowForm(false),
        });
      } else {
        setShowForm(false);
      }
    } else {
      setShowForm(true);
    }
  };

  /* Animate form in when it appears */
  useEffect(() => {
    if (showForm && formContainerRef.current) {
      gsap.fromTo(formContainerRef.current,
        { height: 0, opacity: 0, y: -14, overflow: 'hidden' },
        { height: 'auto', opacity: 1, y: 0, duration: 0.42, ease: 'power2.out',
          onComplete: () => gsap.set(formContainerRef.current, { overflow: 'visible' }) }
      );
    }
  }, [showForm]);

  /* ── PDF export (unchanged logic) ───────────────── */
  const downloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF('landscape');
      const ACCENT = [124, 58, 237];
      const DARK   = [17, 17, 17];
      const MID    = [85, 85, 85];
      const GREEN  = [22, 163, 74];
      const RED    = [220, 38, 38];
      const GOLD   = [217, 119, 6];

      const section = (doc, label, y) => {
        doc.setFontSize(13);
        doc.setTextColor(...ACCENT);
        doc.text(label, 14, y);
        doc.setDrawColor(...ACCENT);
        doc.line(14, y + 1.5, 283, y + 1.5);
        return y + 8;
      };

      const wrappedText = (doc, text, x, y, maxW, fontSize = 9, color = MID) => {
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(String(text || ''), maxW);
        doc.text(lines, x, y);
        return y + lines.length * (fontSize * 0.45);
      };

      doc.setFillColor(250, 250, 250);
      doc.rect(0, 0, 297, 28, 'F');
      doc.setFontSize(20);
      doc.setTextColor(...DARK);
      doc.text('Global Influencer Impact Rankings', 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(...MID);
      doc.text(`Generated: ${new Date().toLocaleString()}  |  ${rankings.length} Influencer(s) Ranked`, 14, 24);

      autoTable(doc, {
        head: [['Rank', 'Name', 'Domain', 'IG (M)', 'X (M)', 'YT (M)', 'Total', 'Sentiment', 'Score', 'Overall AI Justification']],
        body: rankings.map((inf, i) => [
          i + 1, inf.name, inf.domain,
          Number(inf.socials.instagram).toFixed(1),
          Number(inf.socials.x).toFixed(1),
          Number(inf.socials.youtube).toFixed(1),
          formatFollowers(inf.socials.total),
          inf.sentiment,
          inf.score,
          inf.justification?.overall || 'N/A'
        ]),
        startY: 33,
        theme: 'grid',
        headStyles: { fillColor: ACCENT, fontSize: 9, fontStyle: 'bold' },
        styles: { cellPadding: 2.5, fontSize: 8.5, overflow: 'linebreak' },
        columnStyles: { 9: { cellWidth: 100 } }
      });

      for (let idx = 0; idx < rankings.length; idx++) {
        const inf = rankings[idx];
        const [platData, ethData] = await Promise.all([
          getPlatformAnalysis(inf.name, inf.domain, inf.socials),
          getEthicalAnalysis(inf.name, inf.domain)
        ]);

        doc.addPage();
        doc.setFillColor(250, 250, 250);
        doc.rect(0, 0, 297, 32, 'F');
        doc.setFontSize(20);
        doc.setTextColor(...DARK);
        doc.text(inf.name, 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(...MID);
        doc.text(
          `${inf.domain}  |  Total Followers: ${formatFollowers(inf.socials.total)}  |  Sentiment: ${inf.sentiment}  |  Impact Score: ${inf.score}`,
          14, 24
        );

        let y = 40;
        y = wrappedText(doc, `Key Contribution: ${inf.event}`, 14, y, 265, 9.5, MID);
        y += 6;

        y = section(doc, 'Score Breakdown  (Final AI Score = avg of 4 dimensions, each worth 25%)', y);
        const kScore = inf.knowledge_score, siScore = inf.social_impact;
        const eScore = inf.ethical_score,   lScore  = inf.longevity_score;
        autoTable(doc, {
          head: [['Metric', 'Raw Score (0–100)', 'Weight', 'Contribution to Final Score']],
          body: [
            ['Knowledge',     kScore,  '25%', `${kScore} × 0.25 = ${(kScore * 0.25).toFixed(2)} pts`],
            ['Social Impact', siScore, '25%', `${siScore} × 0.25 = ${(siScore * 0.25).toFixed(2)} pts`],
            ['Ethics',        eScore,  '25%', `${eScore} × 0.25 = ${(eScore * 0.25).toFixed(2)} pts`],
            ['Longevity',     lScore,  '25%', `${lScore} × 0.25 = ${(lScore * 0.25).toFixed(2)} pts`],
            ['Final AI Score', inf.score, '100%',
              `(${kScore} + ${siScore} + ${eScore} + ${lScore}) ÷ 4 = ${inf.score}`]
          ],
          startY: y, theme: 'striped',
          headStyles: { fillColor: ACCENT, fontSize: 9 },
          styles: { cellPadding: 2.5, fontSize: 9 },
          columnStyles: {
            1: { halign: 'center', fontStyle: 'bold' },
            2: { halign: 'center', textColor: MID },
            3: { textColor: [30, 41, 59] }
          }
        });
        y = doc.lastAutoTable.finalY + 10;

        if (inf.justification) {
          y = section(doc, 'Groq AI Justification (Score Dimensions)', y);
          autoTable(doc, {
            head: [['Dimension', 'AI Reasoning']],
            body: [
              ['Knowledge',     inf.justification.knowledge],
              ['Social Impact', inf.justification.social_impact],
              ['Ethics',        inf.justification.ethics],
              ['Longevity',     inf.justification.longevity]
            ],
            startY: y, theme: 'grid',
            headStyles: { fillColor: ACCENT, fontSize: 9 },
            styles: { cellPadding: 3, fontSize: 9, overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } }
          });
          y = doc.lastAutoTable.finalY + 5;
          y = wrappedText(doc, inf.justification.overall, 14, y, 265, 9, MID);
          y += 10;
        }

        if (ethData) {
          y = section(doc, 'Ethical Analysis', y);
          y = wrappedText(doc, ethData.impact_summary, 14, y, 265, 9, MID);
          y += 5;
          doc.setFontSize(9); doc.setTextColor(...GREEN);
          doc.text(`✔ Positive Traits: ${ethData.positive_traits.join(' | ')}`, 14, y);
          y += 6;
          doc.setTextColor(...RED);
          doc.text(`✘ Negative Traits: ${ethData.negative_traits.join(' | ')}`, 14, y);
          y += 12;
        }

        doc.addPage();
        doc.setFillColor(250, 250, 250);
        doc.rect(0, 0, 297, 28, 'F');
        doc.setFontSize(18);
        doc.setTextColor(...DARK);
        doc.text(`${inf.name} — Platform Impact Analysis`, 14, 18);
        y = 38;

        if (platData) {
          y = section(doc, 'Social Media Influence Breakdown', y);
          autoTable(doc, {
            head: [['Platform', 'Followers (M)', 'Engagement Rate', 'Sentiment (-1 to +1)', 'Impact Score (0-100)', 'Key Audience', 'LLM Justification']],
            body: (platData.platforms || []).map(p => [
              p.platform, p.followers_m, p.engagement_rate,
              p.sentiment_score?.toFixed(2), p.impact_score,
              p.key_audience, p.llm_justification
            ]),
            startY: y, theme: 'grid',
            headStyles: { fillColor: ACCENT, fontSize: 8.5, fontStyle: 'bold' },
            styles: { cellPadding: 2.5, fontSize: 8.5, overflow: 'linebreak' },
            columnStyles: {
              0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 22, halign: 'center' },
              2: { cellWidth: 25, halign: 'center' },  3: { cellWidth: 28, halign: 'center' },
              4: { cellWidth: 25, halign: 'center' },  5: { cellWidth: 40 }, 6: { cellWidth: 'auto' }
            }
          });
          y = doc.lastAutoTable.finalY + 10;

          if (platData.sentiment_drivers) {
            y = section(doc, 'Sentiment Insight Summary', y);
            y = wrappedText(doc, `Positive Drivers: ${platData.sentiment_drivers.positive}`, 14, y, 265, 9, GREEN);
            y += 2;
            y = wrappedText(doc, `Negative Drivers: ${platData.sentiment_drivers.negative}`, 14, y, 265, 9, RED);
            y += 2;
            y = wrappedText(doc, `Neutral Drivers: ${platData.sentiment_drivers.neutral}`, 14, y, 265, 9, GOLD);
            y += 10;
          }

          if (platData.narrative_dimensions?.length) {
            y = section(doc, 'LLM Justification Layer — Narrative Dimensions', y);
            autoTable(doc, {
              head: [['Dimension', 'Explanation']],
              body: platData.narrative_dimensions.map(d => [d.dimension, d.explanation]),
              startY: y, theme: 'grid',
              headStyles: { fillColor: ACCENT, fontSize: 9 },
              styles: { cellPadding: 2.5, fontSize: 9, overflow: 'linebreak' },
              columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
              pageBreak: 'avoid'
            });
            y = doc.lastAutoTable.finalY + 10;
          }

          if (platData.prutl_mapping?.length) {
            y = section(doc, 'PRUTL Soul Dimension Mapping', y);
            doc.setFontSize(8); doc.setTextColor(...MID);
            doc.text('PRUTL maps platform behavior to 4 inner motivational forces.', 14, y);
            y += 7;
            autoTable(doc, {
              head: [['Dimension', 'What it means', `Observation for ${inf.name}`]],
              body: [
                ['Positive Soul',        'Unity, trust, inspiration & community',
                  platData.prutl_mapping.find(d => d.dimension === 'Positive Soul')?.observation || ''],
                ['Negative Soul',        'Pride, polarization & control',
                  platData.prutl_mapping.find(d => d.dimension === 'Negative Soul')?.observation || ''],
                ['Positive Materialism', 'Welfare, tangible schemes & real-world benefit',
                  platData.prutl_mapping.find(d => d.dimension === 'Positive Materialism')?.observation || ''],
                ['Negative Materialism', 'Narrative battles, power-play & conflict',
                  platData.prutl_mapping.find(d => d.dimension === 'Negative Materialism')?.observation || '']
              ],
              startY: y, theme: 'striped',
              headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
              styles: { cellPadding: 2.5, fontSize: 9, overflow: 'linebreak' },
              columnStyles: {
                0: { cellWidth: 42, fontStyle: 'bold' },
                1: { cellWidth: 68, textColor: MID },
                2: { cellWidth: 'auto' }
              },
              pageBreak: 'avoid'
            });
            y = doc.lastAutoTable.finalY + 10;
          }

          if (platData.final_insight) {
            y = section(doc, 'Final Platform Insight', y);
            wrappedText(doc, platData.final_insight, 14, y, 265, 9.5, DARK);
          }
        } else {
          doc.setFontSize(10); doc.setTextColor(...RED);
          doc.text('Platform analysis could not be fetched from Groq for this influencer.', 14, y);
        }
      }

      doc.save('influencer_impact_rankings.pdf');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  /* ── Filtered Rankings & Domains ─────────────────────── */
  const availableDomains = Array.from(new Set(rankings.map(r => r.domain).filter(Boolean)));
  const filteredRankings = rankings.filter(inf => {
    const matchesSearch = !searchQuery || inf.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = domainFilter === 'All' || inf.domain === domainFilter;
    const matchesSentiment = sentimentFilter === 'All' || inf.sentiment === sentimentFilter;
    return matchesSearch && matchesDomain && matchesSentiment;
  });

  /* ── Auth gate ─────────────────────────────────────── */
  if (user === undefined) return <SkeletonScreen />;
  if (!user) return <LoginPage />;

  /* ── Render ─────────────────────────────────────────── */
  return (
    <>
      <div className="max-w-[1340px] mx-auto px-8 py-12 animate-fade-in relative z-10">
        {/* ── Header ──────────────────────────────── */}
        <header
          className="flex justify-between items-center mb-8 px-7 py-4 bg-white border border-[#e5e7eb] rounded-[14px]"
          ref={headerRef}
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <div>
            <h1 className="text-[1.6rem] font-extrabold tracking-tight text-[#111111] flex items-center gap-2">
              <Crown size={26} style={{ color: '#7c3aed' }} />
              Impact Heap
            </h1>
            <p className="text-[#555555] mt-1 text-[0.83rem]">
              Rank influencers by long-term impact using Max-Heap ordering
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center justify-center gap-2 bg-white border border-[#e5e7eb] text-[#7c3aed] py-[0.65rem] px-[1.3rem] rounded-[9px] font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 hover:bg-[#f3f4f6] hover:border-[#d1d5db]"
              onClick={() => setShowHeapViz(true)}
            >
              <GitBranch size={16} /> View Heap Tree
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 bg-white border border-[#e5e7eb] text-[#7c3aed] py-[0.65rem] px-[1.3rem] rounded-[9px] font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 hover:bg-[#f3f4f6] hover:border-[#d1d5db]"
              onClick={downloadPDF}
              disabled={rankings.length === 0 || generatingPDF}
            >
              {generatingPDF ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              {generatingPDF ? 'Generating…' : 'Export PDF'}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 bg-white border border-[rgba(220,38,38,0.2)] text-[#dc2626] py-[0.65rem] px-[1.3rem] rounded-[9px] font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 hover:bg-[rgba(220,38,38,0.04)] hover:border-[rgba(220,38,38,0.35)] disabled:opacity-35 disabled:cursor-not-allowed"
              onClick={clearAll}
              disabled={rankings.length === 0}
            >
              <Trash2 size={16} /> Clear All
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 bg-[#7c3aed] text-white border-none py-[0.65rem] px-[1.3rem] rounded-[9px] font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 hover:bg-[#6d28d9] disabled:opacity-35 disabled:cursor-not-allowed"
              id="add-influencer-btn"
              onClick={toggleForm}
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? 'Close' : 'Add Influencer'}
            </button>
            {/* User pill */}
            <div className="flex items-center gap-2.5 px-[0.5rem] py-[0.35rem] pr-[0.75rem] bg-[#f3f4f6] border border-[#e5e7eb] rounded-full text-[0.82rem] text-[#555555]">
              <div className="w-[32px] h-[32px] rounded-full bg-[#7c3aed] text-white flex items-center justify-center text-[0.83rem] font-bold overflow-hidden shrink-0">
                {user.photoURL
                  ? <img src={user.photoURL} alt={user.displayName} />
                  : (user.displayName || user.email || 'U')[0].toUpperCase()
                }
              </div>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999999', display: 'flex', padding: '2px' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* ── Add Form ────────────────────────────── */}
        {showForm && (
          <div ref={formContainerRef} className="bg-white border border-[#e5e7eb] rounded-[14px] p-6 transition-all duration-200 relative overflow-hidden card-iridescent mb-4 group hover:border-[#d1d5db]" id="add-form" style={{ opacity: 0, height: 0, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 className="flex items-center gap-2 mb-3" style={{ fontSize: '1rem', color: '#111111' }}>
              <Sparkles size={16} style={{ color: '#7c3aed' }} /> New Influencer
            </h3>
            <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
              <div className="mb-4" style={{ gridColumn: '1 / -1' }}>
                <label className="block mb-[0.4rem] text-[0.75rem] font-semibold text-[#999999] uppercase tracking-[0.06em]">Influencer Name</label>
                <div className="relative">
                  <Search size={15} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none" />
                  <input
                    className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111111] py-[0.72rem] px-[0.95rem] pl-[2.6rem] rounded-[9px] text-[0.9rem] transition-all duration-200 focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[rgba(124,58,237,0.12)]"
                    id="input-name"
                    placeholder="e.g. Virat Kohli"
                    value={formName}
                    onChange={e => handleNameChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !fetchingProfile && formName.trim().length >= 2 && handleFetchProfile()}
                    autoComplete="off"
                  />
                </div>
              </div>

              {!profileData && !fetchingProfile && formName.trim().length >= 2 && (
                <div className="mb-4" style={{ gridColumn: '1 / -1' }}>
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#7c3aed] text-white border-none py-[0.65rem] px-[1.3rem] rounded-[9px] font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 hover:bg-[#6d28d9] disabled:opacity-35 disabled:cursor-not-allowed"
                    id="fetch-profile-btn"
                    onClick={handleFetchProfile}
                    disabled={fetchingProfile}
                  >
                    <Search size={15} /> Fetch Profile Data
                  </button>
                </div>
              )}

              {quotaError && (
                <div className="mb-4" style={{ gridColumn: '1 / -1' }}>
                  <div className="flex items-center gap-2 py-[0.65rem] px-[0.9rem] border rounded-[9px] text-[0.83rem]" style={{ borderColor: '#dc2626', background: 'rgba(220,38,38,0.04)' }}>
                    <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                      <strong>Groq quota exceeded.</strong> Wait ~{quotaError.retryAfterSec}s then try again, or{' '}
                      <a href="https://ai.dev/rate-limit" target="_blank" rel="noreferrer" style={{ color: '#dc2626' }}>upgrade your plan</a>.
                    </span>
                  </div>
                </div>
              )}

              {fetchingProfile && (
                <div className="mb-4" style={{ gridColumn: '1 / -1' }}>
                  <div className="flex items-center gap-2 py-[0.65rem] px-[0.9rem] border rounded-[9px] text-[0.83rem]" style={retryCountdown > 0 ? { borderColor: '#d97706', background: 'rgba(217,119,6,0.04)' } : { borderColor: '#e5e7eb' }}>
                    <Loader2 size={15} className="spin" style={{ color: retryCountdown > 0 ? '#d97706' : '#7c3aed' }} />
                    <span className="text-[#555555]">
                      {retryCountdown > 0
                        ? `Rate limited — auto-retrying in ${retryCountdown}s…`
                        : 'Fetching profile from Groq…'}
                    </span>
                  </div>
                </div>
              )}

              {profileData && (
                <>
                  <div className="mb-4" style={{ gridColumn: '1 / -1' }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-[0.4rem]">
                        <span className="block mb-[0.4rem] text-[0.75rem] font-semibold text-[#999999] uppercase tracking-[0.06em]">Domain</span>
                        <span className="inline-flex items-center gap-[0.3rem] py-[0.22rem] px-[0.6rem] rounded-[20px] text-[0.72rem] font-semibold tracking-[0.01em] bg-[rgba(124,58,237,0.06)] text-[#7c3aed] border border-[rgba(124,58,237,0.15)] flex items-center gap-2" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
                          {domainIcon(profileData.domain)} {profileData.domain}
                        </span>
                      </div>
                      <div className="flex flex-col gap-[0.4rem]">
                        <span className="block mb-[0.4rem] text-[0.75rem] font-semibold text-[#999999] uppercase tracking-[0.06em]">Public Sentiment</span>
                        <span className={`inline-flex items-center gap-[0.3rem] py-[0.22rem] px-[0.6rem] rounded-[20px] text-[0.72rem] font-semibold tracking-[0.01em] ${profileData.sentiment === 'Positive' ? 'bg-[rgba(22,163,74,0.06)] text-[#16a34a] border border-[rgba(22,163,74,0.15)]' : profileData.sentiment === 'Negative' ? 'bg-[rgba(220,38,38,0.06)] text-[#dc2626] border border-[rgba(220,38,38,0.15)]' : 'bg-[rgba(217,119,6,0.06)] text-[#d97706] border border-[rgba(217,119,6,0.15)]'}`}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
                          {profileData.sentiment}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4" style={{ gridColumn: '1 / -1' }}>
                    <span className="block mb-[0.4rem] text-[0.75rem] font-semibold text-[#999999] uppercase tracking-[0.06em]">Key Contribution</span>
                    <div className="flex items-start gap-3 p-[0.75rem] bg-[#f3f4f6] border border-[#e5e7eb] rounded-[9px] text-[#555555] text-[0.85rem]">
                      <Sparkles size={14} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                      <span>{profileData.event}</span>
                    </div>
                  </div>
                  <div className="mb-4" style={{ gridColumn: '1 / -1' }}>
                    <label className="block mb-[0.4rem] text-[0.75rem] font-semibold text-[#999999] uppercase tracking-[0.06em]">Platform Followers</label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="flex items-center gap-[1.1rem] p-[1.4rem_1.6rem] bg-white border border-[#e5e7eb] rounded-[14px]">
                        <IGIcon size={18} />
                        <div>
                          <span className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em] mb-[0.2rem] block">Instagram</span>
                          <span className="text-[1.8rem] font-extrabold leading-none tracking-[-0.03em] text-[#7c3aed] block">{formatFollowers(profileData.socials.instagram)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-[1.1rem] p-[1.4rem_1.6rem] bg-white border border-[#e5e7eb] rounded-[14px]">
                        <XIcon size={18} />
                        <div>
                          <span className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em] mb-[0.2rem] block">X (Twitter)</span>
                          <span className="text-[1.8rem] font-extrabold leading-none tracking-[-0.03em] text-[#7c3aed] block">{formatFollowers(profileData.socials.x)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-[1.1rem] p-[1.4rem_1.6rem] bg-white border border-[#e5e7eb] rounded-[14px]">
                        <YTIcon size={18} />
                        <div>
                          <span className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em] mb-[0.2rem] block">YouTube</span>
                          <span className="text-[1.8rem] font-extrabold leading-none tracking-[-0.03em] text-[#7c3aed] block">{formatFollowers(profileData.socials.youtube)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-[1.1rem] p-[1.4rem_1.6rem] bg-white border border-[#e5e7eb] rounded-[14px]">
                        <Users size={18} />
                        <div>
                          <span className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em] mb-[0.2rem] block">Total</span>
                          <span className="text-[1.8rem] font-extrabold leading-none tracking-[-0.03em] text-[#7c3aed] block">{formatFollowers(profileData.socials.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {profileData && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <button className="w-full inline-flex items-center justify-center gap-2 bg-[#7c3aed] text-white border-none py-[0.65rem] px-[1.3rem] rounded-[9px] font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 hover:bg-[#6d28d9] disabled:opacity-35 disabled:cursor-not-allowed" id="add-to-heap-btn" type="submit" disabled={loading}>
                    {loading ? <><Loader2 size={16} className="spin" /> Scoring…</> : <><Brain size={16} /> Add to Heap</>}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── Stat Cards ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-5 mb-7" ref={statCardsRef}>
          <div className="flex items-center gap-[1.1rem] p-[1.4rem_1.6rem] bg-white border border-[#e5e7eb] rounded-[14px] relative overflow-hidden transition-all duration-200 hover:-translate-y-[3px]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center shrink-0 relative bg-[rgba(124,58,237,0.08)] text-[#7c3aed]">
              <Users size={22} />
            </div>
            <div>
              <div className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em] mb-[0.2rem]">Total Influencers</div>
              <div className="text-[1.8rem] font-extrabold leading-none tracking-[-0.03em] text-[#7c3aed]">
                <RollingNumber value={rankings.length} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-[1.1rem] p-[1.4rem_1.6rem] bg-white border border-[#e5e7eb] rounded-[14px] relative overflow-hidden transition-all duration-200 hover:-translate-y-[3px]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center shrink-0 relative bg-[rgba(14,165,233,0.08)] text-[#0ea5e9]">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em] mb-[0.2rem]">Avg Impact Score</div>
              <div className="text-[1.8rem] font-extrabold leading-none tracking-[-0.03em] text-[#7c3aed]">
                <RollingNumber
                  value={rankings.length > 0
                    ? Math.round(rankings.reduce((s, r) => s + r.score, 0) / rankings.length)
                    : '—'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ────────────────────────── */}
        <div className="flex" ref={splitContainerRef} style={{ gap: 0 }}>
          {/* Ranking Table */}
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-6 transition-all duration-200 relative overflow-hidden card-iridescent group hover:border-[#d1d5db] overflow-y-auto" id="ranking-panel" ref={rankPanelRef} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)', width: `${splitPercent}%`, flexShrink: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-[#111111]" style={{ fontSize: '1rem' }}>
                <BarChart3 size={18} style={{ color: '#7c3aed' }} /> Impact Rankings
              </h2>
              {compareList.length > 0 && (
                <span className="text-[0.72rem] font-bold text-[#7c3aed]">
                  {compareList.length} selected for comparison
                </span>
              )}
            </div>

            {/* Search & Filter Controls */}
            {rankings.length > 0 && (
              <>
                <SearchFilter
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  domainFilter={domainFilter}
                  onDomainChange={setDomainFilter}
                  sentimentFilter={sentimentFilter}
                  onSentimentChange={setSentimentFilter}
                  domains={availableDomains}
                />
                <WeightSliders
                  weights={weights}
                  onWeightsChange={handleWeightsChange}
                  isOpen={showWeightSliders}
                  onToggle={() => setShowWeightSliders(prev => !prev)}
                />
              </>
            )}

            {loading && rankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[4rem] gap-4">
                <Loader2 size={32} className="spin" style={{ color: '#7c3aed' }} />
                <p className="text-[#555555]" style={{ fontSize: '0.85rem' }}>Scoring influencers…</p>
              </div>
            ) : rankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[4rem] px-[2rem] text-center border-2 border-dashed border-[#e5e7eb] rounded-[14px] bg-[#f9fafb]">
                <div className="w-[64px] h-[64px] rounded-full bg-[rgba(124,58,237,0.06)] flex items-center justify-center text-[#7c3aed] mb-[1.2rem]">
                  <Crown size={32} />
                </div>
                <p className="text-[1.1rem] font-bold text-[#111111] mb-[0.4rem]">No influencers ranked yet</p>
                <p className="text-[0.85rem] text-[#999999]">Click <strong>Add Influencer</strong> above to get started</p>
              </div>
            ) : filteredRankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[3rem] text-center">
                <p className="text-[0.9rem] font-semibold text-[#555555]">No influencers match your filter</p>
                <p className="text-[0.78rem] text-[#999999] mt-1">Try clearing search or domain filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" id="ranking-table">
                  <thead>
                    <tr>
                      <th className="w-[28px] border-b border-[#e5e7eb]"></th>
                      <th className="text-[#999999] font-semibold text-[0.7rem] uppercase tracking-[0.08em] p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">Rank</th>
                      <th className="text-[#999999] font-semibold text-[0.7rem] uppercase tracking-[0.08em] p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">Influencer</th>
                      <th className="text-[#999999] font-semibold text-[0.7rem] uppercase tracking-[0.08em] p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">Domain</th>
                      <th className="text-[#999999] font-semibold text-[0.7rem] uppercase tracking-[0.08em] p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">Score</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRankings.map((inf, i) => (
                      <tr className="transition-colors duration-200 cursor-pointer hover:bg-[#f9fafb] group"
                        key={inf.id}
                        ref={el => rowRefs.current[inf.id] = el}
                        onClick={() => viewDetails(inf)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="p-[0.9rem_0.3rem] border-b border-[#e5e7eb] w-[28px] text-center" onClick={e => e.stopPropagation()}>
                          <button
                            className={`compare-checkbox ${compareList.includes(inf.id) ? 'checked' : ''}`}
                            onClick={e => toggleCompare(inf.id, e)}
                            title={compareList.includes(inf.id) ? 'Remove from comparison' : 'Compare (max 3)'}
                          >
                            {compareList.includes(inf.id) && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                          </button>
                        </td>
                        <td className="p-[0.9rem_1rem] text-left border-b border-[#e5e7eb] w-[50px] text-center font-bold text-[#555555]">{rankMedal(i + 1)}</td>
                        <td className="p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">
                          <div className="font-bold text-[0.95rem] text-[#111111] mb-[0.3rem]">{inf.name}</div>
                          <div className="flex items-center gap-[0.6rem]">
                            {inf.socials && (
                              <>
                                <PlatformBadge platform="instagram" count={inf.socials.instagram} />
                                <PlatformBadge platform="x"         count={inf.socials.x} />
                                <PlatformBadge platform="youtube"   count={inf.socials.youtube} />
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">
                          <span className="inline-flex items-center gap-[0.3rem] py-[0.22rem] px-[0.6rem] rounded-[20px] text-[0.72rem] font-semibold tracking-[0.01em] bg-[rgba(124,58,237,0.06)] text-[#7c3aed] border border-[rgba(124,58,237,0.15)] flex items-center gap-2">
                            {domainIcon(inf.domain)} {inf.domain}
                          </span>
                        </td>
                        <td className="p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">
                          <span className="font-bold text-[#7c3aed]">{inf.score}</span>
                        </td>
                        <td className="p-[0.9rem_1rem] text-left border-b border-[#e5e7eb]">
                          <div className="flex items-center gap-2">
                            <button className="inline-flex items-center justify-center gap-2 bg-white border border-[#e5e7eb] text-[#555555] py-[0.38rem] px-[0.55rem] rounded-[6px] font-semibold text-[0.8rem] cursor-pointer transition-all duration-200 hover:bg-[#f3f4f6] hover:border-[#d1d5db]" onClick={e => { e.stopPropagation(); viewDetails(inf); }} aria-label="View details">
                              <Eye size={14} />
                            </button>
                            <button className="inline-flex items-center justify-center gap-2 bg-white border border-[rgba(220,38,38,0.2)] text-[#dc2626] py-[0.38rem] px-[0.55rem] rounded-[6px] font-semibold text-[0.8rem] cursor-pointer transition-all duration-200 hover:bg-[rgba(220,38,38,0.04)] hover:border-[rgba(220,38,38,0.35)]" onClick={e => { e.stopPropagation(); removeInfluencer(inf); }} aria-label="Remove">
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

          {/* ── Splitter Handle ───────────────────── */}
          <div
            className="splitter-handle"
            onMouseDown={onSplitterMouseDown}
          >
            <div className="splitter-line" />
          </div>

          {/* ── Details Panel / Comparison Mode ──── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {compareList.length >= 2 ? (
              <ComparisonPanel
                influencers={compareList.map(id => rankings.find(r => r.id === id)).filter(Boolean)}
                onClose={() => setCompareList([])}
                onRemove={id => setCompareList(prev => prev.filter(x => x !== id))}
              />
            ) : selectedInfluencer ? (
              <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-6 transition-all duration-200 relative overflow-hidden card-iridescent group hover:border-[#d1d5db]" id="details-panel" ref={detailPanelRef} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="flex items-center gap-2 text-[#111111]" style={{ fontSize: '0.95rem' }}>
                    <Brain size={16} style={{ color: '#7c3aed' }} /> Score Breakdown
                  </h3>
                  <button className="inline-flex items-center justify-center gap-2 bg-white border border-[#e5e7eb] text-[#555555] py-[0.38rem] px-[0.55rem] rounded-[6px] font-semibold text-[0.8rem] cursor-pointer transition-all duration-200 hover:bg-[#f3f4f6] hover:border-[#d1d5db]" onClick={() => { setSelectedInfluencer(null); setEthicalData(null); }}>
                    <X size={14} />
                  </button>
                </div>

                <div className="text-[1.6rem] font-extrabold tracking-tight mb-[0.4rem] text-[#111111]">{selectedInfluencer.name}</div>
                <div className="inline-flex items-center gap-[0.3rem] py-[0.22rem] px-[0.6rem] rounded-[20px] text-[0.72rem] font-semibold tracking-[0.01em] bg-[rgba(124,58,237,0.06)] text-[#7c3aed] border border-[rgba(124,58,237,0.15)] mb-2 flex items-center gap-2" style={{ width: 'fit-content' }}>
                  {domainIcon(selectedInfluencer.domain)} {selectedInfluencer.domain}
                </div>

                {selectedInfluencer.socials && (
                  <div className="flex flex-wrap gap-[0.6rem] mt-[1rem]">
                    <PlatformBadge platform="instagram" count={selectedInfluencer.socials.instagram} />
                    <PlatformBadge platform="x"         count={selectedInfluencer.socials.x} />
                    <PlatformBadge platform="youtube"   count={selectedInfluencer.socials.youtube} />
                    <span className="inline-flex items-center gap-[0.3rem] py-[0.22rem] px-[0.6rem] rounded-[20px] text-[0.72rem] font-semibold tracking-[0.01em] bg-[#f3f4f6] text-[#111111] border border-[#e5e7eb]"><Users size={12} /> {formatFollowers(selectedInfluencer.socials.total)}</span>
                  </div>
                )}

                <p className="text-[#555555]" style={{ fontSize: '0.82rem', margin: '0.75rem 0 1rem' }}>
                  {selectedInfluencer.event}
                </p>

                {/* Score Rings */}
                <div className="flex items-center gap-[0.5rem] text-[0.85rem] font-bold text-[#999999] uppercase tracking-[0.05em] mb-[1rem] mt-[1.5rem]">
                  <Sparkles size={13} /> Score Dimensions
                </div>
                <div className="grid grid-cols-4 gap-[1rem] mb-[1.5rem]">
                  <ScoreRing value={selectedInfluencer.knowledge_score} color="#7c3aed" label="Knowledge"  size={80} />
                  <ScoreRing value={selectedInfluencer.social_impact}   color="#0ea5e9" label="Social"     size={80} />
                  <ScoreRing value={selectedInfluencer.ethical_score}   color="#16a34a" label="Ethics"     size={80} />
                  <ScoreRing value={selectedInfluencer.longevity_score} color="#d97706" label="Longevity"  size={80} />
                </div>

                {/* Classic progress bars */}
                <div ref={scoreBarsRef}>
                  {[
                    { label: 'Knowledge',    value: selectedInfluencer.knowledge_score,  color: '#7c3aed' },
                    { label: 'Social Impact',value: selectedInfluencer.social_impact,    color: '#0ea5e9' },
                    { label: 'Ethics',       value: selectedInfluencer.ethical_score,    color: '#16a34a' },
                    { label: 'Longevity',    value: selectedInfluencer.longevity_score,  color: '#d97706' },
                  ].map((dim) => (
                    <div key={dim.label} className="mb-[0.85rem]">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.78rem] font-semibold text-[#555555]">{dim.label}</span>
                        <span className="text-[0.9rem] font-bold text-[#111111]">{dim.value}</span>
                      </div>
                      <div className="w-full h-[5px] bg-[#e5e7eb] rounded-[3px] overflow-hidden mt-[7px]">
                        <div
                          className="h-full rounded-[3px] w-0 transition-[width] duration-900 ease-[cubic-bezier(0.4,0,0.2,1)]"
                          data-target={dim.value}
                          style={{ background: dim.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-[1px] bg-[#e5e7eb] my-[1.5rem]" />
                <div className="flex items-center justify-between">
                  <span className="text-[#555555]" style={{ fontSize: '0.82rem' }}>Overall Impact Score</span>
                  <span className="font-bold text-[#7c3aed]" style={{ fontSize: '1.4rem' }}>{selectedInfluencer.score}</span>
                </div>

                {/* LLM Justification */}
                {selectedInfluencer.justification && (
                  <>
                    <div className="h-[1px] bg-[#e5e7eb] my-[1.5rem]" />
                    <div className="flex items-center gap-[0.5rem] text-[0.85rem] font-bold text-[#999999] uppercase tracking-[0.05em] mb-[1rem] mt-[1.5rem]">
                      <Brain size={13} /> Groq AI Justification
                    </div>
                    <div className="overflow-x-auto rounded-[9px] border border-[#e5e7eb] mb-[0.75rem]">
                      <table className="w-full border-collapse text-[0.78rem]">
                        <thead><tr><th className="bg-[#f9fafb] text-[#999999] font-semibold text-[0.68rem] uppercase tracking-[0.07em] p-[0.5rem_0.7rem] border-b border-[#e5e7eb] text-left">Dimension</th><th className="bg-[#f9fafb] text-[#999999] font-semibold text-[0.68rem] uppercase tracking-[0.07em] p-[0.5rem_0.7rem] border-b border-[#e5e7eb] text-left">AI Reasoning</th></tr></thead>
                        <tbody>
                          {[
                            { dim: 'Knowledge',    key: 'knowledge',     color: '#7c3aed' },
                            { dim: 'Social Impact',key: 'social_impact', color: '#0ea5e9' },
                            { dim: 'Ethics',       key: 'ethics',        color: '#16a34a' },
                            { dim: 'Longevity',    key: 'longevity',     color: '#d97706' },
                          ].map(({ dim, key, color }) => (
                            <tr key={key}>
                              <td className="p-[0.5rem_0.7rem] text-left border-b border-[#e5e7eb]">
                                <span className="inline-block py-[0.2rem] pr-[0.55rem] pl-[0.7rem] rounded-[4px] bg-[#f9fafb] text-[#555555] font-semibold text-[0.72rem] whitespace-nowrap" style={{ borderLeft: `3px solid ${color}` }}>{dim}</span>
                              </td>
                              <td className="text-[#555555] text-[0.76rem] leading-[1.5] py-[0.55rem] px-[0.7rem] border-b border-[#e5e7eb]">{selectedInfluencer.justification[key]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[0.78rem] text-[#555555] leading-[1.6] py-[0.6rem] px-[0.8rem] bg-[rgba(124,58,237,0.04)] border-l-[3px] border-[#7c3aed] rounded-r-[9px] mb-[0.25rem]">
                      <Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      {selectedInfluencer.justification.overall}
                    </p>
                  </>
                )}

                {/* Ethical analysis */}
                {ethicalData && (
                  <>
                    <div className="h-[1px] bg-[#e5e7eb] my-[1.5rem]" />
                    <div className="flex items-center gap-[0.5rem] text-[0.85rem] font-bold text-[#999999] uppercase tracking-[0.05em] mb-[1rem] mt-[1.5rem]">
                      <Shield size={13} /> Ethical Analysis
                    </div>
                    <p className="text-[#555555]" style={{ fontSize: '0.78rem', marginBottom: '0.6rem' }}>
                      {ethicalData.impact_summary}
                    </p>
                    <div className="flex flex-wrap gap-[0.5rem] mt-[0.8rem]">
                      {ethicalData.positive_traits.map(t => (
                        <span key={t} className="badge badge-green">{t}</span>
                      ))}
                      {ethicalData.negative_traits.map(t => (
                        <span key={t} className="badge badge-red">{t}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-6 transition-all duration-200 relative overflow-hidden card-iridescent group hover:border-[#d1d5db] flex flex-col items-center justify-center py-[6rem] text-center" id="details-panel-empty" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Eye size={30} style={{ color: '#999999' }} />
                <p className="text-[#999999]" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  Select an influencer to view details, or select 2+ for comparison
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <footer className="text-center py-[2rem] pt-[1rem] border-t border-[#e5e7eb] mt-[2.5rem]">
          <p className="text-[#999999]" style={{ fontSize: '0.78rem' }}>
            Built with <span style={{ color: '#7c3aed' }}>Max-Heap</span> data structure &amp; AI scoring — DS/CP Project
          </p>
        </footer>
      </div>

      {/* ── Heap Visualizer Modal ─────────────────── */}
      {showHeapViz && (
        <HeapVisualizer
          heapArray={heapRef.current.heap}
          onClose={() => setShowHeapViz(false)}
        />
      )}
    </>
  );
}

export default App;
