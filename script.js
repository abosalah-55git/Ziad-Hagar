/* ==========================================================
   حكايتنا | Ziad ♥ Hagar
   ==========================================================
   إعدادات سهلة التعديل
   ========================================================== */
const CONFIG = {
  TIME_ZONE: "Africa/Cairo",
  // تاريخ بداية التعارف (بتوقيت القاهرة): السنة، الشهر، اليوم، الساعة، الدقيقة، الثانية
  START: { year: 2025, month: 8, day: 5, hour: 0, minute: 0, second: 0 },
  // عيد حكايتنا السنوي (افتراضيًا نفس يوم وشهر البداية). غيّريهم لو عايزة تاريخ تاني.
  ANNIVERSARY: { month: 8, day: 5 },
  TYPING_SPEED_MS: 24, // سرعة كتابة الرسالة
};

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReducedMotion = () => reduceMotionQuery.matches;

  /* ==========================================================
     التوقيت: تحويل وقت القاهرة المحلي إلى لحظة UTC دقيقة
     (بيراعي قواعد التوقيت الصيفي عن طريق Intl)
     ========================================================== */
  function getZoneOffsetMs(utcMs) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: CONFIG.TIME_ZONE,
        hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).formatToParts(new Date(utcMs));
      const v = {};
      parts.forEach((p) => { if (p.type !== "literal") v[p.type] = parseInt(p.value, 10); });
      const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second);
      return asUtc - Math.floor(utcMs / 1000) * 1000;
    } catch (e) {
      return 3 * 3600 * 1000; // احتياطي لو المتصفح قديم (توقيت مصر الصيفي)
    }
  }

  function zonedTimeToUtc(y, mo, d, h, mi, s) {
    const guess = Date.UTC(y, mo - 1, d, h || 0, mi || 0, s || 0);
    let utc = guess - getZoneOffsetMs(guess);
    utc = guess - getZoneOffsetMs(utc); // تصحيح ثاني عند حدود التوقيت الصيفي
    return utc;
  }

  function zonedNowParts(nowMs) {
    const shifted = new Date(nowMs + getZoneOffsetMs(nowMs));
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
  }

  const S = CONFIG.START;
  const startMs = zonedTimeToUtc(S.year, S.month, S.day, S.hour, S.minute, S.second);

  function splitDuration(totalMs) {
  const sec = Math.max(0, Math.floor(totalMs / 1000));
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor(sec / 3600),
    minutes: Math.floor(sec / 60),
    seconds: sec,
  };
}
  function nextAnniversaryMs(nowMs) {
    const { month, day } = CONFIG.ANNIVERSARY;
    const today = zonedNowParts(nowMs);
    let year = today.year;
    let target = zonedTimeToUtc(year, month, day, 0, 0, 0);
    if (target <= nowMs) target = zonedTimeToUtc(year + 1, month, day, 0, 0, 0);
    return target;
  }

  /* ==========================================================
     تحديث العدادات
     ========================================================== */
  function makeCounter(prefix) {
    const els = {
      days: $(prefix + "-days"), hours: $(prefix + "-hours"),
      minutes: $(prefix + "-minutes"), seconds: $(prefix + "-seconds"),
    };
    return function render(values) {
      Object.keys(els).forEach((key) => {
        const el = els[key];
        if (!el) return;
        let text;
        if (values === null) text = "--";
        else if (key === "days") text = values.days.toLocaleString("en-US");
        else text = values[key].toLocaleString("en-US");
        if (el.textContent !== text) {
          el.textContent = text;
          if (!prefersReducedMotion() && values !== null) {
            el.classList.remove("bump");
            void el.offsetWidth;
            el.classList.add("bump");
          }
        }
      });
    };
  }

  const renderElapsed = makeCounter("c");
  const renderAnniv = makeCounter("a");
  const counterNote = $("counter-note");
  const annivBox = $("anniv");
  const annivNote = $("anniv-note");

  function noteForDays(days) {
    if (days < 30) return "لسه في أول الحكاية، وكل يوم بيزودها حلاوة.";
    if (days < 180) return "الأيام بتعدّي، والحكاية بتكبر معاها.";
    if (days < 365) return "قربنا نكمّل سنة من الحكاية.";
    return "الأيام بقت سنين، ولسه فيه أحلى جاي.";
  }

  function updateCounters() {
    const now = Date.now();

    if (Number.isNaN(startMs)) {
      renderElapsed(null);
      if (counterNote) counterNote.textContent = "تاريخ البداية مش مضبوط، راجعي الإعدادات في script.js";
    } else if (now < startMs) {
      renderElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      if (counterNote) counterNote.textContent = "الحكاية لسه هتبدأ…";
    } else {
      const d = splitDuration(now - startMs);
      renderElapsed(d);
      if (counterNote) counterNote.textContent = noteForDays(d.days);
    }

    if (annivBox) {
      const a = CONFIG.ANNIVERSARY;
      const valid = a && a.month >= 1 && a.month <= 12 && a.day >= 1 && a.day <= 31;
      if (!valid) { annivBox.hidden = true; return; }
      const today = zonedNowParts(now);
      if (today.month === a.month && today.day === a.day) {
        renderAnniv({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (annivNote) annivNote.textContent = "النهاردة عيد حكايتنا ❤️";
      } else {
        renderAnniv(splitDuration(nextAnniversaryMs(now) - now));
        if (annivNote) annivNote.textContent = "";
      }
    }
  }

  function startClock() {
    updateCounters();
    const loop = () => {
      updateCounters();
      setTimeout(loop, 1000 - (Date.now() % 1000));
    };
    setTimeout(loop, 1000 - (Date.now() % 1000));
  }

  /* ==========================================================
     التأثيرات: قلوب ولمعان (عدد محدود)
     ========================================================== */
  const ambient = $("ambient");
  const burstLayer = $("burst-layer");
  const MAX_AMBIENT = 10;

  function spawnFx(layer, type, opts) {
    const el = document.createElement("span");
    el.className = type === "heart" ? "fx-heart" : "fx-spark";
    if (type === "heart") {
      el.textContent = "♥";
      el.style.fontSize = (opts.size || 16) + "px";
      el.style.animationDuration = (opts.duration || 10) + "s";
    } else {
      el.style.top = Math.random() * 100 + "%";
    }
    el.style.left = Math.random() * 100 + "%";
    if (opts.delay) el.style.animationDelay = opts.delay + "s";
    el.addEventListener("animationend", () => el.remove(), { once: true });
    layer.appendChild(el);
  }

  function startAmbient() {
    if (!ambient || prefersReducedMotion()) return;
    setInterval(() => {
      if (document.hidden || prefersReducedMotion()) return;
      if (ambient.querySelectorAll(".fx-heart, .fx-spark").length >= MAX_AMBIENT) return;
      if (Math.random() < 0.6) {
        spawnFx(ambient, "heart", { size: 12 + Math.random() * 14, duration: 9 + Math.random() * 6 });
      } else {
        spawnFx(ambient, "spark", {});
      }
    }, 1600);
  }

  function burstHearts(count) {
    if (!burstLayer || prefersReducedMotion()) return;
    for (let i = 0; i < count; i++) {
      spawnFx(burstLayer, "heart", {
        size: 14 + Math.random() * 24,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 1.2,
      });
    }
    for (let i = 0; i < 10; i++) spawnFx(burstLayer, "spark", { delay: Math.random() * 1.5 });
  }

  /* ==========================================================
     ظهور العناصر عند النزول (Intersection Observer)
     ========================================================== */
  function setupReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  }

  /* ==========================================================
     الصور: حالة الصورة الناقصة
     ========================================================== */
  function setupImageFallbacks() {
    document.querySelectorAll(".photo-frame img").forEach((img) => {
      const frame = img.closest(".photo-frame");
      const holder = img.closest(".photo-btn") || frame;
      const markMissing = () => { frame.classList.add("is-missing"); holder.classList.add("is-missing"); };
      img.addEventListener("error", markMissing);
      img.addEventListener("load", () => { frame.classList.remove("is-missing"); holder.classList.remove("is-missing"); });
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markMissing();
    });
  }

  /* ==========================================================
     عرض الصورة بحجم كبير (Lightbox)
     ========================================================== */
  const lightbox = $("lightbox");
  const lbImg = $("lb-img");
  const lbCaption = $("lb-caption");
  const lbClose = $("lb-close");
  let lastFocused = null;

  function openLightbox(button) {
    if (!lightbox || !lbImg) return;
    const img = button.querySelector("img");
    if (!img || button.classList.contains("is-missing")) return;
    lastFocused = document.activeElement;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    const figure = button.closest("figure");
    const cap = figure ? figure.querySelector("figcaption") : null;
    lbCaption.textContent = cap ? cap.textContent : "";
    lightbox.hidden = false;
    document.body.classList.add("no-scroll");
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lbImg.removeAttribute("src");
    document.body.classList.remove("no-scroll");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus({ preventScroll: true });
  }

  function setupLightbox() {
    document.querySelectorAll(".photo-btn").forEach((btn) => {
      btn.addEventListener("click", () => openLightbox(btn));
    });
    if (!lightbox) return;
    lbClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.classList.contains("lb-figure")) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "Tab") { e.preventDefault(); lbClose.focus(); } // التركيز يفضل جوه النافذة
    });
  }

  /* ==========================================================
     الرسالة: مظروف + كتابة تدريجية
     ========================================================== */
  const letterOpen = $("letter-open");
  const letterPanel = $("letter-panel");
  const letterBody = $("letter-body");
  const letterReplay = $("letter-replay");
  const letterClose = $("letter-close");
  const envelope = $("envelope");
  let letterTexts = [];
  let typingToken = 0;

  function showFullLetter() {
    typingToken++;
    if (!letterBody) return;
    letterBody.querySelectorAll("p").forEach((p, i) => {
      p.textContent = letterTexts[i];
      p.classList.remove("typing-caret");
    });
  }

  function typeLetter() {
    if (!letterBody) return;
    if (prefersReducedMotion()) { showFullLetter(); return; }
    const token = ++typingToken;
    const paragraphs = Array.from(letterBody.querySelectorAll("p"));
    paragraphs.forEach((p) => { p.textContent = ""; p.classList.remove("typing-caret"); });

    let pIndex = 0, cIndex = 0;
    function step() {
      if (token !== typingToken) return;
      if (pIndex >= paragraphs.length) return;
      const p = paragraphs[pIndex];
      const text = letterTexts[pIndex];
      p.classList.add("typing-caret");
      cIndex++;
      p.textContent = text.slice(0, cIndex);
      if (cIndex >= text.length) {
        p.classList.remove("typing-caret");
        pIndex++; cIndex = 0;
        setTimeout(step, 380);
      } else {
        setTimeout(step, CONFIG.TYPING_SPEED_MS);
      }
    }
    step();
  }

  function openLetter() {
    if (!letterPanel || !envelope) return;
    letterOpen.setAttribute("aria-expanded", "true");
    envelope.classList.add("open");
    const delay = prefersReducedMotion() ? 0 : 900;
    setTimeout(() => {
      letterPanel.classList.add("open");
      typeLetter();
      if (!prefersReducedMotion()) {
        setTimeout(() => letterPanel.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      }
    }, delay);
  }

  function closeLetter() {
    showFullLetter(); // نخلي النص كامل مش ناقص لو اتقفلت في النص
    letterPanel.classList.remove("open");
    envelope.classList.remove("open");
    letterOpen.setAttribute("aria-expanded", "false");
    letterOpen.focus({ preventScroll: true });
  }

  function setupLetter() {
    if (!letterBody || !letterOpen) return;
    letterTexts = Array.from(letterBody.querySelectorAll("p")).map((p) => p.textContent);
    letterOpen.addEventListener("click", openLetter);
    letterReplay && letterReplay.addEventListener("click", typeLetter);
    letterClose && letterClose.addEventListener("click", closeLetter);
    // الضغط على الرسالة أثناء الكتابة يعرضها كاملة فورًا
    letterBody.addEventListener("click", showFullLetter);
  }

  /* ==========================================================
     مشغّل الموسيقى
     ========================================================== */
  const song = $("song");
  const musicPlayer = $("music-player");
  const musicBtn = $("music-btn");
  const musicState = $("music-state");
  const musicMsg = $("music-msg");
  let msgTimer = null;

  function showMusicMessage(text) {
    if (!musicMsg) return;
    musicMsg.textContent = text;
    musicMsg.hidden = false;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { musicMsg.hidden = true; }, 6000);
  }

  function renderMusicState(isPlaying) {
    if (!musicBtn) return;
    musicBtn.classList.toggle("playing", isPlaying);
    musicBtn.setAttribute("aria-pressed", String(isPlaying));
    musicBtn.setAttribute("aria-label", isPlaying ? "إيقاف الموسيقى مؤقتًا" : "تشغيل الموسيقى");
    if (musicState) musicState.textContent = isPlaying ? "❚❚" : "▶";
  }

  function tryPlaySong() {
    if (!song) return;
    const attempt = song.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {
        renderMusicState(false);
        showMusicMessage("الأغنية لسه ما اشتغلتش، اضغطي على زرار التشغيل.");
      });
    }
  }

  function setupMusic() {
    if (!song || !musicBtn) return;
    // الحالة بتتغير بس لما المتصفح يأكد فعلًا
    song.addEventListener("playing", () => renderMusicState(true));
    song.addEventListener("pause", () => renderMusicState(false));
    song.addEventListener("error", () => {
      renderMusicState(false);
      showMusicMessage("ملف الأغنية ismi.mp3 مش لاقيينه، اتأكدي إنه في نفس الفولدر.");
    });
    musicBtn.addEventListener("click", () => {
      if (song.paused) tryPlaySong(); else song.pause();
    });
    renderMusicState(false);
  }

  /* ==========================================================
     فتح الهدية
     ========================================================== */
  const giftScreen = $("gift-screen");
  const content = $("content");
  const box = $("box");
  const openBtn = $("open-btn");
  let giftOpened = false;

  function revealContent() {
    if (giftScreen) giftScreen.hidden = true;
    if (content) content.classList.add("revealed");
    if (musicPlayer) musicPlayer.hidden = false;
    window.scrollTo(0, 0);
    setupReveal();
    handleScrollUi();
  }
  // ==========================================================
  // التحقق من باسورد الهدية
  // ==========================================================
  const passwordPanel = $("password-panel");
  const passwordForm = $("password-form");
  const passwordInput = $("password-input");
  const passwordError = $("password-error");

  if (openBtn && passwordPanel && passwordForm) {
    openBtn.addEventListener("click", () => {
      openBtn.hidden = true;
      passwordPanel.hidden = false;
      passwordInput.focus();
    });

    passwordForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (passwordInput.value === "582025") {
        passwordError.hidden = true;
        passwordPanel.hidden = true;
        openGift();
      } else {
        passwordError.hidden = false;
        passwordInput.value = "";
        passwordInput.focus();
      }
    });
  }

  function openGift() {
    if (giftOpened) return; // منع التكرار
    giftOpened = true;
    openBtn.disabled = true;

    tryPlaySong(); // لازم يحصل جوه ضغطة المستخدم نفسها

    box.classList.add("open");
    burstHearts(24);

    const leaveAfter = prefersReducedMotion() ? 200 : 2000;
    const revealAfter = prefersReducedMotion() ? 300 : 2900;
    setTimeout(() => giftScreen.classList.add("leaving"), leaveAfter);
    setTimeout(revealContent, revealAfter);
  }

  /* ==========================================================
     زرار الرجوع لأعلى + ارجعي للبداية
     ========================================================== */
  const toTop = $("to-top");
  const restartBtn = $("restart-btn");
  const introTitle = $("intro-title");

  function scrollToStart() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    if (introTitle) introTitle.focus({ preventScroll: true });
  }

  function handleScrollUi() {
    if (!toTop || !content || !content.classList.contains("revealed")) return;
    toTop.hidden = window.scrollY < 600;
  }

  /* ==========================================================
     تشغيل كل حاجة
     ========================================================== */
  function init() {
    setupImageFallbacks();
    setupLightbox();
    setupLetter();
    setupMusic();
    startClock();
    startAmbient();

    // لو الصفحة شغالة من غير JS كامل أو بدون gift-screen
    if (!giftScreen || !openBtn || !box) {
      if (content) content.classList.add("revealed");
      setupReveal();
    } 

    toTop && toTop.addEventListener("click", scrollToStart);
    restartBtn && restartBtn.addEventListener("click", scrollToStart);
    window.addEventListener("scroll", handleScrollUi, { passive: true });
  }

  init();
})();
