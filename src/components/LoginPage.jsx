import { useState, useEffect, useRef } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.js';
import { Crown, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import * as THREE from 'three';

/* ── Google "G" SVG ──────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/* ── Mini Three.js particle scene for login ──────── */
function LoginCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 500);
    camera.position.z = 50;

    // Soft lavender particle cloud
    const count = 1200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 120;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xc4b5fd, size: 0.22, transparent: true, opacity: 0.35,
      depthWrite: false,
    })));

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      scene.rotation.y = t * 0.015 + mouseX * 0.06;
      scene.rotation.x = Math.sin(t * 0.01) * 0.04 + mouseY * 0.03;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

export default function LoginPage() {
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const cardRef = useRef(null);

  /* ── GSAP card entrance ──────────────────────────── */
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { y: 40, opacity: 0, scale: 0.96 },
      { y: 0,  opacity: 1, scale: 1, duration: 0.75, ease: 'power3.out', delay: 0.15 }
    );
  }, []);

  const clearError = () => setError('');

  const friendlyError = (code) => {
    const map = {
      'auth/user-not-found':       'No account found with this email.',
      'auth/wrong-password':       'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'This email is already registered. Try signing in.',
      'auth/weak-password':        'Password must be at least 6 characters.',
      'auth/invalid-email':        'Please enter a valid email address.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/invalid-credential':   'Incorrect email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  };

  const handleGoogle = async () => {
    setLoading(true); clearError();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true); clearError();
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#fafafa' }}>
      {/* Three.js particle background */}
      <LoginCanvas />

      <div
        className="relative z-10 w-full max-w-[430px] bg-white border border-[#e5e7eb] rounded-[18px] p-[2.5rem_2rem_2rem]"
        ref={cardRef}
        style={{ opacity: 0, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        {/* Logo */}
        <div className="w-[56px] h-[56px] bg-[rgba(124,58,237,0.08)] border border-[#e5e7eb] rounded-[16px] flex items-center justify-center mx-auto mb-[1.1rem]">
          <Crown size={28} style={{ color: '#7c3aed' }} />
        </div>
        <h1 className="text-center text-[1.75rem] font-extrabold tracking-[-0.04em] mb-[0.3rem] text-[#111111]">Impact Heap</h1>
        <p className="text-center text-[0.83rem] text-[#999999] mb-[1.6rem]">
          Rank global influencers by long-term impact
        </p>

        {/* Tab toggle */}
        <div className="flex bg-[#f3f4f6] border border-[#e5e7eb] rounded-[10px] p-1 mb-[1.3rem] gap-1">
          <button
            className={`flex-1 p-2 border-none rounded-[8px] text-[0.85rem] font-semibold cursor-pointer transition-all duration-200 ${mode === 'login' ? 'bg-[#7c3aed] text-white' : 'bg-transparent text-[#999999]'}`}
            onClick={() => { setMode('login'); clearError(); }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 p-2 border-none rounded-[8px] text-[0.85rem] font-semibold cursor-pointer transition-all duration-200 ${mode === 'signup' ? 'bg-[#7c3aed] text-white' : 'bg-transparent text-[#999999]'}`}
            onClick={() => { setMode('signup'); clearError(); }}
          >
            Create Account
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-[0.65rem_0.9rem] bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.15)] rounded-[8px] text-[#dc2626] text-[0.83rem] mb-4">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Google button */}
        <button
          className="w-full flex items-center justify-center gap-3 py-[0.78rem] px-4 bg-white border border-[#e5e7eb] rounded-[8px] text-[#111111] text-[0.9rem] font-medium cursor-pointer transition-all duration-200 mb-4 hover:bg-[#f3f4f6] hover:border-[#d1d5db] disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4 text-[#999999] text-[0.78rem] before:content-[''] before:flex-1 before:h-px before:bg-[#e5e7eb] after:content-[''] after:flex-1 after:h-px after:bg-[#e5e7eb]"><span>or</span></div>

        {/* Email / Password form */}
        <form onSubmit={handleEmail} className="flex flex-col gap-[0.8rem]">
          <div className="relative">
            <Mail size={15} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none" />
            <input
              type="email"
              placeholder="Email address"
              className="w-full bg-[#f3f4f6] border border-[#e5e7eb] rounded-[8px] py-[0.78rem] pr-[0.95rem] pl-[2.6rem] text-[#111111] text-[0.9rem] transition-all duration-200 focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[rgba(124,58,237,0.12)]"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none" />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-[#f3f4f6] border border-[#e5e7eb] rounded-[8px] py-[0.78rem] pr-[0.95rem] pl-[2.6rem] text-[#111111] text-[0.9rem] transition-all duration-200 focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[rgba(124,58,237,0.12)]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 p-[0.82rem] bg-[#7c3aed] border-none rounded-[8px] text-white text-[0.95rem] font-bold cursor-pointer transition-all duration-200 mt-1 hover:bg-[#6d28d9] disabled:opacity-45 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading
              ? <Loader2 size={16} className="spin" />
              : mode === 'login'
                ? <><LogIn size={15} /> Sign In</>
                : <><UserPlus size={15} /> Create Account</>
            }
          </button>
        </form>

        <p className="text-center text-[0.72rem] text-[#999999] mt-[1.6rem]">
          DS/CP Project — Max-Heap × AI Impact Scoring
        </p>
      </div>
    </div>
  );
}
