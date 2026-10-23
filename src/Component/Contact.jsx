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
  "Report a problem or user",
  "Partnerships",
  "Other",
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

const InfoCard = ({ icon, title, children, delay }) => (
  <Reveal
    delay={delay}
    className="flex gap-4 p-5 rounded-2xl bg-card border border-border"
  >
    <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Ico s={20} r>
        {icon}
      </Ico>
    </span>
    <div className="min-w-0">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <div className="mt-1 text-sm text-foreground/60 break-words">
        {children}
      </div>
    </div>
  </Reveal>
);

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

  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched[k]) setErrors(validate(next));
    if (status === "error") setStatus("idle");
  };
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
    <div className="text-left">
      {/* ── Header ── */}
      <section className="relative overflow-hidden hero-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-12 sm:pb-16 text-center">
          <p className="opacity-0 animate-fade-in text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            Contact us
          </p>
          <h1 className="opacity-0 animate-fade-in-delay-1 mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            We'd love to hear from you
          </h1>
          <p className="opacity-0 animate-fade-in-delay-2 mt-4 text-base sm:text-lg text-foreground/65">
            Questions, feedback or a problem with an order or account — send us
            a message and the Declutt team will get back to you by email.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 grid lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10 items-start">
        {/* ── Ways to reach us ── */}
        <div className="space-y-4 order-2 lg:order-1">
          <InfoCard
            delay={0}
            title="Questions about an item?"
            icon={
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            }
          >
            The fastest way is to ask the seller: open the item and tap{" "}
            <span className="font-semibold text-foreground/80">
              Message Seller
            </span>
            .{" "}
            <Link
              to="/listings"
              className="font-semibold text-primary hover:underline"
            >
              Browse items
            </Link>
          </InfoCard>
          <InfoCard
            delay={80}
            title="Account or safety issue?"
            icon={
              <>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4M12 16h.01" />
              </>
            }
          >
            Use the form and choose “My account” or “Report a problem or user”.
            Include the email you use on Declutt so we can find your account.
          </InfoCard>
          {CONTACT_DETAILS.email && (
            <InfoCard
              delay={160}
              title="Email"
              icon={
                <>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </>
              }
            >
              <a
                href={`mailto:${CONTACT_DETAILS.email}`}
                className="font-semibold text-primary hover:underline"
              >
                {CONTACT_DETAILS.email}
              </a>
            </InfoCard>
          )}
          {CONTACT_DETAILS.phone && (
            <InfoCard
              delay={200}
              title="Phone"
              icon={
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              }
            >
              <a
                href={`tel:${CONTACT_DETAILS.phone.replace(/\s+/g, "")}`}
                className="font-semibold text-primary hover:underline"
              >
                {CONTACT_DETAILS.phone}
              </a>
              {CONTACT_DETAILS.hours && (
                <p className="text-xs mt-0.5">{CONTACT_DETAILS.hours}</p>
              )}
            </InfoCard>
          )}
          {CONTACT_DETAILS.address && (
            <InfoCard
              delay={240}
              title="Address"
              icon={
                <>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </>
              }
            >
              {CONTACT_DETAILS.address}
            </InfoCard>
          )}
        </div>

        {/* ── Form ── */}
        <Reveal
          delay={100}
          className="order-1 lg:order-2 rounded-3xl bg-card border border-border p-5 sm:p-8 shadow-sm"
        >
          {status === "sent" ? (
            <div className="py-10 sm:py-14 flex flex-col items-center text-center">
              <span className="opacity-0 animate-bounce-in w-16 h-16 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center">
                <Ico s={30} w={2.5} r>
                  <polyline points="20 6 9 17 4 12" />
                </Ico>
              </span>
              <h2 className="mt-5 text-xl sm:text-2xl font-bold text-foreground">
                Thanks, {sentTo?.name}! Your message is on its way.
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
            <form onSubmit={submit} noValidate className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Send us a message
                </h2>
                <p className="mt-1 text-sm text-foreground/50">
                  All fields are required.
                </p>
              </div>

              {status === "error" && (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-sm text-red-500"
                >
                  We couldn't send your message. Check your internet connection
                  and try again.
                </div>
              )}

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

              <Field id="contact-subject" label="Topic" error={err("subject")}>
                <select
                  id="contact-subject"
                  value={form.subject}
                  onChange={set("subject")}
                  onBlur={blur("subject")}
                  className={inputCls(err("subject"))}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>

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
                  placeholder="How can we help?"
                  className={`${inputCls(err("message"))} resize-y min-h-[140px]`}
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

              <button
                type="submit"
                disabled={status === "sending"}
                className="main-button w-full sm:w-auto px-8 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
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
            </form>
          )}
        </Reveal>
      </section>
    </div>
  );
};

export default Contact;
