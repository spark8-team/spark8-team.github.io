/* =========================================================
   SPARK-8 — script.js
   Czysty JavaScript, bez bibliotek. Każda funkcja odpowiada
   za jedną część strony (patrz init na samym dole).
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. ZDJĘCIA: pokaż placeholder, dopóki zdjęcie się nie wczyta ---------- */
  function initImages() {
    $$('.ph img').forEach((img) => {
      const box = img.closest('.ph');
      const loaded = () => box.classList.add('is-loaded');
      const missing = () => box.classList.add('is-missing');
      if (img.complete) {
        img.naturalWidth > 0 ? loaded() : missing();
      }
      img.addEventListener('load', loaded);
      img.addEventListener('error', missing);
    });
  }

  /* ---------- 2. MENU (hamburger na telefonie) ---------- */
  function initNav() {
    const burger = $('.burger');
    const nav = $('#nav');
    const backdrop = $('.nav-backdrop');
    if (!burger || !nav) return;

    const setOpen = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      nav.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
    };

    burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
    backdrop.addEventListener('click', () => setOpen(false));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setOpen(false); burger.focus(); }
    });
    const desktop = window.matchMedia('(min-width: 900px)');
    if (desktop.addEventListener) desktop.addEventListener('change', () => setOpen(false));
  }

  /* ---------- 3. PRZEWIJANIE: pasek postępu, nagłówek, timeline, paralaksa ---------- */
  function initScroll() {
    const bar = $('.progress__bar');
    const header = $('.header');
    const timeline = $('[data-timeline]');
    const tlProgress = $('.timeline__progress');
    const parallaxEls = $$('[data-parallax]');
    // Paralaksa tylko na komputerze z myszką i bez ograniczonego ruchu
    const parallaxMq = window.matchMedia('(min-width: 900px) and (pointer: fine)');
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;

      bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
      header.classList.toggle('is-scrolled', y > 20);

      if (timeline && tlProgress) {
        const r = timeline.getBoundingClientRect();
        const p = clamp((vh * 0.65 - r.top) / r.height, 0, 1);
        tlProgress.style.transform = `scaleY(${p})`;
      }

      if (!reduceMotion && parallaxMq.matches) {
        parallaxEls.forEach((el) => {
          const r = el.parentElement.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) return;
          const speed = parseFloat(el.dataset.parallax) || 0.05;
          const limit = r.height * 0.06;
          const off = clamp((r.top + r.height / 2 - vh / 2) * -speed, -limit, limit);
          el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0) scale(1.14)`;
        });
      } else {
        parallaxEls.forEach((el) => { el.style.transform = ''; });
      }
    };

    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- 4. POJAWIANIE SIĘ ELEMENTÓW PRZY PRZEWIJANIU ---------- */
  function initReveal() {
    // Kaskadowe opóźnienie dla elementów w grupach [data-stagger]
    $$('[data-stagger]').forEach((group) => {
      $$(':scope > .reveal', group).forEach((el, i) => {
        el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
      });
    });

    const els = $$('.reveal, .tl-item');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 5. LICZNIKI (odliczanie od zera) ---------- */
  function initCounters() {
    const els = $$('[data-count]');
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    els.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 6. HERO: sekwencja "uruchamiania systemu" i glitch ---------- */
  function initHero() {
    const hero = $('.hero');
    const boot = $('[data-boot]');
    const title = $('.glitch');
    if (!hero) return;

    // Linijki sekwencji startowej — możesz je zmienić
    const lines = [
      ['> init spark-8', 'OK'],
      ['> wifi 5 GHz · latency ~3 ms', 'OK'],
      ['> axis 1–5 · encoders', 'OK'],
      ['> master arm sync', 'READY'],
    ];
    const done = (txt, status) => `${txt} <span class="ok">[${status}]</span>`;

    const glitch = () => {
      if (!title) return;
      title.classList.remove('is-glitching');
      void title.offsetWidth; // restart animacji
      title.classList.add('is-glitching');
    };

    if (reduceMotion) {
      if (boot) boot.innerHTML = lines.map(([t, s]) => done(t, s)).join('\n');
      hero.classList.add('is-booted');
      return;
    }

    // Napis pojawia się od razu, a sekwencja pisze się w tle
    setTimeout(() => hero.classList.add('is-booted'), 350);
    setTimeout(glitch, 1300);
    setInterval(() => { if (!document.hidden && window.scrollY < window.innerHeight) glitch(); }, 6500);

    if (!boot) return;
    const finished = [];
    let line = 0;
    let char = 0;

    const render = (current) => {
      boot.innerHTML = [...finished, `${current}<span class="caret"></span>`].join('\n');
    };
    const type = () => {
      if (line >= lines.length) {
        boot.innerHTML = finished.join('\n');
        return;
      }
      const [txt, status] = lines[line];
      char++;
      if (char >= txt.length) {
        finished.push(done(txt, status));
        line++;
        char = 0;
        render('');
        setTimeout(type, 160);
      } else {
        render(txt.slice(0, char));
        setTimeout(type, 22);
      }
    };
    setTimeout(type, 200);
  }

  /* ---------- 7. GALERIA: lightbox ---------- */
  function initLightbox() {
    const lb = $('#lightbox');
    const items = $$('.g-item');
    if (!lb || !items.length) return;

    const fig = $('.lightbox__figure', lb);
    const img = $('img', lb);
    const cap = $('.lightbox__cap', lb);
    const closeBtn = $('.lightbox__close', lb);
    let index = 0;
    let lastFocus = null;

    const pad = (n) => String(n).padStart(2, '0');
    const show = (i) => {
      index = (i + items.length) % items.length;
      const item = items[index];
      const src = item.getAttribute('href');
      const alt = ($('img', item) || {}).alt || '';
      fig.classList.remove('is-missing');
      fig.dataset.missing = `Brak zdjęcia: ${src}`;
      img.src = src;
      img.alt = alt;
      cap.textContent = `${pad(index + 1)} / ${pad(items.length)} · ${alt}`;
    };
    img.addEventListener('error', () => fig.classList.add('is-missing'));
    img.addEventListener('load', () => fig.classList.remove('is-missing'));

    const open = (i) => {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('menu-open');
      closeBtn.focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('menu-open');
      if (lastFocus) lastFocus.focus();
    };

    items.forEach((item, i) => item.addEventListener('click', (e) => { e.preventDefault(); open(i); }));
    closeBtn.addEventListener('click', close);
    $('.lightbox__prev', lb).addEventListener('click', () => show(index - 1));
    $('.lightbox__next', lb).addEventListener('click', () => show(index + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    // Przesuwanie palcem na telefonie
    let startX = null;
    lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- 8. DROBIAZGI ---------- */
  function initMisc() {
    const year = $('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ---------- START ---------- */
  initImages();
  initNav();
  initHero();
  initReveal();
  initCounters();
  initScroll();
  initLightbox();
  initMisc();
})();
