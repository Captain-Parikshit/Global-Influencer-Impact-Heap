import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * useGsapAnimations
 * Returns refs and trigger functions for all GSAP animations in the app.
 */
export function useGsapAnimations() {
  const headerRef    = useRef(null);
  const statCardsRef = useRef(null);
  const rankPanelRef = useRef(null);
  const detailRef    = useRef(null);
  const formRef      = useRef(null);

  /* ── Page-load stagger on mount ───────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (headerRef.current) {
        tl.from(headerRef.current, { y: -30, opacity: 0, duration: 0.7 });
      }
      if (statCardsRef.current) {
        tl.from(statCardsRef.current.children, {
          y: 24, opacity: 0, duration: 0.5, stagger: 0.12,
        }, '-=0.4');
      }
      if (rankPanelRef.current) {
        tl.from(rankPanelRef.current, { y: 30, opacity: 0, duration: 0.55 }, '-=0.3');
      }
    });
    return () => ctx.revert();
  }, []);

  /* ── Form open/close ──────────────────────────────── */
  const openForm = (el) => {
    if (!el) return;
    gsap.fromTo(el,
      { height: 0, opacity: 0, y: -12, overflow: 'hidden' },
      { height: 'auto', opacity: 1, y: 0, duration: 0.42, ease: 'power2.out',
        onComplete: () => gsap.set(el, { overflow: 'visible' }) }
    );
  };

  const closeForm = (el, onDone) => {
    if (!el) return;
    gsap.to(el, {
      height: 0, opacity: 0, y: -8, overflow: 'hidden',
      duration: 0.3, ease: 'power2.in',
      onComplete: onDone,
    });
  };

  /* ── New ranking row fly-in ───────────────────────── */
  const animateNewRow = (rowEl) => {
    if (!rowEl) return;
    gsap.fromTo(rowEl,
      { x: -40, opacity: 0, scale: 0.95 },
      { x: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
    );
  };

  /* ── Detail panel slide-in ───────────────────────── */
  const animateDetailIn = (el) => {
    if (!el) return;
    gsap.fromTo(el,
      { x: 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
    );
  };

  /* ── Score bars (0 → value) ──────────────────────── */
  const animateScoreBars = (containerEl) => {
    if (!containerEl) return;
    const fills = containerEl.querySelectorAll('.progress-fill');
    fills.forEach(fill => {
      const target = fill.dataset.target; // set in JSX as data-target
      gsap.fromTo(fill,
        { width: '0%' },
        { width: `${target}%`, duration: 0.9, ease: 'power2.out', delay: 0.15 }
      );
    });
  };

  /* ── Number count-up ─────────────────────────────── */
  const animateCountUp = (el, targetValue) => {
    if (!el) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: targetValue,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = Math.round(obj.val); },
    });
  };

  /* ── Card 3-D tilt on hover ──────────────────────── */
  const attachTilt = (el) => {
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = ((e.clientY - cy) / rect.height) * -8;
      const ry = ((e.clientX - cx) / rect.width) * 8;
      gsap.to(el, { rotateX: rx, rotateY: ry, duration: 0.3, ease: 'power2.out', transformPerspective: 800 });
    };
    const onLeave = () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  };

  return {
    headerRef, statCardsRef, rankPanelRef, detailRef, formRef,
    openForm, closeForm, animateNewRow, animateDetailIn,
    animateScoreBars, animateCountUp, attachTilt,
  };
}
