import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useInView } from "../utils/useInView";
import Reveal from "./Reveal";
import { Ico } from "./Ico";
import vaseImg from "../images/vase.jpg";
import lampsImg from "../images/chandelier.jpg";
import bedImg from "../images/bed.jpg";

// The kinds of things people sell here — all within Furniture, Appliances and Electronics
const CATEGORIES = [
  "Sofas & chairs",
  "Beds & wardrobes",
  "Dining sets",
  "Desks & shelves",
  "Fridges & freezers",
  "Washing machines",
  "Cookers & microwaves",
  "Fans & ACs",
  "TVs",
  "Laptops",
  "Phones & tablets",
  "Speakers",
];

const STORY = [
  {
    title: "The problem",
    text: "Homes fill up with things that still work — a lamp from the last move, a chair that no longer fits, a gadget that was replaced. Most of it ends up stored away or thrown out.",
  },
  {
    title: "The idea",
    text: "Someone a few streets away is usually looking for exactly that item. Declutt was built to connect those two people quickly, without fees or complicated forms.",
  },
  {
    title: "Today",
    text: "Sellers list in minutes, buyers see what's close to them and chat in real time, and every item that changes hands gets a second life instead of a landfill.",
  },
];

const VALUES = [
  {
    title: "Reuse comes first",
    text: "The greenest item is one that already exists. Every sale keeps something useful in use.",
  },
  {
    title: "Local by design",
    text: "Distances are shown on every listing, so deals happen close to home and same-day pickups are easy.",
  },
  {
    title: "Honest and simple",
    text: "Clear prices, no listing fees, and conversations that happen directly between buyer and seller.",
  },
  {
    title: "Trust you can check",
    text: "Sellers complete a verification step, and every conversation stays on record inside Declutt.",
  },
];

const SAFETY = [
  {
    title: "Keep the chat on Declutt",
    text: "Your messages stay in one place, with read receipts, so there's a record of what was agreed.",
    icon: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
  },
  {
    title: "Meet somewhere public",
    text: "Pick a busy, well-lit spot for the hand-over, and bring a friend if you can.",
    icon: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
  {
    title: "Inspect before you pay",
    text: "Check the item works and matches the photos before any money changes hands.",
    icon: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
  },
  {
    title: "Report anything odd",
    text: "If something doesn't feel right, tell us through the contact page and we'll look into it.",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
  },
];

/** Counts up to `value` once visible (rAF, ~0.9 s). */
const CountUp = ({ value }) => {
  const [ref, inView] = useInView(0.4);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView || value == null) return;
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return <span ref={ref}>{shown.toLocaleString()}</span>;
};

const Eyebrow = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
    {children}
  </p>
);

const About = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);

  // Real numbers from the marketplace (count queries — no documents are downloaded)
  useEffect(() => {
    let dead = false;
    const listings = collection(db, "listings");
    Promise.all([
      getCountFromServer(listings),
      getCountFromServer(query(listings, where("available", "==", true))),
    ])
      .then(([all, live]) => {
        if (!dead)
          setStats({ total: all.data().count, live: live.data().count });
      })
      .catch((e) => console.error("About stats:", e));
    return () => {
      dead = true;
    };
  }, []);

  const sellLink =
    profile?.role === "seller" ? "/seller?tab=listings" : "/signup";

  return (
    <div className="text-left">
      {/* ── Intro: statement + photo collage ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-14 sm:pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <div className="opacity-0 animate-fade-in">
            <Eyebrow>About Declutt</Eyebrow>
          </div>
          <h1 className="opacity-0 animate-fade-in-delay-1 mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
            We help good things find their{" "}
            <span className="italic font-light text-primary">next</span> home.
          </h1>
          <div className="opacity-0 animate-fade-in-delay-2 mt-6 h-px w-24 bg-primary" />
          <p className="opacity-0 animate-fade-in-delay-2 mt-6 text-base sm:text-lg text-foreground/65 max-w-lg leading-relaxed">
            Declutt is a local marketplace for pre-loved furniture, home
            appliances and electronics. We make it easy to pass on what you no
            longer need to someone nearby who does — and to find great things
            without paying for new.
          </p>
        </div>

        {/* Collage */}
        <div className="relative h-[340px] sm:h-[440px]">
          <Reveal
            delay={150}
            className="absolute right-0 top-0 w-[46%] h-full"
          >
            <img
              src={lampsImg}
              alt="Copper pendant lamps"
              className="w-full h-full object-cover rounded-[2rem] border border-border shadow-xl"
            />
          </Reveal>
          <Reveal
            delay={0}
            className="absolute left-0 top-[6%] w-[58%] h-[44%]"
          >
            <img
              src={vaseImg}
              alt="Glass and ceramic vases on a table"
              className="w-full h-full object-cover rounded-[2rem] border border-border shadow-xl"
            />
          </Reveal>
          <Reveal
            delay={300}
            className="absolute left-[8%] bottom-0 w-[50%] h-[42%]"
          >
            <img
              src={bedImg}
              alt="A furnished bedroom"
              className="w-full h-full object-cover rounded-[2rem] border-4 border-background shadow-2xl"
            />
          </Reveal>
          <Reveal
            delay={450}
            className="absolute left-[46%] top-[47%] -translate-x-1/2 z-10"
          >
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg whitespace-nowrap">
              <Ico s={14} r>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </Ico>
              Pre-loved, re-homed
            </span>
          </Reveal>
        </div>
      </section>

      {/* ── Category band ── */}
      <div
        className="border-y border-border/70 bg-card/40 overflow-hidden py-4"
        aria-label="Categories on Declutt"
      >
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
            <span
              key={i}
              aria-hidden={i >= CATEGORIES.length}
              className="flex items-center gap-10 text-sm sm:text-base font-semibold text-foreground/55"
            >
              {c}
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            </span>
          ))}
        </div>
      </div>

      {/* ── Mission ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <Reveal>
          <Eyebrow>Our mission</Eyebrow>
          <p className="mt-5 text-2xl sm:text-3xl lg:text-4xl font-semibold leading-snug text-foreground">
            Perfectly good things are thrown away every day while someone
            nearby goes looking for{" "}
            <span className="text-primary">exactly that</span>. Declutt exists
            to close that gap —{" "}
            <span className="text-primary">locally, simply and fairly</span>.
          </p>
        </Reveal>
      </section>

      {/* ── Story timeline ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 self-start">
          <Eyebrow>Our story</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            Why we started Declutt
          </h2>
          <p className="mt-4 text-sm sm:text-base text-foreground/60 max-w-sm">
            A simple observation that turned into a marketplace for the things
            people already own.
          </p>
        </Reveal>
        <ol className="relative border-l-2 border-border/70 ml-3 space-y-10">
          {STORY.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 120} className="pl-8 relative">
              <span className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-background border-[3px] border-primary" />
              <p className="text-xs font-bold text-primary/80">
                0{i + 1}
              </p>
              <h3 className="mt-1 text-xl font-bold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm sm:text-base text-foreground/65 leading-relaxed">
                {s.text}
              </p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── Live numbers ── */}
      <section className="border-y border-border/70 bg-card/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/70">
          {[
            { label: "Items listed so far", value: stats?.total },
            { label: "Available right now", value: stats?.live },
            { label: "To list an item", text: "₦0" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="py-8 sm:py-12 text-center">
              <p className="text-4xl sm:text-5xl font-black text-foreground">
                {s.text ??
                  (s.value == null ? (
                    <span className="inline-block w-16 h-10 rounded-lg bg-border/50 animate-pulse align-middle" />
                  ) : (
                    <CountUp value={s.value} />
                  ))}
              </p>
              <p className="mt-2 text-xs sm:text-sm font-semibold uppercase tracking-widest text-foreground/45">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Reveal className="max-w-xl">
          <Eyebrow>What we stand for</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground">
            Four things we won't compromise on
          </h2>
        </Reveal>
        <div className="mt-10 border-t border-border/70">
          {VALUES.map((v, i) => (
            <Reveal
              key={v.title}
              delay={i * 80}
              className="group grid sm:grid-cols-[80px_1fr_1.4fr] gap-2 sm:gap-8 py-6 sm:py-8 border-b border-border/70"
            >
              <span className="text-sm font-black text-foreground/30 group-hover:text-primary transition-colors">
                0{i + 1}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {v.title}
              </h3>
              <p className="text-sm sm:text-base text-foreground/60 leading-relaxed">
                {v.text}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Safety ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="rounded-[2rem] bg-card border border-border p-6 sm:p-10 lg:p-12">
          <Reveal className="max-w-xl">
            <Eyebrow>Buying & selling safely</Eyebrow>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">
              A few habits that keep every deal smooth
            </h2>
          </Reveal>
          <div className="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-7">
            {SAFETY.map((s, i) => (
              <Reveal key={s.title} delay={i * 90} className="flex gap-4">
                <span className="w-10 h-10 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
                  <Ico s={18} r>
                    {s.icon}
                  </Ico>
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/60 leading-relaxed">
                    {s.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Close ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-t border-border/70 pt-10 sm:pt-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight max-w-xl">
            Got something to pass on, or something to find?
          </h2>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to={sellLink}
              className="main-button px-6 py-3 text-sm font-semibold"
            >
              Start selling
            </Link>
            <Link
              to="/listings"
              className="px-6 py-3 rounded-full text-sm font-semibold text-foreground/75 hover:text-primary transition-colors"
              style={{ border: "2px solid hsl(var(--border))" }}
            >
              Browse items
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default About;
