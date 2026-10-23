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
import HeroGrid from "./HeroGrid";
import { Ico } from "./Ico";
import heroImg from "../images/hero-image.avif";
import storyImg from "../images/image1.avif";
import step1 from "../images/step1.jpg";
import step2 from "../images/step2.jpg";
import step3 from "../images/step3.jpg";
import step4 from "../images/step4.jpg";

const FEATURES = [
  {
    title: "Find things close to you",
    desc: "Every listing shows how far it is from you, so you can pick items up the same day instead of waiting on delivery.",
    icon: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
  {
    title: "Chat in real time",
    desc: "Message sellers directly, reply to specific messages and see when they've been read. Agree on price, then meet.",
    icon: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
  },
  {
    title: "Verified sellers",
    desc: "Sellers complete a verification step with their contact details and ID, so you know who you're dealing with.",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: "Save, earn & share",
    desc: "Save items you love, collect reward points as you use Declutt, and invite friends with your own referral link.",
    icon: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
  },
];

const STEPS = [
  {
    img: step1,
    title: "List your item",
    desc: "Snap a photo, set your price and you're live in minutes — listing is free.",
  },
  {
    img: step2,
    title: "Buyers find you",
    desc: "People nearby browse, search and save the things they want.",
  },
  {
    img: step3,
    title: "Chat & agree",
    desc: "Talk directly in the app, agree on a price and a place to meet.",
  },
  {
    img: step4,
    title: "Hand it over",
    desc: "Cash in hand, clutter gone — and your item gets a second life.",
  },
];

const VALUES = [
  {
    title: "Reuse first",
    desc: "The greenest item is the one that already exists. Every sale keeps something useful out of the bin.",
  },
  {
    title: "Community",
    desc: "Declutt connects neighbours. Deals happen between real people, close to home.",
  },
  {
    title: "Simple & fair",
    desc: "No complicated forms or hidden listing fees — just clear prices and honest conversations.",
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

const SectionTitle = ({ eyebrow, title, sub }) => (
  <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
      {eyebrow}
    </p>
    <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
      {title}
    </h2>
    {sub && (
      <p className="mt-3 text-sm sm:text-base text-foreground/60">{sub}</p>
    )}
  </Reveal>
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
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 sm:pb-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="relative">
            <HeroGrid />
            <div className="relative z-10">
            <p className="opacity-0 animate-fade-in text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              About Declutt
            </p>
            <h1 className="opacity-0 animate-fade-in-delay-1 mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-foreground">
              Giving the things you no longer need a{" "}
              <span className="text-primary">second home</span>.
            </h1>
            <p className="opacity-0 animate-fade-in-delay-2 mt-5 text-base sm:text-lg text-foreground/65 max-w-xl">
              Declutt is a marketplace for buying and selling pre-loved items
              with people near you. Clear space, earn a little extra, and help
              good things get used again.
            </p>
            <div className="opacity-0 animate-fade-in-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                to="/listings"
                className="main-button px-6 py-3 text-sm font-semibold"
              >
                Browse items
              </Link>
              <Link
                to={sellLink}
                className="px-6 py-3 rounded-full text-sm font-semibold text-foreground/75 hover:text-primary transition-colors"
                style={{ border: "2px solid hsl(var(--border))" }}
              >
                Start selling
              </Link>
            </div>
            </div>
          </div>
          <div className="opacity-0 animate-zoom-in-delay-1 relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-primary/10 blur-2xl pointer-events-none" />
            <img
              src={heroImg}
              alt="A bright living room furnished with pre-loved pieces"
              className="relative w-full aspect-[4/3] object-cover rounded-3xl border border-border shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ── Live stats ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Items listed on Declutt", value: stats?.total },
            { label: "Available right now", value: stats?.live },
            { label: "Listing fees", text: "₦0" },
          ].map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 100}
              className="rounded-2xl bg-card border border-border px-5 py-5 text-center"
            >
              <p className="text-3xl font-black text-primary">
                {s.text ??
                  (s.value == null ? (
                    <span className="inline-block w-12 h-8 rounded-lg bg-border/50 animate-pulse align-middle" />
                  ) : (
                    <CountUp value={s.value} />
                  ))}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-foreground/55">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Story ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        <Reveal className="order-2 md:order-1">
          <img
            src={storyImg}
            alt="Pre-loved home items ready for a new owner"
            loading="lazy"
            className="w-full aspect-[5/4] object-cover rounded-3xl border border-border"
          />
        </Reveal>
        <Reveal delay={120} className="order-1 md:order-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            Our story
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Clutter for one person is treasure for another
          </h2>
          <div className="mt-5 space-y-4 text-sm sm:text-base text-foreground/65 leading-relaxed">
            <p>
              Most homes are full of things that are still perfectly good — a
              lamp from the last move, a chair that no longer fits, a gadget
              that was replaced. Meanwhile, someone a few streets away is
              searching for exactly that.
            </p>
            <p>
              Declutt brings those two people together. Sellers list in a few
              taps, buyers see what's available close by, and the conversation
              happens right in the app until the item changes hands.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── What makes us different ── */}
      <section className="bg-card/40 border-y border-border/60 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            eyebrow="Why Declutt"
            title="Built for buying and selling locally"
            sub="Everything you need to clear space or find a bargain, in one place."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={i * 90}
                className="group rounded-2xl bg-background border border-border p-5 sm:p-6 hover:border-primary/40 hover:-translate-y-1 transition-[border-color,transform] duration-300"
              >
                <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Ico s={20} r>
                    {f.icon}
                  </Ico>
                </span>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-foreground/60 leading-relaxed">
                  {f.desc}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <SectionTitle
          eyebrow="How it works"
          title="From clutter to cash in four steps"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="group">
              <div className="relative overflow-hidden rounded-2xl border border-border aspect-[4/3]">
                <img
                  src={s.img}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-black flex items-center justify-center shadow-lg">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm text-foreground/60">{s.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <SectionTitle eyebrow="What we believe" title="Our values" />
        <div className="grid md:grid-cols-3 gap-4">
          {VALUES.map((v, i) => (
            <Reveal
              key={v.title}
              delay={i * 100}
              className="rounded-2xl p-6 bg-primary/6 border border-primary/20"
            >
              <p className="text-3xl font-black text-primary/40">0{i + 1}</p>
              <h3 className="mt-2 text-lg font-bold text-foreground">
                {v.title}
              </h3>
              <p className="mt-2 text-sm text-foreground/60 leading-relaxed">
                {v.desc}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Call to action ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 sm:px-12 sm:py-16 text-center">
          <div className="absolute inset-0 hero-grid opacity-40 pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground">
              Ready to clear some space?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-primary-foreground/80 max-w-xl mx-auto">
              List your first item in minutes, or see what people near you are
              selling today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to={sellLink}
                className="px-6 py-3 rounded-full bg-primary-foreground text-primary text-sm font-bold hover:scale-105 active:scale-95 transition-transform"
              >
                Start selling
              </Link>
              <Link
                to="/contact"
                className="px-6 py-3 rounded-full text-sm font-bold text-primary-foreground border-2 border-primary-foreground/40 hover:border-primary-foreground transition-colors"
              >
                Contact us
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default About;
