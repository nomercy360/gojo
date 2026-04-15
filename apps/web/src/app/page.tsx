export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Gojo USM
        </p>

        <h1 className="mt-4 font-serif text-[56px] leading-[1.1] tracking-tight text-text-primary">
          Изучай японский
          <br />
          <span className="font-jp-display text-shu">с учителями и AI.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-text-secondary">
          Живые уроки в группах до 8 человек, AI-практика между занятиями, путь от ноля до JLPT N1.
          初めまして、よろしくお願いします。
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md bg-shu px-5 py-2.5 text-sm font-medium text-white shadow-warm transition hover:bg-shu-hover"
          >
            Записаться на первый урок
          </button>
          <button
            type="button"
            className="rounded-md border border-border-default bg-bg-elevated px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-secondary"
          >
            Как это работает
          </button>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          <Card
            badge="N5 → N1"
            badgeClass="bg-ai-soft text-ai"
            title="Структурированный путь"
            body="От хираганы до делового кейго. Каждый урок строится на предыдущем."
          />
          <Card
            badge="+50 XP"
            badgeClass="bg-yamabuki-soft text-yamabuki font-mono"
            title="Геймификация без детства"
            body="Streak'и, достижения и leaderboard — но в стиле Linear, не Duolingo."
          />
          <Card
            badge="7日連続"
            badgeClass="bg-shu-soft text-shu font-jp"
            title="Живое комьюнити"
            body="Видео-уроки, домашки с проверкой, чат с учителем между занятиями."
          />
        </div>
      </div>
    </main>
  );
}

function Card({
  badge,
  badgeClass,
  title,
  body,
}: {
  badge: string;
  badgeClass: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-border-subtle bg-bg-elevated p-6 shadow-sm transition hover:border-border-default hover:shadow-md">
      <span
        className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[12px] leading-tight ${badgeClass}`}
      >
        {badge}
      </span>
      <h3 className="mt-4 text-[18px] font-medium text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{body}</p>
    </article>
  );
}
