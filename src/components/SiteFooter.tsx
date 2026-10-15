import { brand, footer } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-espresso-950 pb-10 pt-20 md:pt-28">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="font-display text-3xl tracking-[0.24em] text-cream-50">
              {brand.wordmark}
            </p>
            <p className="mt-2 text-[0.65rem] uppercase tracking-[0.3em] text-gold-400">
              {brand.descriptor}
            </p>
            <p className="mt-7 max-w-sm text-[0.95rem] leading-relaxed text-cream-200/75">
              {brand.conceito}
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-7">
            {footer.columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="font-sans text-[0.65rem] uppercase tracking-[0.26em] text-mist-400">
                  {col.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-sm text-cream-200/80 transition-colors hover:text-gold-300"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="rule mt-16" />

        <div className="mt-8 grid gap-6 text-[0.72rem] leading-relaxed text-mist-500 lg:grid-cols-12">
          <p className="lg:col-span-6">{footer.statement}</p>
          <p className="lg:col-span-4">{footer.assets}</p>
          <p className="lg:col-span-2 lg:text-right">
            {brand.signature}
            <br />
            <span className="text-mist-600">Protótipo · 2026</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
