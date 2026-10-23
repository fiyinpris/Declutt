import { useState } from "react";
import { Link } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Reveal from "./Reveal";
import { Ico, Spin } from "./Ico";

/*
 * Public contact details. Fill these in with Declutt's real details — any left empty
 * are simply not shown. Messages from the form are saved to Firestore (contactMessages)
 * and appear in the Admin dashboard.
 */
const CONTACT_DETAILS = {
  email: "",
  phone: "",
  address: "",
  hours: "",
};

const SUBJECTS = [
  "General question",
  "Buying an item",
  "Selling an item",
  "My account",
  "Report a problem",
  "Partnerships",
];

const FAQS = [
  {
    q: "How do I ask about a specific item?",
    a: "Open the item and tap “Message Seller”. The chat lives in your Messages tab, and you'll see when the seller has read your message.",
  },
  {
    q: "How do I start selling?",
    a: "Create a seller account, then go to My Items and tap “Add new item”. Add photos, a price and your location — listing is free.",
  },
  {
    q: "How do I report a user or a listing?",
    a: "Use the form on this page and choose “Report a problem”. Include the item name or the person's name so we can find it quickly.",
  },
  {
    q: "I can't sign in to my account.",
    a: "Use “Forgot password?” on the login page to reset it. If that doesn't work, send us a message with “My account” and the email you signed up with.",
  },
];

const LIMITS = { name: 100, email: 200, messageMin: 10, messageMax: 2000 };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const validate = (f) => {
  const e = {};
  const name = f.name.trim();
  const email = f.email.trim();
  const message = f.message.trim();
  if (name.length < 2) e.name = "Please enter your name.";
  else if (name.length > LIMITS.name) e.name = "That name is too long.";
  if (!email) e.email = "Please enter your email address.";
  else if (!EMAIL_RE.test(email) || email.length > LIMITS.email)
    e.email = "Please enter a valid email address, e.g. you@example.com.";
  if (!SUBJECTS.includes(f.subject)) e.subject = "Please choose a topic.";
  if (message.length < LIMITS.messageMin)
    e.message = `Please write at least ${LIMITS.messageMin} characters so we can help.`;
  else if (message.length > LIMITS.messageMax)
    e.message = `Please keep your message under ${LIMITS.messageMax} characters.`;
  return e;
};

const inputCls = (err) =>
  `w-full px-4 py-3 rounded-xl border bg-background text-[16px] sm:text-sm text-foreground placeholder:text-foreground/30 outline-none transition-all focus:ring-2 ${err ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/10" : "border-border focus:border-primary/60 focus:ring-primary/10"}`;

const Field = ({ id, label, error, hint, children }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2"
    >
      {label}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-500">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1.5 text-xs text-foreground/40">{hint}</p>
    )}
  </div>
);

/** One line in the coloured side panel. */
const Way = ({ icon, title, children }) => (
  <li className="flex gap-3.5">
    <span className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
      <Ico s={18} r>
        {icon}
      </Ico>
    </span>
    <div className="min-w-0">
      <p className="text-sm font-bold">{title}</p>
      <div className="text-sm text-primary-foreground/80 break-words">
        {children}
      </div>
    </div>
  </li>
);

const Faq = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm sm:text-base font-semibold text-foreground">
          {q}
        </span>
        <span
          className={`w-7 h-7 rounded-full border border-border flex items-center justify-center shrink-0 text-foreground/60 transition-transform duration-300 ${open ? "rotate-45 text-primary border-primary/40" : ""}`}
        >
          <Ico s={14} w={2.4} r>
            <path d="M12 5v14M5 12h14" />
          </Ico>
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <p className="overflow-hidden text-sm text-foreground/60 leading-relaxed pr-10">
          <span className="block pb-4">{a}</span>
        </p>
      </div>
    </div>
  );
};

const Contact = () => {
  const { user, profile } = useAuth();
  const blank = {
    name: profile?.name || "",
    email: profile?.email || user?.email || "",
    subject: SUBJECTS[0],
    message: "",
    company: "", // honeypot — real people never see or fill this
  };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [sentTo, setSentTo] = useState(null);

  const update = (k, v) => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (touched[k]) setErrors(validate(next));
    if (status === "error") setStatus("idle");
  };
  const set = (k) => (e) => update(k, e.target.value);
  const blur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validate(form));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    const errs = validate(form);
    setErrors(errs);
    setTouched({ name: true, email: true, subject: true, message: true });
    if (Object.keys(errs).length) {
      document.getElementById(`contact-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    const data = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject,
      message: form.message.trim(),
    };
    setStatus("sending");
    try {
      if (!form.company)
        await addDoc(collection(db, "contactMessages"), {
          ...data,
          uid: user?.uid || null,
          read: false,
          createdAt: serverTimestamp(),
        });
      setSentTo({ name: data.name.split(" ")[0], email: data.email });
      setStatus("sent");
      setForm({ ...blank, message: "" });
      setTouched({});
    } catch (err) {
      console.error("Contact form:", err);
      setStatus("error");
    }
  };

  const err = (k) => (touched[k] ? errors[k] : "");
  const msgLen = form.message.trim().length;

  return (
    <div className="text-left max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-6">
      {/* ── Heading ── */}
      <div className="max-w-2xl">
        <p className="opacity-0 animate-fade-in text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
          Contact
        </p>
        <h1 className="opacity-0 animate-fade-in-delay-1 mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Let's talk.
        </h1>
        <p className="opacity-0 animate-fade-in-delay-2 mt-4 text-base sm:text-lg text-foreground/65">
          Questions, feedback or a problem with an order or your account — send
          us a message and we'll reply by email.
        </p>
      </div>

      {/* ── Card: coloured side panel + form ── */}
      <Reveal className="mt-10 sm:mt-12 grid lg:grid-cols-[0.85fr_1.4fr] rounded-[2rem] overflow-hidden border border-border bg-card shadow-sm">
        <aside className="relative overflow-hidden bg-primary text-primary-foreground p-6 sm:p-10">
          <span className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-primary-foreground/10" />
          <span className="absolute right-10 bottom-24 w-20 h-20 rounded-full bg-primary-foreground/10" />
          <div className="relative">
            <h2 className="text-2xl font-bold">Ways to reach us</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Pick whatever's quickest for you.
            </p>
            <ul className="mt-8 space-y-6">
              <Way
                title="About an item?"
                icon={
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                }
              >
                Message the seller from the item page —{" "}
                <Link to="/listings" className="font-bold underline underline-offset-2">
                  browse items
                </Link>
                .
              </Way>
              <Way
                title="Everything else"
                icon={
                  <>
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </>
                }
              >
                Use this form. Every message reaches the Declutt team.
              </Way>
              {CONTACT_DETAILS.email && (
                <Way
                  title="Email"
                  icon={
                    <>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-10 6L2 7" />
                    </>
                  }
                >
                  <a href={`mailto:${CONTACT_DETAILS.email}`} className="font-bold underline underline-offset-2">
                    {CONTACT_DETAILS.email}
                  </a>
                </Way>
              )}
              {CONTACT_DETAILS.phone && (
                <Way
                  title="Phone"
                  icon={
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  }
                >
                  <a href={`tel:${CONTACT_DETAILS.phone.replace(/\s+/g, "")}`} className="font-bold underline underline-offset-2">
                    {CONTACT_DETAILS.phone}
                  </a>
                  {CONTACT_DETAILS.hours && (
                    <span className="block text-xs mt-0.5">{CONTACT_DETAILS.hours}</span>
                  )}
                </Way>
              )}
              {CONTACT_DETAILS.address && (
                <Way
                  title="Address"
                  icon={
                    <>
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </>
                  }
                >
                  {CONTACT_DETAILS.address}
                </Way>
              )}
            </ul>
          </div>
        </aside>

        <div className="p-6 sm:p-10">
          {status === "sent" ? (
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center">
              <span className="opacity-0 animate-bounce-in w-16 h-16 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center">
                <Ico s={30} w={2.5} r>
                  <polyline points="20 6 9 17 4 12" />
                </Ico>
              </span>
              <h2 className="mt-5 text-xl sm:text-2xl font-bold text-foreground">
                Thanks, {sentTo?.name}! Message sent.
              </h2>
              <p className="mt-2 text-sm text-foreground/60 max-w-sm">
                We've received it and will reply to{" "}
                <span className="font-semibold text-foreground/80">
                  {sentTo?.email}
                </span>
                .
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-7 px-5 py-2.5 rounded-full text-sm font-semibold text-foreground/75 hover:text-primary transition-colors"
                style={{ border: "2px solid hsl(var(--border))" }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-6">
              {status === "error" && (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-sm text-red-500"
                >
                  We couldn't send your message. Check your internet connection
                  and try again.
                </div>
              )}

              <fieldset>
                <legend
                  id="contact-subject"
                  tabIndex={-1}
                  className="block text-xs font-bold uppercase tracking-widest text-foreground/50 mb-3"
                >
                  What's it about?
                </legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="contact-subject">
                  {SUBJECTS.map((s) => {
                    const on = form.subject === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => update("subject", s)}
                        className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/65 hover:border-primary/40 hover:text-primary"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {err("subject") && (
                  <p role="alert" className="mt-1.5 text-xs text-red-500">
                    {err("subject")}
                  </p>
                )}
              </fieldset>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field id="contact-name" label="Your name" error={err("name")}>
                  <input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={set("name")}
                    onBlur={blur("name")}
                    maxLength={LIMITS.name}
                    aria-invalid={!!err("name")}
                    aria-describedby={err("name") ? "contact-name-error" : undefined}
                    placeholder="Ada Obi"
                    className={inputCls(err("name"))}
                  />
                </Field>
                <Field id="contact-email" label="Email" error={err("email")}>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={form.email}
                    onChange={set("email")}
                    onBlur={blur("email")}
                    maxLength={LIMITS.email}
                    aria-invalid={!!err("email")}
                    aria-describedby={err("email") ? "contact-email-error" : undefined}
                    placeholder="you@example.com"
                    className={inputCls(err("email"))}
                  />
                </Field>
              </div>

              <Field
                id="contact-message"
                label="Message"
                error={err("message")}
                hint={`${msgLen}/${LIMITS.messageMax} characters`}
              >
                <textarea
                  id="contact-message"
                  rows={6}
                  value={form.message}
                  onChange={set("message")}
                  onBlur={blur("message")}
                  maxLength={LIMITS.messageMax}
                  aria-invalid={!!err("message")}
                  aria-describedby={err("message") ? "contact-message-error" : undefined}
                  placeholder="Tell us what's going on…"
                  className={`${inputCls(err("message"))} resize-y min-h-[150px]`}
                />
              </Field>

              {/* Honeypot: hidden from people and screen readers, catches simple bots */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.company}
                onChange={set("company")}
                className="absolute -left-[9999px] w-px h-px opacity-0"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-foreground/40">
                  We only use your details to reply to this message.
                </p>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="main-button px-8 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {status === "sending" ? (
                    <>
                      <Spin s={16} /> Sending…
                    </>
                  ) : (
                    <>
                      Send message
                      <Ico s={16} r>
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </Ico>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Reveal>

      {/* ── Quick answers ── */}
      <section className="mt-16 sm:mt-20 grid lg:grid-cols-[0.85fr_1.4fr] gap-6 lg:gap-12">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Quick answers
          </p>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">
            You might not need to wait for us
          </h2>
        </Reveal>
        <Reveal delay={100} className="border-t border-border/70">
          {FAQS.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </Reveal>
      </section>
    </div>
  );
};

export default Contact;
