'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Heart, Play, Pause, Gem, Flower2, Users, Infinity as InfinityIcon,
  ChevronDown, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { photos, heroPhoto, storyPhotos, polaroids } from './photos';

const weddingDate = new Date('2027-02-21T00:00:00+05:30').getTime();

/* Deterministic pseudo-random so the server and the client render the same
   petals — Math.random() here would cause a hydration mismatch. */
const rand = (i, salt) => {
  const x = Math.sin(i * 99.71 + salt * 13.13) * 43758.5453;
  return x - Math.floor(x);
};

const makeFallers = (count, glyphs, salt) =>
  Array.from({ length: count }, (_, i) => ({
    i,
    left: rand(i, salt) * 100,
    delay: rand(i, salt + 1) * 12,
    dur: 9 + rand(i, salt + 2) * 11,
    size: 11 + rand(i, salt + 3) * 15,
    drift: rand(i, salt + 4) * 140 - 70,
    glyph: glyphs[Math.floor(rand(i, salt + 5) * glyphs.length)],
  }));

const PETALS = makeFallers(22, ['❀', '✿', '❁', '♥', '✦'], 1);
const CONFETTI = makeFallers(26, ['♥', '❀', '✦'], 7);

/* ---------------------------------------------------------------- hooks */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -70px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useScroll() {
  const [state, setState] = useState({ progress: 0, y: 0 });
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setState({ progress: max > 0 ? window.scrollY / max : 0, y: window.scrollY });
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);
  return state;
}

/* Pointer parallax — writes CSS variables the hero art reads. */
function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--tx', `${(x * 18).toFixed(2)}px`);
      el.style.setProperty('--ty', `${(y * 14).toFixed(2)}px`);
      el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
    };
    const onLeave = () => {
      ['--tx', '--ty', '--rx', '--ry'].forEach(v => el.style.setProperty(v, '0'));
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); };
  }, [ref]);
}

/* ----------------------------------------------------------- components */

function Letters({ text, offset = 0 }) {
  return (
    <span className="letters">
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => (
        <span className="ltr" key={i} style={{ '--i': offset + i }} aria-hidden="true">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}

function Countdown() {
  const [now, setNow] = useState(weddingDate);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, weddingDate - now);
  const parts = [
    [Math.floor(left / 86400000), 'Days'],
    [Math.floor((left % 86400000) / 3600000), 'Hours'],
    [Math.floor((left % 3600000) / 60000), 'Minutes'],
    [Math.floor((left % 60000) / 1000), 'Seconds'],
  ];
  return (
    <div className="countdown">
      {parts.map(([n, label]) => {
        const value = String(n).padStart(2, '0');
        return (
          <div className="time" key={label}>
            {/* keyed on the value so only the digits that actually change flip */}
            <strong><span key={value}>{value}</span></strong>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Fallers({ items, className }) {
  return (
    <div className={className} aria-hidden="true">
      {items.map(p => (
        <span
          key={p.i}
          className="faller"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            '--dur': `${p.dur}s`,
            '--delay': `${p.delay}s`,
            '--drift': `${p.drift}px`,
          }}
        >{p.glyph}</span>
      ))}
    </div>
  );
}

function Shot({ photo, sizes, priority, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      src={photo.src}
      alt={photo.caption}
      width={photo.w}
      height={photo.h}
      sizes={sizes}
      priority={priority}
      className={`${className} ${loaded ? 'ready' : ''}`}
      onLoad={() => setLoaded(true)}
    />
  );
}

function Lightbox({ index, onClose, onStep }) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, onStep]);

  const photo = photos[index];
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={photo.caption}>
      <button className="lb-close" onClick={onClose} aria-label="Close"><X /></button>
      <button className="lb-nav prev" aria-label="Previous photo"
        onClick={e => { e.stopPropagation(); onStep(-1); }}><ChevronLeft /></button>
      <figure className="lb-figure" key={photo.src} onClick={e => e.stopPropagation()}>
        <Image src={photo.src} alt={photo.caption} width={photo.w} height={photo.h}
          sizes="90vw" className="lb-img" />
        <figcaption>{photo.caption}<small>{index + 1} / {photos.length}</small></figcaption>
      </figure>
      <button className="lb-nav next" aria-label="Next photo"
        onClick={e => { e.stopPropagation(); onStep(1); }}><ChevronRight /></button>
    </div>
  );
}

/* ---------------------------------------------------------------- page */

let burstId = 0;

export default function Home() {
  const [music, setMusic] = useState(false);
  const [noSong, setNoSong] = useState(false);
  const [answer, setAnswer] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [bursts, setBursts] = useState([]);

  const heroRef = useRef(null);
  const audioRef = useRef(null);
  const { progress, y } = useScroll();
  useReveal();
  useTilt(heroRef);

  const burst = useCallback(e => {
    const id = ++burstId;
    const hearts = Array.from({ length: 16 }, (_, i) => ({
      a: (i / 16) * 360 + Math.random() * 14,
      r: 70 + Math.random() * 110,
      s: 0.6 + Math.random() * 0.9,
    }));
    setBursts(b => [...b, { id, x: e.clientX, y: e.clientY, hearts }]);
    setTimeout(() => setBursts(b => b.filter(z => z.id !== id)), 1200);
  }, []);

  const sayYes = e => { burst(e); setAnswer(true); };

  const toggleMusic = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (music) { a.pause(); setMusic(false); return; }
    try { await a.play(); setMusic(true); } catch { setNoSong(true); }
  };

  const step = useCallback(d => setLightbox(i => (i + d + photos.length) % photos.length), []);

  return (
    <main>
      <div className="progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div className="top-border" />
      <Fallers items={PETALS} className="petal-field" />

      <nav className={`nav ${y > 60 ? 'scrolled' : ''}`}>
        <a className="monogram" href="#home">S <span>♥</span> W</a>
        <div className="links">
          <a href="#story">Our Story</a><a href="#plan">The Plan</a>
          <a href="#gallery">Gallery</a><a href="#rsvp">RSVP</a>
        </div>
      </nav>

      <section id="home" className="hero" ref={heroRef}>
        <div className="hero-copy">
          <p className="eyebrow fade-up" style={{ '--d': '.1s' }}>To My Beautiful Wife, <span className="beat">♥</span></p>
          <h1><Letters text="Will You" /><br /><em><Letters text="Marry Me..." offset={9} /></em></h1>
          <div className="ornament fade-up" style={{ '--d': '1.1s' }}>❧　✦　❧</div>
          <p className="lead fade-up" style={{ '--d': '1.25s' }}>
            You are my today and all of my tomorrows.<br />Let’s begin our forever, together.
          </p>
          <div className="hero-actions fade-up" style={{ '--d': '1.4s' }}>
            <button className="primary glow" onClick={sayYes}>
              <Heart size={17} fill="currentColor" /> Yes, Always
            </button>
            <button className="story-btn" onClick={() => setShowStory(true)}>
              <Play size={15} fill="currentColor" /> Our Story
            </button>
          </div>
        </div>

        <div className="mandap" aria-label="A decorated Hindu wedding mandap framing our photo">
          <div className="roof"><span>✦</span></div>
          <div className="arch">
            <div className="arch-photo">
              <Shot photo={heroPhoto} sizes="(max-width:800px) 70vw, 32vw" priority className="kenburns" />
              <div className="arch-shine" />
            </div>
            <i /><i /><i /><i />
          </div>
          <div className="curtain left" /><div className="curtain right" />
          <div className="fire"><b>✦</b><small>ॐ</small></div>
          <div className="flowers">❀ ❁ ❀<br />❁　❀　❁</div>

          {polaroids.map((p, i) => (
            <figure className={`polaroid p${i + 1}`} key={p.src}>
              <Shot photo={p} sizes="170px" />
            </figure>
          ))}
        </div>

        <a className="scroll-cue" href="#story" aria-label="Scroll down">
          <span>scroll</span><ChevronDown size={17} />
        </a>
      </section>

      <div className="ribbon" aria-hidden="true">
        <div className="ribbon-track">
          {[...photos, ...photos].map((p, i) => (
            <div className="ribbon-item" key={i}>
              <Shot photo={p} sizes="190px" />
            </div>
          ))}
        </div>
      </div>

      <section className="date-card" data-reveal="zoom">
        <p>We are planning our wedding on</p>
        <h2>21<sup>st</sup> February 2027</h2>
        <Countdown />
        <div className="lotus">♧　ॐ　♧</div>
      </section>

      <section id="story" className="story section">
        <div className="photo-stack" data-reveal="left">
          {storyPhotos.map((p, i) => (
            <figure className={`stack-item s${i + 1}`} key={p.src} style={{ '--d': `${i * 0.12}s` }}>
              <Shot photo={p} sizes="(max-width:800px) 45vw, 22vw" />
            </figure>
          ))}
          <span className="stack-heart">♥</span>
        </div>
        <div className="story-copy" data-reveal="right">
          <p className="eyebrow">A little promise</p>
          <h2>Why I Choose You</h2>
          <div className="divider">♥</div>
          <p>You are my best friend, my soulmate, my peace and my greatest adventure.</p>
          <p className="italic">With you, every moment feels like a blessing.</p>
          <button className="text-btn" onClick={() => setShowStory(true)}>
            Read our little story <ChevronDown size={15} />
          </button>
        </div>
      </section>

      <section id="plan" className="section plan">
        <p className="eyebrow" data-reveal="up">Two hearts, one journey</p>
        <h2 data-reveal="up" style={{ '--d': '.08s' }}>Our Plan</h2>
        <div className="divider" data-reveal="up" style={{ '--d': '.16s' }}>♥</div>
        <div className="plan-grid">
          {[
            [<Flower2 key="f" />, 'Sacred Rituals', 'Traditional Hindu wedding with all the beautiful rituals.'],
            [<Users key="u" />, 'Family & Friends', 'Celebrating with our loved ones and seeking their blessings.'],
            [<Gem key="g" />, 'New Beginnings', 'Starting our journey of love, trust and togetherness.'],
            [<InfinityIcon key="i" />, 'Forever Together', 'Building a lifetime of memories, smiles and unconditional love.'],
          ].map(([icon, title, text], i) => (
            <article className="plan-card" key={title} data-reveal="up" style={{ '--d': `${0.1 * i}s` }}>
              <div className="icon">{icon}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery" className="gallery section">
        <p className="eyebrow" data-reveal="up">Every moment so far</p>
        <h2 data-reveal="up" style={{ '--d': '.08s' }}>Our Forever Gallery</h2>
        <div className="divider" data-reveal="up" style={{ '--d': '.16s' }}>♥</div>
        <div className="masonry">
          {photos.map((p, i) => (
            <button className="shot" key={p.src} data-reveal="zoom" style={{ '--d': `${(i % 4) * 0.09}s` }}
              onClick={() => setLightbox(i)} aria-label={`Open photo: ${p.caption}`}>
              <Shot photo={p} sizes="(max-width:500px) 92vw, (max-width:900px) 46vw, 23vw" />
              <span className="cap">{p.caption}</span>
              <span className="shine" />
            </button>
          ))}
        </div>
      </section>

      <section id="rsvp" className="footer">
        <div className="footer-decor" data-reveal="up">❀　❁　❀</div>
        <p className="italic" data-reveal="up" style={{ '--d': '.08s' }}>
          I can’t wait to spend forever with you <span className="beat">♥</span>
        </p>
        <h2 data-reveal="zoom" style={{ '--d': '.14s' }}>I Love You <span className="beat">♥</span></h2>
        <div className="music" data-reveal="up" style={{ '--d': '.2s' }}>
          <button onClick={toggleMusic} aria-label={music ? 'Pause music' : 'Play music'}>
            {music ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          </button>
          <div>
            <strong>{music ? 'Playing our song…' : 'Our little soundtrack'}</strong>
            <small>{noSong ? 'Drop a song.mp3 into /public to hear it ❤️' : 'Tap play when you’re ready ❤️'}</small>
          </div>
          <div className={`bars ${music ? 'on' : ''}`} aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
        <audio ref={audioRef} src="/song.mp3" loop preload="none" onError={() => setNoSong(true)} />
        <p className="tiny">Made with love · 21.02.2027</p>
      </section>

      {bursts.map(b => (
        <div className="burst" key={b.id} style={{ left: b.x, top: b.y }} aria-hidden="true">
          {b.hearts.map((h, i) => (
            <span key={i} style={{ '--a': `${h.a}deg`, '--r': `${h.r}px`, '--s': h.s }}>♥</span>
          ))}
        </div>
      ))}

      {answer && (
        <div className="modal" onClick={() => setAnswer(false)}>
          <Fallers items={CONFETTI} className="confetti" />
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="big-heart">♥</div>
            <p className="eyebrow">I knew it.</p>
            <h2>It’s always been you.</h2>
            <p>Then let’s make 21<sup>st</sup> February 2027 the beginning of our forever.</p>
            <button className="primary glow" onClick={() => setAnswer(false)}>Forever &amp; Always ♥</button>
          </div>
        </div>
      )}

      {showStory && (
        <div className="modal" onClick={() => setShowStory(false)}>
          <div className="modal-card story-modal" onClick={e => e.stopPropagation()}>
            <figure className="modal-photo"><Shot photo={photos[2]} sizes="480px" /></figure>
            <p className="eyebrow">Our Story</p>
            <h2>From “us” to forever.</h2>
            <p>Somehow, in all the noise of life, I found my favourite person. You made ordinary days feel special, and every dream feel a little more possible.</p>
            <p>So here is my simplest question, wrapped in all my love:</p>
            <h3>Will you walk into forever with me?</h3>
            <button className="primary glow" onClick={e => { setShowStory(false); sayYes(e); }}>
              Yes. A thousand times. ♥
            </button>
          </div>
        </div>
      )}

      {lightbox !== null && (
        <Lightbox index={lightbox} onClose={() => setLightbox(null)} onStep={step} />
      )}
    </main>
  );
}
