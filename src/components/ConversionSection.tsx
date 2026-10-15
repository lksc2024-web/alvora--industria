"use client";

import { useId, useRef, useState } from "react";

import { useReveal } from "@/lib/hooks";
import { conversion } from "@/lib/site";

export function ConversionSection() {
  const ref = useReveal<HTMLDivElement>(0.08);
  const [notice, setNotice] = useState(false);
  const [profile, setProfile] = useState<string>(conversion.form.profiles[0]);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const uid = useId();

  const field = (name: string) => `${uid}-${name}`;

  return (
    <section
      id="contato"
      className="relative bg-espresso-950 py-24 md:py-36"
      aria-label="Caminhos de contato"
    >
      <div ref={ref} className="shell">
        <div className="reveal max-w-2xl">
          <p className="eyebrow">{conversion.eyebrow}</p>
          <h2 className="text-display mt-4">{conversion.title}</h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-cream-200/80">
            {conversion.lead}
          </p>
        </div>

        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {conversion.paths.map((p, i) => (
            <li
              key={p.id}
              className="reveal"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <article className="group flex h-full flex-col rounded-xl border border-white/10 bg-espresso-900 p-7 transition-colors duration-500 hover:border-gold-400/45">
                <span className="text-[0.65rem] uppercase tracking-[0.26em] text-gold-400">
                  {p.kicker}
                </span>
                <h3 className="mt-3 text-2xl">{p.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-cream-200/75">
                  {p.body}
                </p>
                <a
                  href={p.href}
                  onClick={() => {
                    if (p.id !== "produtos") setProfile(p.title);
                  }}
                  className="mt-7 inline-flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-cream-100 transition-colors group-hover:text-gold-300"
                >
                  {p.action}
                  <span
                    aria-hidden
                    className="block h-px w-7 bg-gold-400/60 transition-all duration-500 group-hover:w-11"
                  />
                </a>
              </article>
            </li>
          ))}
        </ul>

        <div className="reveal mt-16 grid gap-10 rounded-xl border border-white/10 bg-espresso-900 p-7 md:grid-cols-12 md:p-12">
          <div className="md:col-span-5">
            <h3 className="text-title">{conversion.form.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-cream-200/75">
              {conversion.form.body}
            </p>
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setNotice(true);
              requestAnimationFrame(() => noticeRef.current?.focus());
            }}
            className="grid gap-4 md:col-span-7 md:grid-cols-2"
          >
            <div>
              <label htmlFor={field("nome")} className="mb-2 block text-xs uppercase tracking-[0.18em] text-mist-400">
                {conversion.form.fields.name}
              </label>
              <input id={field("nome")} name="nome" type="text" autoComplete="name" className="field" />
            </div>
            <div>
              <label htmlFor={field("org")} className="mb-2 block text-xs uppercase tracking-[0.18em] text-mist-400">
                {conversion.form.fields.org}
              </label>
              <input id={field("org")} name="organizacao" type="text" autoComplete="organization" className="field" />
            </div>
            <div>
              <label htmlFor={field("email")} className="mb-2 block text-xs uppercase tracking-[0.18em] text-mist-400">
                {conversion.form.fields.email}
              </label>
              <input id={field("email")} name="email" type="email" autoComplete="email" className="field" />
            </div>
            <div>
              <label htmlFor={field("perfil")} className="mb-2 block text-xs uppercase tracking-[0.18em] text-mist-400">
                {conversion.form.fields.profile}
              </label>
              <select
                id={field("perfil")}
                name="perfil"
                className="field"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              >
                {conversion.form.profiles.map((p) => (
                  <option key={p} value={p} className="bg-espresso-900">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor={field("msg")} className="mb-2 block text-xs uppercase tracking-[0.18em] text-mist-400">
                {conversion.form.fields.message}
              </label>
              <textarea id={field("msg")} name="mensagem" rows={4} className="field resize-y" />
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="btn btn-primary w-full justify-center sm:w-auto">
                {conversion.form.submit}
              </button>
              <p
                ref={noticeRef}
                tabIndex={-1}
                role="status"
                aria-live="polite"
                className={`mt-4 rounded-lg border px-4 py-3 text-sm transition-opacity duration-500 ${
                  notice
                    ? "border-gold-400/40 bg-gold-400/8 text-gold-200 opacity-100"
                    : "border-transparent opacity-0"
                }`}
              >
                {notice ? conversion.form.blocked : " "}
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
