import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import heroImage from "../images/hero-2.avif";
import heroImage2 from "../images/hero-image.avif";
import stepImg1 from "../images/step1.jpg";
import stepImg2 from "../images/step2.jpg";
import stepImg3 from "../images/step3.jpg";
import stepImg4 from "../images/step4.jpg";
import featureImg from "../images/image4.avif";
import phoneImg from "../images/image5.png";

const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const useScrollProgress = () => {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const winH = window.innerHeight;
      const elementCenter = rect.top + rect.height / 2;
      const raw = (winH - elementCenter) / (winH * 0.5);
      setProgress(Math.min(1, Math.max(0, raw)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return [ref, progress];
};

// ── Icons ───────────────────────────────────────────────────────────────────
const ListIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 12H3M16 6H3M16 18H3" />
    <path d="m19 10 2 2-4 4" />
  </svg>
);
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const HandshakeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m11 17 2 2a1 1 0 1 0 3-3" />
    <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
    <path d="m21 3 1 11h-2" />
    <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
    <path d="M3 4h8" />
  </svg>
);
const SparkleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);
const TagIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.29-7.29a1 1 0 0 0 0-1.41L12 2z" />
    <path d="M7 7h.01" />
  </svg>
);
const BoxIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </svg>
);
const BagIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const PctIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);
const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
const StarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ORBIT_ICONS = [
  { Icon: TagIcon, angle: 0 },
  { Icon: BoxIcon, angle: 60 },
  { Icon: BagIcon, angle: 120 },
  { Icon: PctIcon, angle: 180 },
  { Icon: RefreshIcon, angle: 240 },
  { Icon: StarIcon, angle: 300 },
];

const OrbitRing = () => {
  const R = 100,
    SIZE = R * 2 + 56;
  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        fill="none"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="hsl(var(--primary)/0.3)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
      </svg>
      <div className="relative z-10 w-24 h-24 rounded-full border-4 border-primary/20 bg-primary/10 flex flex-col items-center justify-center shadow-lg">
        <p className="text-xl font-black text-primary leading-none">100+</p>
        <p className="text-[9px] font-semibold text-foreground/60 uppercase tracking-wide text-center leading-tight mt-0.5">
          items
          <br />
          daily
        </p>
      </div>
      {ORBIT_ICONS.map(({ Icon, angle }, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = SIZE / 2 + R * Math.cos(rad) - 18;
        const y = SIZE / 2 + R * Math.sin(rad) - 18;
        return (
          <div
            key={i}
            className="absolute flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border shadow-md text-primary"
            style={{
              left: x,
              top: y,
              animation: `orbit-spin 14s linear ${i * (14 / 6)}s infinite`,
              transformOrigin: `${SIZE / 2 - x - 18}px ${SIZE / 2 - y - 18}px`,
            }}
          >
            <Icon />
          </div>
        );
      })}
    </div>
  );
};

const STEPS = [
  {
    label: "LIST YOUR ITEM",
    Icon: ListIcon,
    badge: "Free & instant",
    title: "Post in under 2 minutes",
    desc: "Snap a photo, set your price, and you're live. No fees, no forms — instant listings reaching real buyers.",
    img: stepImg1,
  },
  {
    label: "BUYERS FIND YOU",
    Icon: SearchIcon,
    badge: "Smart matching",
    title: "Thousands of eyes on your stuff",
    desc: "Buyers browse daily. Your item gets matched to people actively searching for what you're selling.",
    img: stepImg2,
  },
  {
    label: "CLOSE THE DEAL",
    Icon: HandshakeIcon,
    badge: "You're in control",
    title: "Chat, agree, exchange",
    desc: "Message directly, agree on price, hand it over. Cash in hand, clutter gone. Simple as that.",
    img: stepImg3,
  },
  {
    label: "DO IT AGAIN!",
    Icon: SparkleIcon,
    badge: "Avg ₦18k earned",
    title: "Your home, lighter & richer",
    desc: "Most sellers list multiple times. Every item cleared is money in your pocket and space reclaimed.",
    img: stepImg4,
  },
];

// ── Typewriter ──────────────────────────────────────────────────────────────
const CYCLE_WORDS = [
  "More space,",
  "More money,",
  "Less clutter,",
  "Fresh start,",
  "New chapter,",
];
const TypewriterWord = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = CYCLE_WORDS[wordIndex];
    let t;
    if (!deleting && displayed.length < word.length)
      t = setTimeout(
        () => setDisplayed(word.slice(0, displayed.length + 1)),
        130,
      );
    else if (!deleting && displayed.length === word.length)
      t = setTimeout(() => setDeleting(true), 2200);
    else if (deleting && displayed.length > 0)
      t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 80);
    else
      t = setTimeout(() => {
        setDeleting(false);
        setWordIndex((i) => (i + 1) % CYCLE_WORDS.length);
      }, 400);
    return () => clearTimeout(t);
  }, [displayed, deleting, wordIndex]);
  return (
    <span className="text-primary inline-block min-w-[6ch]">
      {displayed}
      <span
        className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-middle"
        style={{ animation: "blink-cursor 0.75s step-end infinite" }}
      />
    </span>
  );
};

// ── Stacked → spread cards ──────────────────────────────────────────────────
const StackedCards = () => {
  const [ref, progress] = useScrollProgress();
  const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
  const p = ease(progress);
  const TEXT_H = 110;

  return (
    <div ref={ref} className="relative w-full py-4">
      <div className="grid grid-cols-2 gap-x-2 gap-y-5 sm:gap-x-3 sm:gap-y-6 lg:hidden">
        {STEPS.map((step, i) => {
          const contentOpacity = Math.min(1, p * 2.5);
          const animDelay = `${i * 0.12}s`;
          return (
            <div
              key={i}
              className="rounded-xl sm:rounded-2xl overflow-hidden bg-card border border-border flex flex-col"
            >
              <div className="flex items-center justify-between px-2 sm:px-3 py-2 sm:py-2.5 border-b border-border flex-shrink-0 bg-card gap-1">
                <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wide text-foreground/50 leading-tight truncate">
                  {step.label}
                </span>
                <span className="text-primary flex-shrink-0">
                  <step.Icon />
                </span>
              </div>
              <div
                className="relative overflow-hidden flex-shrink-0"
                style={{ height: "clamp(120px, 28vw, 160px)" }}
              >
                <img
                  src={step.img}
                  alt={step.title}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </div>
              <div className="px-2 sm:px-3 pt-1.5 sm:pt-2 flex-shrink-0">
                <span className="inline-block text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 sm:px-2 py-0.5">
                  {step.badge}
                </span>
              </div>
              <div
                className="px-2 sm:px-3 pb-2 sm:pb-3 pt-1 text-center flex-1 flex flex-col justify-start"
                style={{
                  opacity: contentOpacity,
                  animation:
                    contentOpacity > 0.5
                      ? `slide-in-up 0.6s ease-out ${animDelay} both`
                      : "none",
                }}
              >
                <h3 className="text-[9px] sm:text-[10px] font-bold text-foreground mb-0.5 leading-snug">
                  {step.title}
                </h3>
                <p className="text-[7px] sm:text-[8px] text-foreground/55 leading-relaxed line-clamp-3">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="hidden lg:block relative w-full"
        style={{ height: "clamp(280px, 32vw, 440px)" }}
      >
        {STEPS.map((step, i) => {
          const naturalOffsets = [-1.5, -0.5, 0.5, 1.5];
          const partialStart = 0.3;
          const adjustedP = Math.min(1, p + partialStart);
          const currentOffset = naturalOffsets[i] * adjustedP;
          const stackedScale = 1 - Math.abs(i - 1.5) * 0.025 * (1 - adjustedP);
          const zIndex =
            adjustedP < 0.6 ? 4 - Math.round(Math.abs(i - 1.5)) : i + 1;
          const shadowOpacity = 0.12 + (1 - adjustedP) * 0.1;
          const contentOpacity = Math.min(1, p * 2.5);
          const animDelay = `${i * 0.12}s`;
          return (
            <div
              key={i}
              className="absolute top-0 rounded-2xl overflow-hidden bg-card border border-border flex flex-col"
              style={{
                width: "calc(25% - 6px)",
                height: "100%",
                left: "50%",
                transform: `translateX(calc(-50% + ${currentOffset * (100 + 6)}%)) scale(${stackedScale})`,
                zIndex,
                boxShadow: `0 ${6 + (1 - adjustedP) * 6}px ${20 + (1 - adjustedP) * 12}px rgba(0,0,0,${shadowOpacity})`,
              }}
            >
              <div className="flex items-center justify-between px-3 xl:px-4 py-2.5 border-b border-border flex-shrink-0 bg-card gap-1">
                <span className="text-[9px] xl:text-[10px] font-bold uppercase tracking-widest text-foreground/50 leading-tight truncate">
                  {step.label}
                </span>
                <span className="text-primary flex-shrink-0 ml-1">
                  <step.Icon />
                </span>
              </div>
              <div
                className="relative overflow-hidden flex-shrink-0"
                style={{ flex: 1, minHeight: 0 }}
              >
                <img
                  src={step.img}
                  alt={step.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              </div>
              <div className="px-3 xl:px-4 pt-2 flex-shrink-0 bg-card">
                <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                  {step.badge}
                </span>
              </div>
              <div
                className="flex-shrink-0 px-3 xl:px-4 bg-card text-center flex flex-col justify-center"
                style={{
                  height: TEXT_H,
                  opacity: contentOpacity,
                  animation:
                    contentOpacity > 0.5
                      ? `slide-in-up 0.6s ease-out ${animDelay} both`
                      : "none",
                }}
              >
                <h3 className="text-xs xl:text-sm font-bold text-foreground mb-1 leading-snug">
                  {step.title}
                </h3>
                <p className="text-[9px] xl:text-[10px] text-foreground/55 leading-relaxed line-clamp-3">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="hidden lg:flex justify-center mt-3"
        style={{ opacity: Math.max(0, 1 - p * 5), pointerEvents: "none" }}
      >
        <div className="flex flex-col items-center gap-1 text-foreground/40">
          <span className="text-xs font-medium">Scroll to reveal</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-bounce"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// ── Section 4 ────────────────────────────────────────────────────────────────
const Section4 = () => {
  const [ref, inView] = useInView(0.2);
  const [cardPhase, setCardPhase] = useState("hidden");

  useEffect(() => {
    const cycle = () => {
      setCardPhase("hidden");
      setTimeout(() => setCardPhase("left-in"), 600);
      setTimeout(() => setCardPhase("both-in"), 1400);
      setTimeout(() => setCardPhase("out"), 4000);
      setTimeout(() => setCardPhase("hidden"), 4600);
    };
    cycle();
    const interval = setInterval(cycle, 5800);
    return () => clearInterval(interval);
  }, []);

  const FLOAT_ITEMS = [
    { text: "Free to list", pos: "top-4 left-4" },
    { text: "50k+ buyers", pos: "top-4 right-4" },
    { text: "Instant listing", pos: "top-1/2 left-3 -translate-y-1/2" },
    { text: "Zero hidden fees", pos: "top-1/2 right-3 -translate-y-1/2" },
    { text: "Secure deals", pos: "bottom-4 left-4" },
    { text: "Local & nationwide", pos: "bottom-4 right-4" },
  ];

  const imgH = "clamp(380px, 50vw, 520px)";

  return (
    <section
      ref={ref}
      className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-32 py-12 sm:py-16 lg:py-20"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
        <div
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden"
          style={{
            height: imgH,
            opacity: inView ? 1 : 0,
            transform: inView ? "translateX(0)" : "translateX(-40px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          <img
            src={featureImg}
            alt="Features"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-foreground/35 rounded-2xl sm:rounded-3xl" />
          {FLOAT_ITEMS.map(({ text, pos }, i) => (
            <span
              key={i}
              className={`absolute ${pos} bg-card/90 backdrop-blur-sm border border-border rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-foreground shadow-lg z-10 whitespace-nowrap`}
              style={{
                opacity: inView ? 1 : 0,
                transition: `opacity 0.5s ease ${0.3 + i * 0.1}s`,
                animation: `float 3s ease-in-out ${i * 0.5}s infinite`,
              }}
            >
              {text}
            </span>
          ))}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 sm:px-6 lg:px-8 text-center"
            style={{
              opacity: inView ? 1 : 0,
              transition: "opacity 0.7s ease 0.5s",
            }}
          >
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/70 mb-2">
              Why Declutт
            </p>
            <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-snug drop-shadow-lg">
              Everything you need
              <br />
              to <span className="text-primary">sell smarter</span>
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-white/75 max-w-[240px] sm:max-w-xs drop-shadow">
              Built for you. Fast, safe, and completely free to start.
            </p>
            <button className="mt-3 sm:mt-4 main-button text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2">
              Start for free
            </button>
          </div>
        </div>

        <div
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden"
          style={{
            height: imgH,
            opacity: inView ? 1 : 0,
            transform: inView ? "translateX(0)" : "translateX(40px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
        >
          <img
            src={phoneImg}
            alt="Phone mockup"
            className="w-full h-full object-cover object-top"
          />
          <div
            className="absolute left-3 sm:left-4 lg:left-5 bottom-6 sm:bottom-8 lg:bottom-10 bg-card/95 backdrop-blur-sm border border-border rounded-xl sm:rounded-2xl shadow-2xl px-3 sm:px-4 py-2 sm:py-3 w-32 sm:w-40 lg:w-44 z-10"
            style={{
              opacity: cardPhase === "hidden" || cardPhase === "out" ? 0 : 1,
              transform:
                cardPhase === "hidden" || cardPhase === "out"
                  ? "translateX(-80px)"
                  : "translateX(0)",
              transition:
                cardPhase === "left-in" || cardPhase === "both-in"
                  ? "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)"
                  : "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            <p className="text-[8px] sm:text-[9px] text-foreground/50 font-medium mb-0.5 sm:mb-1">
              New message
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-foreground leading-snug">
              Buyer interested!
            </p>
            <p className="text-[8px] sm:text-[9px] text-foreground/60 mt-0.5">
              "Is this still available?"
            </p>
            <span className="inline-block mt-1 sm:mt-1.5 text-[7px] sm:text-[8px] font-bold text-green-600 bg-green-500/10 rounded-full px-1.5 sm:px-2 py-0.5">
              Just now
            </span>
          </div>
          <div
            className="absolute right-3 sm:right-4 lg:right-5 top-6 sm:top-8 lg:top-10 bg-card/95 backdrop-blur-sm border border-border rounded-xl sm:rounded-2xl shadow-2xl px-3 sm:px-4 py-2 sm:py-3 w-32 sm:w-40 lg:w-44 z-10"
            style={{
              opacity: cardPhase === "both-in" ? 1 : 0,
              transform:
                cardPhase === "both-in" ? "translateX(0)" : "translateX(80px)",
              transition:
                cardPhase === "both-in"
                  ? "opacity 0.5s ease 0.1s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s"
                  : "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            <p className="text-[8px] sm:text-[9px] text-foreground/50 font-medium mb-0.5 sm:mb-1">
              Payment received
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-primary">
              ₦45,000
            </p>
            <p className="text-[8px] sm:text-[9px] text-foreground/60 mt-0.5">
              Vintage Sofa sold ✓
            </p>
            <span className="inline-block mt-1 sm:mt-1.5 text-[7px] sm:text-[8px] font-bold text-primary bg-primary/10 rounded-full px-1.5 sm:px-2 py-0.5">
              Completed
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Is it free to list items on Declutт?",
    a: "Yes, completely. Listing your items is 100% free with no hidden charges. You keep everything you earn.",
  },
  {
    q: "How do I get paid when I sell something?",
    a: "You agree on payment directly with the buyer — cash, bank transfer, or any method you both prefer. We don't take a cut.",
  },
  {
    q: "What can I sell on Declutт?",
    a: "Almost anything — furniture, electronics, clothes, appliances, books, bikes, and more. As long as it's legal and secondhand, list it.",
  },
  {
    q: "Is Declutт available outside Ile-Ife?",
    a: "Yes! We started in Ile-Ife and are expanding across Osun State and beyond. Whether you're in Ibadan, Lagos, Abuja, or PH — buyers are near you.",
  },
  {
    q: "How do I know the buyer or seller is legit?",
    a: "Verified profiles, ratings, and an in-app chat system help you vet buyers and sellers before meeting. Always meet in public.",
  },
  {
    q: "How long does it take to sell something?",
    a: "Most items sell within 24–72 hours. Popular categories like electronics and furniture move the fastest.",
  },
];

/* Each FAQ row has its OWN intersection observer — triggers as YOU SCROLL to it */
const FAQItem = ({ q, a, i, open, setOpen }) => {
  const [ref, inView] = useInView(0.3);
  return (
    <div
      ref={ref}
      className="border-b border-border/60 last:border-0"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`,
      }}
    >
      <button
        onClick={() => setOpen(open === i ? null : i)}
        className="w-full flex items-center justify-between py-5 text-left gap-6 group"
      >
        <span className="text-sm sm:text-base font-medium text-foreground group-hover:text-primary transition-colors duration-200">
          {q}
        </span>
        <span
          className="flex-shrink-0 text-foreground/40 group-hover:text-primary transition-all duration-300"
          style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div
        style={{
          maxHeight: open === i ? "300px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <p className="pb-5 text-sm text-foreground/60 leading-relaxed">{a}</p>
      </div>
    </div>
  );
};

const FAQSection = () => {
  const [ref, inView] = useInView(0.1);
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = FAQS.filter(
    ({ q, a }) =>
      q.toLowerCase().includes(search.toLowerCase()) ||
      a.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section
      ref={ref}
      className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-32 py-12 sm:py-16 pb-20 sm:pb-28"
    >
      {/* Header — single title only */}
      <div
        className="text-center mb-8 sm:mb-10"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Search box */}
        <div
          className="relative mb-8 sm:mb-10"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s",
          }}
        >
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search for your most important questions"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(null);
            }}
            className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
          />
        </div>

        {/* FAQ items — each animates in individually with stagger */}
        {filtered.length > 0 ? (
          filtered.map(({ q, a }, i) => (
            <FAQItem key={q} q={q} a={a} i={i} open={open} setOpen={setOpen} />
          ))
        ) : (
          <div
            className="py-10 text-center text-sm text-foreground/55"
            style={{
              opacity: inView ? 1 : 0,
              transition: "opacity 0.5s ease 0.2s",
            }}
          >
            No results found here, visit our{" "}
            <a href="/faq" className="text-primary font-medium hover:underline">
              FAQ page
            </a>{" "}
            for more information.
          </div>
        )}
      </div>
    </section>
  );
};

// ── Reviews ───────────────────────────────────────────────────────────────────
// ── Reviews ───────────────────────────────────────────────────────────────────
const REVIEWS = [
  {
    name: "Amaka Obi",
    initials: "AO",
    stars: 5,
    time: "2 days ago",
    text: "Listed my sofa on Monday, sold it by Tuesday evening. I genuinely couldn't believe how fast it went. Declutт is the real deal.",
  },
  {
    name: "Tunde Bello",
    initials: "TB",
    stars: 5,
    time: "5 days ago",
    text: "Found a Canon DSLR in mint condition for half the store price. Seller was 100% legit. Will definitely buy again.",
  },
  {
    name: "Chisom Eze",
    initials: "CE",
    stars: 4,
    time: "1 week ago",
    text: "Got ₦35k for a standing desk I no longer needed. Super easy process, zero stress from start to finish.",
  },
  {
    name: "Fatima Kwari",
    initials: "FK",
    stars: 5,
    time: "3 days ago",
    text: "This app is a gem. Got a mountain bike at an unbeatable price. The platform is clean, safe and so easy to use.",
  },
  {
    name: "David Musa",
    initials: "DM",
    stars: 5,
    time: "just now",
    text: "Sold my iPhone 13 within hours. Buyer was verified, payment instant. Absolutely love Declutт.",
  },
  {
    name: "Ngozi Adeyemi",
    initials: "NA",
    stars: 4,
    time: "2 weeks ago",
    text: "Beautiful dining set, great price. Seller's photos matched perfectly. A very trustworthy platform.",
  },
];

const StarRow = ({ count, size = 13 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={i < count ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

const ReviewsSection = () => {
  const [ref, inView] = useInView(0.1);
  const [active, setActive] = useState(0);

  // Auto-rotate featured review
  useEffect(() => {
    const t = setInterval(
      () => setActive((p) => (p + 1) % REVIEWS.length),
      4500,
    );
    return () => clearInterval(t);
  }, []);

  const featured = REVIEWS[active];

  return (
    <section
      ref={ref}
      className="w-full py-16 sm:py-20 relative overflow-hidden"
      style={{ background: "hsl(27 30% 12%)" }}
    >
      {/* ── Rich visible effects layer ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* === FLOATING ORBS — 5 of them, various sizes === */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(180px,30vw,360px)",
            height: "clamp(180px,30vw,360px)",
            background:
              "radial-gradient(circle, hsl(35 85% 60% / 0.55) 0%, transparent 68%)",
            top: "-5%",
            left: "-3%",
            animation: "orb-float-1 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(140px,22vw,280px)",
            height: "clamp(140px,22vw,280px)",
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 68%)",
            bottom: "0%",
            right: "-2%",
            animation: "orb-float-2 11s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(100px,16vw,200px)",
            height: "clamp(100px,16vw,200px)",
            background:
              "radial-gradient(circle, hsl(20 75% 55% / 0.45) 0%, transparent 68%)",
            top: "35%",
            right: "20%",
            animation: "orb-float-3 7s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(80px,12vw,160px)",
            height: "clamp(80px,12vw,160px)",
            background:
              "radial-gradient(circle, hsl(40 80% 65% / 0.4) 0%, transparent 68%)",
            bottom: "20%",
            left: "30%",
            animation: "orb-float-4 13s ease-in-out infinite 2s",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(60px,10vw,130px)",
            height: "clamp(60px,10vw,130px)",
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 68%)",
            top: "15%",
            left: "45%",
            animation: "orb-float-1 6s ease-in-out infinite 1s",
          }}
        />

        {/* === PULSING RING — center background === */}
        <div
          className="absolute rounded-full border-2 border-primary/20"
          style={{
            width: "clamp(200px,40vw,500px)",
            height: "clamp(200px,40vw,500px)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            animation: "pulse-ring 4s ease-out infinite",
          }}
        />
        <div
          className="absolute rounded-full border border-primary/10"
          style={{
            width: "clamp(300px,55vw,700px)",
            height: "clamp(300px,55vw,700px)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            animation: "pulse-ring 4s ease-out infinite 1.3s",
          }}
        />
        <div
          className="absolute rounded-full border border-primary/8"
          style={{
            width: "clamp(400px,70vw,900px)",
            height: "clamp(400px,70vw,900px)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            animation: "pulse-ring 4s ease-out infinite 2.6s",
          }}
        />

        {/* === RISING PARTICLES — 16 across full width === */}
        {[
          { left: "5%", delay: "0s", size: 4, dur: "5s" },
          { left: "12%", delay: "1.4s", size: 3, dur: "7s" },
          { left: "19%", delay: "0.6s", size: 5, dur: "6s" },
          { left: "26%", delay: "2.2s", size: 3, dur: "8s" },
          { left: "33%", delay: "0.3s", size: 6, dur: "5.5s" },
          { left: "40%", delay: "1.8s", size: 4, dur: "7.5s" },
          { left: "47%", delay: "3s", size: 3, dur: "6.5s" },
          { left: "54%", delay: "0.9s", size: 5, dur: "9s" },
          { left: "61%", delay: "2.5s", size: 4, dur: "6s" },
          { left: "68%", delay: "1.1s", size: 3, dur: "7s" },
          { left: "74%", delay: "0.4s", size: 5, dur: "5.5s" },
          { left: "80%", delay: "1.7s", size: 4, dur: "8s" },
          { left: "86%", delay: "2.8s", size: 3, dur: "6.5s" },
          { left: "91%", delay: "0.7s", size: 5, dur: "7.5s" },
          { left: "96%", delay: "1.3s", size: 3, dur: "9s" },
          { left: "57%", delay: "3.5s", size: 6, dur: "6s" },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              bottom: "-8px",
              background:
                i % 3 === 0
                  ? "hsl(var(--primary))"
                  : i % 3 === 1
                    ? "hsl(35 85% 65%)"
                    : "hsl(20 70% 60%)",
              opacity: 0,
              animation: `rise-particle ${p.dur} ease-in ${p.delay} infinite`,
            }}
          />
        ))}

        {/* === SHIMMER SWEEP — slow diagonal light === */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, hsl(40 90% 80% / 0.08) 50%, transparent 70%)",
            animation: "shimmer-sweep 7s ease-in-out infinite",
          }}
        />

        {/* === HORIZONTAL SCAN LINE — subtle moving bar === */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--primary)/0.4), hsl(35 80% 65%/0.5), hsl(var(--primary)/0.4), transparent)",
            animation: "scan-line 8s linear infinite",
            top: 0,
          }}
        />

        {/* === CORNER SPARKLES === */}
        {[
          { top: "8%", left: "8%", delay: "0s" },
          { top: "12%", right: "12%", delay: "1.5s" },
          { bottom: "12%", left: "15%", delay: "0.8s" },
          { bottom: "8%", right: "8%", delay: "2s" },
          { top: "45%", left: "2%", delay: "1.2s" },
          { top: "55%", right: "2%", delay: "2.5s" },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              ...s,
              width: 6,
              height: 6,
              animation: `sparkle 3s ease-in-out ${s.delay} infinite`,
            }}
          >
            <div
              className="w-full h-full rotate-45 bg-primary/60 rounded-sm"
              style={{
                animation: `sparkle-inner 3s ease-in-out ${s.delay} infinite`,
              }}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes orb-float-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(clamp(10px,3vw,40px), clamp(-8px,-2vw,-25px)) scale(1.08); }
          66%      { transform: translate(clamp(-8px,-2vw,-20px), clamp(10px,2vw,30px)) scale(0.94); }
        }
        @keyframes orb-float-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(clamp(-15px,-3vw,-30px), clamp(-12px,-2vw,-35px)) scale(1.1); }
          70%      { transform: translate(clamp(8px,2vw,25px), clamp(8px,1.5vw,20px)) scale(0.93); }
        }
        @keyframes orb-float-3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(clamp(-10px,-2vw,-25px), clamp(-10px,-2vw,-30px)) scale(1.15); }
        }
        @keyframes orb-float-4 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(clamp(8px,2vw,20px), clamp(-12px,-2vw,-25px)) scale(1.06); }
          70%      { transform: translate(clamp(-12px,-2vw,-22px), clamp(8px,1vw,18px)) scale(0.96); }
        }
        @keyframes pulse-ring {
          0%   { opacity: 0.6; transform: translate(-50%,-50%) scale(0.85); }
          70%  { opacity: 0; }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.2); }
        }
        @keyframes rise-particle {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          8%   { opacity: 0.7; }
          85%  { opacity: 0.15; }
          100% { transform: translateY(-500px) scale(0.2); opacity: 0; }
        }
        @keyframes shimmer-sweep {
          0%   { transform: translateX(-120%); }
          60%  { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes scan-line {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes sparkle {
          0%,100% { opacity: 0; transform: scale(0.5); }
          50%      { opacity: 1; transform: scale(1.2); }
        }
        @keyframes sparkle-inner {
          0%,100% { transform: rotate(45deg) scale(1); }
          50%      { transform: rotate(225deg) scale(1.3); }
        }
      `}</style>

      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-32">
        {/* Section label */}
        <div
          className="mb-8 sm:mb-10"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            Reviews
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            What people are saying
          </h2>
        </div>

        {/* Split layout — stacks on mobile/tablet, side-by-side on lg+ */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-5 sm:gap-6">
          {/* LEFT — featured big quote (frosted glass) */}
          <div
            className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[280px] sm:min-h-[340px] lg:min-h-[420px] overflow-hidden order-1"
            style={{
              background: "rgba(255,255,255,0.09)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.15)",
              opacity: inView ? 1 : 0,
              transform: inView ? "translateX(0)" : "translateX(-30px)",
              transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl sm:rounded-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 0% 0%, hsl(var(--primary)/0.15) 0%, transparent 55%)",
              }}
            />
            <span
              className="absolute top-3 right-5 leading-none font-serif select-none pointer-events-none"
              style={{
                fontSize: "clamp(80px,12vw,120px)",
                color: "rgba(255,255,255,0.06)",
                lineHeight: 1,
              }}
              aria-hidden
            >
              "
            </span>

            {/* Stars */}
            <StarRow count={featured.stars} size={16} />

            {/* Quote text */}
            <p
              key={active}
              className="text-base sm:text-lg lg:text-xl xl:text-2xl font-medium text-white/90 leading-snug flex-1 my-5 sm:my-6"
              style={{ animation: "fade-in 0.5s ease" }}
            >
              "{featured.text}"
            </p>

            {/* Person + nav dots */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-bold border border-white/20 flex-shrink-0">
                  {featured.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {featured.name}
                  </p>
                  <p className="text-[11px] text-white/40">{featured.time}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {REVIEWS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === active ? "20px" : "6px",
                      height: "6px",
                      background:
                        i === active
                          ? "hsl(var(--primary))"
                          : "rgba(255,255,255,0.25)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — mini review cards, 2-col on sm/md, single col on mobile & lg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 order-2">
            {REVIEWS.filter((_, i) => i !== active)
              .slice(0, 4)
              .map((r, i) => (
                <button
                  key={r.name}
                  onClick={() => setActive(REVIEWS.indexOf(r))}
                  className="text-left rounded-xl px-4 py-3.5 flex items-start gap-3 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    opacity: inView ? 1 : 0,
                    transform: inView ? "translateX(0)" : "translateX(30px)",
                    transition: `opacity 0.5s ease ${0.15 + i * 0.1}s, transform 0.5s ease ${0.15 + i * 0.1}s`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)";
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-white/15 mt-0.5">
                    {r.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {r.name}
                      </p>
                      <StarRow count={r.stars} size={10} />
                    </div>
                    <p className="text-[11px] text-white/50 leading-snug line-clamp-2">
                      {r.text}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const NOTIFICATIONS = [
  {
    name: "Amara O.",
    item: "Vintage Leather Sofa",
    time: "2 mins ago",
    avatar: "AO",
  },
  {
    name: "Tunde B.",
    item: "Canon DSLR Camera",
    time: "5 mins ago",
    avatar: "TB",
  },
  { name: "Chisom E.", item: "Standing Desk", time: "just now", avatar: "CE" },
  { name: "Fatima K.", item: "Mountain Bike", time: "1 min ago", avatar: "FK" },
  { name: "David M.", item: "iPhone 13 Pro", time: "3 mins ago", avatar: "DM" },
  {
    name: "Ngozi A.",
    item: "Dining Table Set",
    time: "just now",
    avatar: "NA",
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
export const HomeSection = () => {
  const [activeImage, setActiveImage] = useState(0);
  const [imgProgress, setImgProgress] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastAnimating, setToastAnimating] = useState(false);
  const [currentNotif, setCurrentNotif] = useState(0);

  const [bannerRef, bannerInView] = useInView(0.15);
  const [headerRef, headerInView] = useInView(0.3);

  const images = [heroImage, heroImage2];
  const DURATION = 5000;

  useEffect(() => {
    setImgProgress(0);
    const pi = setInterval(
      () => setImgProgress((p) => (p >= 100 ? 100 : p + 100 / (DURATION / 50))),
      50,
    );
    const it = setTimeout(
      () => setActiveImage((p) => (p === 0 ? 1 : 0)),
      DURATION,
    );
    return () => {
      clearInterval(pi);
      clearTimeout(it);
    };
  }, [activeImage]);

  useEffect(() => {
    const show = () => {
      setToastVisible(true);
      setTimeout(() => setToastAnimating(true), 10);
      // Auto-hide after 6s
      setTimeout(() => {
        setToastAnimating(false);
        setTimeout(() => {
          setToastVisible(false);
          setCurrentNotif((p) => (p + 1) % NOTIFICATIONS.length);
        }, 400);
      }, 6000);
    };
    const t1 = setTimeout(show, 2500);
    const t2 = setInterval(show, 30000); // next notification every 30 seconds
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, []);

  const dismissToast = () => {
    setToastAnimating(false);
    setTimeout(() => {
      setToastVisible(false);
      setCurrentNotif((p) => (p + 1) % NOTIFICATIONS.length);
    }, 400);
  };

  const n = NOTIFICATIONS[currentNotif];

  return (
    <>
      {/* ════════ SECTION 1 — Hero ════════ */}
      <section className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-32 py-16 sm:py-20">
        <div className="w-full flex flex-col-reverse md:flex-row items-center justify-between gap-8 sm:gap-10 md:gap-12 lg:gap-16 xl:gap-20 2xl:gap-28">
          <div className="flex-1 text-center md:text-left relative w-full">
            <div
              className="hero-grid absolute z-0"
              style={{
                top: "-60px",
                bottom: "-60px",
                left: "-40px",
                right: "-40px",
                WebkitMaskImage:
                  "radial-gradient(ellipse at 50% 50%, black 55%, transparent 85%)",
                maskImage:
                  "radial-gradient(ellipse at 50% 50%, black 55%, transparent 85%)",
              }}
            />
            <h1
              className="relative z-10 text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold leading-tight text-foreground opacity-0"
              style={{ animation: "fade-in 0.8s ease-out 0.1s forwards" }}
            >
              Everything Has a Home.{" "}
              <span className="text-primary relative inline-block mt-2 sm:mt-0 mb-5">
                Help It Find
                <svg
                  viewBox="0 0 300 12"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute -bottom-2 left-0 w-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,6 C30,0 60,12 90,6 C120,0 150,12 180,6 C210,0 240,12 270,6 C285,3 295,5 300,6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              <br />
              The Right One.
            </h1>
            <p
              className="relative z-10 mt-4 sm:mt-5 lg:mt-6 text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-foreground/70 max-w-xs sm:max-w-sm md:max-w-md xl:max-w-lg mx-auto md:mx-0 opacity-0"
              style={{ animation: "fade-in 0.8s ease-out 0.35s forwards" }}
            >
              Buy and sell the things you no longer need. Give your clutter a
              second life — and someone else a great deal.
            </p>
            <div
              className="relative z-10 mt-6 sm:mt-7 lg:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start opacity-0"
              style={{ animation: "fade-in 0.8s ease-out 0.55s forwards" }}
            >
              <button className="main-button w-full sm:w-auto text-sm sm:text-base xl:px-8 xl:py-3 2xl:text-lg 2xl:px-10 2xl:py-4">
                Start Selling
              </button>
              <button className="w-full sm:w-auto px-5 sm:px-6 py-2 xl:px-8 xl:py-3 2xl:text-lg 2xl:px-10 2xl:py-4 text-sm sm:text-base rounded-full border border-primary text-primary font-medium transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95">
                Browse Listings
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex flex-col items-center w-full opacity-0 mt-4"
            style={{ animation: "fade-in 0.8s ease-out 0.2s forwards" }}
          >
            <div className="relative w-full max-w-sm sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-3xl h-[320px] sm:h-[370px] md:h-[420px] lg:h-[480px] xl:h-[540px] 2xl:h-[640px]">
              <img
                src={activeImage === 0 ? heroImage2 : heroImage}
                alt="living space"
                className="absolute right-0 top-5 sm:top-6 lg:top-8 w-[88%] sm:w-[85%] h-[270px] sm:h-[315px] md:h-[365px] lg:h-[415px] xl:h-[465px] 2xl:h-[560px] object-cover rounded-xl sm:rounded-2xl shadow-lg transition-all duration-700"
              />
              <img
                src={activeImage === 0 ? heroImage : heroImage2}
                alt="organised space"
                className="absolute top-0 -left-1 sm:-left-3 md:-left-5 w-[88%] sm:w-[85%] h-[270px] sm:h-[315px] md:h-[365px] lg:h-[415px] xl:h-[465px] 2xl:h-[560px] object-cover rounded-xl sm:rounded-2xl shadow-xl border border-background transition-all duration-700"
              />
            </div>
            {/* Dots sit here, always below the image box, never overlapping */}
            <div className="flex gap-2 items-center mt-6">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveImage(i);
                    setImgProgress(0);
                  }}
                  className={`h-2 rounded-full overflow-hidden transition-all duration-500 ${activeImage === i ? "w-14 bg-primary/20" : "w-2 bg-primary/30"}`}
                >
                  {activeImage === i && (
                    <span
                      className="block h-full bg-primary rounded-full"
                      style={{ width: `${imgProgress}%`, transition: "none" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 2 — Banner ════════ */}
      <section className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-32 pb-12 sm:pb-16 lg:pb-20">
        <div
          ref={bannerRef}
          className="w-full rounded-2xl sm:rounded-3xl bg-primary/8 border border-primary/20 px-5 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-14 flex flex-col md:flex-row items-center gap-8 sm:gap-10 md:gap-16 overflow-hidden relative"
          style={{
            opacity: bannerInView ? 1 : 0,
            transform: bannerInView ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div
            className="absolute inset-0 -z-10 rounded-3xl"
            style={{
              background: `radial-gradient(ellipse at 20% 50%,hsl(var(--primary)/0.08) 0%,transparent 65%)`,
            }}
          />
          <OrbitRing />
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2 sm:mb-3">
              Why Declutт?
            </p>
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground leading-snug">
              Turn unused items into{" "}
              <span className="text-primary">instant cash</span>
            </h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-foreground/60 max-w-lg">
              List anything — furniture, gadgets, clothes, and more. Reach
              thousands of buyers in your area and close deals fast.
            </p>
            <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-center md:justify-start">
              {[
                "Free to list",
                "Trusted buyers",
                "Fast deals",
                "Local & nationwide",
              ].map((f) => (
                <span
                  key={f}
                  className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {f}
                </span>
              ))}
            </div>
            <button className="mt-6 sm:mt-8 inline-flex items-center gap-2 text-primary font-semibold text-sm sm:text-base hover:gap-3 transition-all duration-300">
              Start listing for free
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 3 — How it works ════════ */}
      <section className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-32">
        <div
          ref={headerRef}
          className="text-center mb-5 sm:mb-6 lg:mb-8"
          style={{
            opacity: headerInView ? 1 : 0,
            transform: headerInView ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="text-[15px] sm:text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            How it works
          </p>
          <h2 className="text-2xl sm:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-foreground">
            Less stuff. <TypewriterWord /> Better life.
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm lg:text-base text-foreground/50 max-w-xs sm:max-w-sm mx-auto">
            Every item gathering dust is cash waiting to happen. Here's how easy
            it is.
          </p>
        </div>
        <StackedCards />
      </section>

      {/* ════════ SECTION 4 — Features ════════ */}
      <Section4 />

      {/* ════════ Reviews ════════ */}
      <ReviewsSection />

      {/* ════════ FAQ ════════ */}
      <FAQSection />

      {/* Purchase toast */}
      {toastVisible &&
        createPortal(
          <div
            className="fixed bottom-4 sm:bottom-6 left-3 sm:left-4 lg:left-6 flex items-center gap-2 sm:gap-3 bg-card border border-border/50 rounded-xl sm:rounded-2xl shadow-xl px-3 sm:px-4 py-2 sm:py-3 w-[230px] sm:w-[260px] lg:w-[270px]"
            style={{
              zIndex: 99999,
              transform: toastAnimating
                ? "translateY(0) scale(1)"
                : "translateY(20px) scale(0.95)",
              opacity: toastAnimating ? 0.95 : 0,
              transition:
                "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
            }}
          >
            <div className="flex-shrink-0 w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] sm:text-xs font-bold">
              {n.avatar}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] text-foreground/45 leading-none mb-0.5">
                {n.time}
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-foreground leading-snug">
                {n.name} just purchased
              </p>
              <p className="text-[9px] sm:text-xs text-primary font-medium truncate">
                {n.item}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {/* X close button */}
              <button
                onClick={dismissToast}
                aria-label="Dismiss"
                className="w-4 h-4 flex items-center justify-center rounded-full text-foreground/30 hover:text-foreground/70 hover:bg-border transition-colors duration-150"
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M1 1l8 8M9 1l-8 8" />
                </svg>
              </button>
            </div>
          </div>,
          document.body,
        )}

      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg) translateX(100px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(60px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
};
