"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookingModal } from "./booking-modal";

type HeroKanaOption = "shi" | "su" | "se" | "chi";

const HERO_KANA_QUESTIONS = [
  { kana: "す", correct: "su", options: ["shi", "su", "se"] },
  { kana: "し", correct: "shi", options: ["su", "shi", "chi"] },
] as const satisfies ReadonlyArray<{
  kana: string;
  correct: HeroKanaOption;
  options: readonly HeroKanaOption[];
}>;

function shuffleHeroKanaOptions(options: readonly HeroKanaOption[]) {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]];
  }
  return shuffled;
}

const REVIEWS = [
  {
    name: "Александр",
    text: "Руслан очень систематизировано и методично даёт материал, который хорошо укладывается в памяти. Владение языком «живое» — мы изучаем не просто учебник, а то, как говорят в реальной жизни. ありがとう, Руслан!",
  },
  {
    name: "Полина",
    text: "Прошло пять занятий — освоили хирагану, катакану, первые иероглифы. Руслан всегда может рассказать про японскую культуру и историю, это для меня было очень важно при выборе сенсея. どうもありがとう!",
  },
  {
    name: "Зоя",
    text: "Искала репетитора для сына — он любит аниме. Провели 2 занятия, и я уже уверена, что продолжим. Настолько заинтересованным своего ребёнка я давно не видела. Удивительно, как молодой человек умеет увлечь и замотивировать.",
  },
  {
    name: "Сергей",
    text: "Умеет заинтересовать в предмете. Сразу был составлен план занятий и программа. Руслан прекрасно понимает особенности мышления нашего поколения и знает к нему подход.",
  },
  {
    name: "Анастасия",
    text: "На вводном уроке обсудили цели, подготовили план работы. Атмосфера приятная и дружелюбная, материал подаётся доступно и структурировано. Сразу видно — профессионал. Точно рекомендую!",
  },
  {
    name: "Надежда",
    text: "Понял запрос, подстроился под меня. Доступно объясняет, держит нужный темп. Видно, что преподаёт с удовольствием и работает именно на результат.",
  },
];

const REVIEW_LOOP = [...REVIEWS, ...REVIEWS];
const REVIEW_STAR_KEYS = ["star-1", "star-2", "star-3", "star-4", "star-5"];

// Russian plural for the animated student counter (51 → «ученик уже занимается»)
function studentsLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "ученик уже занимается с нами";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "ученика уже занимаются с нами";
  }
  return "учеников уже занимаются с нами";
}

export function Landing() {
  const [heroKanaOptions, setHeroKanaOptions] = useState<HeroKanaOption[]>([
    ...HERO_KANA_QUESTIONS[0].options,
  ]);
  const [heroKanaStep, setHeroKanaStep] = useState<0 | 1 | 2>(0);
  const [heroKanaAnswer, setHeroKanaAnswer] = useState<HeroKanaOption | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [studentsCount, setStudentsCount] = useState(0);
  const [statsDone, setStatsDone] = useState(false);
  const statsRef = useRef<HTMLElement>(null);

  // Keep the answer position unpredictable without introducing a server/client
  // hydration mismatch: the first randomization happens only after mount.
  useEffect(() => {
    setHeroKanaOptions(shuffleHeroKanaOptions(HERO_KANA_QUESTIONS[0].options));
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    let raf: number;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) {
          cancelAnimationFrame(raf);
          setStudentsCount(0);
          setStatsDone(false);
          return;
        }
        setStatsDone(false);
        const duration = 1600;
        const start = Date.now();
        const tick = () => {
          const t = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - (1 - t) ** 3;
          setStudentsCount(Math.round(ease * 51));
          if (t < 1) {
            raf = requestAnimationFrame(tick);
          } else {
            setStatsDone(true);
          }
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const openModal = () => setBookingOpen(true);
  const closeModal = () => setBookingOpen(false);

  return (
    <div className="landing-root">
      <nav>
        <a href="/" className="nav-logo">
          <img className="nav-logo-img" src="/landing/logo.png" alt="Gojo Learn" />
          <span className="nav-logo-sub">Школа японского языка</span>
        </a>
        <div className="nav-links">
          <a href="#how" className="nav-link">
            Как работает
          </a>
          <a href="#pricing" className="nav-link">
            Цены
          </a>
          <a href="#mission" className="nav-link">
            Команда
          </a>
          <a href="/login" className="nav-login">
            Войти
          </a>
          <Button variant="unstyled" type="button" className="nav-cta" onClick={openModal}>
            Бесплатный первый урок
          </Button>
          <Button
            variant="unstyled"
            type="button"
            className="nav-burger"
            aria-label="Меню"
            aria-expanded={navOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setNavOpen((o) => !o)}
          >
            {navOpen ? "✕" : "☰"}
          </Button>
        </div>
        <div id="landing-mobile-nav" className={`nav-mobile ${navOpen ? "open" : ""}`}>
          <Button
            variant="unstyled"
            type="button"
            className="nav-mobile-link"
            onClick={() => {
              setNavOpen(false);
              document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Как работает
          </Button>
          <Button
            variant="unstyled"
            type="button"
            className="nav-mobile-link"
            onClick={() => {
              setNavOpen(false);
              document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Цены
          </Button>
          <Button
            variant="unstyled"
            type="button"
            className="nav-mobile-link"
            onClick={() => {
              setNavOpen(false);
              document.querySelector("#mission")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Команда
          </Button>
          <a href="/login" onClick={() => setNavOpen(false)}>
            Войти
          </a>
          <Button
            variant="unstyled"
            type="button"
            className="nav-mobile-cta"
            onClick={() => {
              setNavOpen(false);
              openModal();
            }}
          >
            Бесплатный первый урок
          </Button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Японский,
            <br />
            который не хочется
            <br />
            <span className="orange">бросать.</span>
          </h1>
          <p className="hero-subtitle">
            Учишься в приложении, а живой преподаватель следит за прогрессом и не даёт сойти с
            дистанции.
          </p>
          <div className="hero-btns">
            <Button variant="unstyled" type="button" className="btn-primary" onClick={openModal}>
              Бесплатный первый урок
            </Button>
            <a href="#how" className="btn-secondary-dark">
              Как это работает
            </a>
          </div>
          <p className="hero-trust-note">25 минут · онлайн · без оплаты и обязательств</p>
        </div>

        <div className="hero-product-col">
          <div className="hero-kana-card" aria-labelledby="hero-kana-title">
            <div className="hero-kana-head">
              <span id="hero-kana-title">Хирагана · ряд «СА»</span>
              <span className="hero-kana-step">
                {heroKanaStep === 2 ? "Слово прочитано" : `Знак ${heroKanaStep + 1} из 2`}
                <span className="hero-kana-progress" aria-hidden="true">
                  {[0, 1].map((dot) => (
                    <span
                      key={dot}
                      className={dot < heroKanaStep ? "done" : dot === heroKanaStep ? "active" : ""}
                    />
                  ))}
                </span>
              </span>
            </div>

            <div
              className="hero-kana-symbol"
              aria-label={heroKanaStep === 0 ? "Хирагана су" : "Хирагана ши"}
            >
              {heroKanaStep === 0 ? "す" : "し"}
            </div>
            <p className="hero-kana-prompt">Как читается этот знак?</p>

            <div className="hero-kana-options">
              {heroKanaOptions.map((option) => {
                const selected = heroKanaAnswer === option;
                const question = HERO_KANA_QUESTIONS[Math.min(heroKanaStep, 1)];
                const isCorrect = option === question.correct;
                const className = selected ? (isCorrect ? "correct" : "wrong") : "";
                return (
                  <Button
                    variant="unstyled"
                    key={option}
                    type="button"
                    className={className}
                    aria-pressed={selected}
                    disabled={heroKanaStep === 2 || (heroKanaStep === 0 && heroKanaAnswer === "su")}
                    onClick={() => {
                      setHeroKanaAnswer(option);
                      if (!isCorrect) return;
                      if (heroKanaStep === 1) {
                        setHeroKanaStep(2);
                      }
                    }}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>

            <div
              className={`hero-kana-payoff ${
                heroKanaStep === 2 || (heroKanaStep === 0 && heroKanaAnswer === "su")
                  ? "visible"
                  : ""
              }`}
              aria-hidden={heroKanaStep !== 2 && !(heroKanaStep === 0 && heroKanaAnswer === "su")}
              aria-live="polite"
            >
              {heroKanaStep === 0 ? (
                <>
                  <span>
                    Верно — <strong>す</strong> читается <strong>su</strong>.
                  </span>
                  <Button
                    variant="unstyled"
                    type="button"
                    onClick={() => {
                      setHeroKanaStep(1);
                      setHeroKanaAnswer(null);
                      setHeroKanaOptions(shuffleHeroKanaOptions(HERO_KANA_QUESTIONS[1].options));
                    }}
                  >
                    Следующий знак →
                  </Button>
                </>
              ) : (
                <>
                  <span>
                    <strong>すし</strong> = суши. Первое слово прочитано.
                  </span>
                  <Link href="/kana">Продолжить урок →</Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-teacher-chip">
            <span className="hero-teacher-avatar" aria-hidden="true">
              РР
            </span>
            <span>Прогресс проверяет живой преподаватель</span>
          </div>
        </div>
      </section>

      <div className="phrase-marquee">
        <div className="marquee-track">
          <span className="phrase">
            <span className="jp">はじめまして</span>
            <span className="sep">·</span>
            <span className="ru">Приятно познакомиться</span>
          </span>
          <span className="phrase">
            <span className="jp">木漏れ日</span>
            <span className="sep">·</span>
            <span className="ru">Свет сквозь листья</span>
          </span>
          <span className="phrase">
            <span className="jp">がんばって</span>
            <span className="sep">·</span>
            <span className="ru">Давай, ты можешь!</span>
          </span>
          <span className="phrase">
            <span className="jp">侘び寂び</span>
            <span className="sep">·</span>
            <span className="ru">Красота несовершенства</span>
          </span>
          <span className="phrase">
            <span className="jp">よろしく</span>
            <span className="sep">·</span>
            <span className="ru">Рад знакомству</span>
          </span>
          <span className="phrase">
            <span className="jp">積ん読</span>
            <span className="sep">·</span>
            <span className="ru">Купить и не читать</span>
          </span>
          <span className="phrase">
            <span className="jp">すごい</span>
            <span className="sep">·</span>
            <span className="ru">Потрясающе!</span>
          </span>
          <span className="phrase">
            <span className="jp">木枯らし</span>
            <span className="sep">·</span>
            <span className="ru">Первый зимний ветер</span>
          </span>
          <span className="phrase">
            <span className="jp">わかりました</span>
            <span className="sep">·</span>
            <span className="ru">Понял(а)</span>
          </span>
          <span className="phrase">
            <span className="jp">物の哀れ</span>
            <span className="sep">·</span>
            <span className="ru">Грусть вещей</span>
          </span>
          <span className="phrase">
            <span className="jp">日本語</span>
            <span className="sep">·</span>
            <span className="ru">Японский язык</span>
          </span>
          <span className="phrase">
            <span className="jp">木漏れ日</span>
            <span className="sep">·</span>
            <span className="ru">Свет сквозь листья</span>
          </span>
          <span className="phrase">
            <span className="jp">はじめまして</span>
            <span className="sep">·</span>
            <span className="ru">Приятно познакомиться</span>
          </span>
          <span className="phrase">
            <span className="jp">侘び寂び</span>
            <span className="sep">·</span>
            <span className="ru">Красота несовершенства</span>
          </span>
          <span className="phrase">
            <span className="jp">がんばって</span>
            <span className="sep">·</span>
            <span className="ru">Давай, ты можешь!</span>
          </span>
          <span className="phrase">
            <span className="jp">積ん読</span>
            <span className="sep">·</span>
            <span className="ru">Купить и не читать</span>
          </span>
          <span className="phrase">
            <span className="jp">すごい</span>
            <span className="sep">·</span>
            <span className="ru">Потрясающе!</span>
          </span>
          <span className="phrase">
            <span className="jp">物の哀れ</span>
            <span className="sep">·</span>
            <span className="ru">Грусть вещей</span>
          </span>
          <span className="phrase">
            <span className="jp">わかりました</span>
            <span className="sep">·</span>
            <span className="ru">Понял(а)</span>
          </span>
          <span className="phrase">
            <span className="jp">日本語</span>
            <span className="sep">·</span>
            <span className="ru">Японский язык</span>
          </span>
        </div>
      </div>

      {/* ① PAIN — второй экран, сразу после hero */}
      <section className="section-pain">
        <div className="section-label">Узнаёшь себя?</div>
        <h2 className="section-title">
          Почему японский
          <br />
          так часто <em>бросают</em>
        </h2>
        <div className="pain-grid">
          <div className="pain-card">
            <div className="pain-title">Хаос без системы</div>
            <div className="pain-body">
              Приложение, пара видео на YouTube, учебник с полки. Полгода прошло — а диалог всё ещё
              не складывается. Кусочки без системы не работают.
            </div>
          </div>
          <div className="pain-card">
            <div className="pain-title">Учишь, но не говоришь</div>
            <div className="pain-body">
              Слова знаешь, грамматику понимаешь — но в разговоре теряешься. Приложения не учат
              говорить, потому что там не с кем практиковаться.
            </div>
          </div>
          <div className="pain-card">
            <div className="pain-title">Прогресс незаметен</div>
            <div className="pain-body">
              Занимаешься несколько месяцев, но не понимаешь, на каком ты уровне и куда двигаться
              дальше. Без структуры нет ощущения роста.
            </div>
          </div>
        </div>
        <div className="pain-cta-wrap">
          <Button variant="unstyled" type="button" className="btn-primary" onClick={openModal}>
            Начать по-другому
          </Button>
        </div>
      </section>

      {/* ② HOW IT WORKS — решение сразу после боли */}
      <section className="section-how" id="how">
        <div className="section-label">Процесс</div>
        <h2 className="section-title">Как это работает</h2>

        <div className="how-grid">
          <Link href="/onboarding/quiz" className="how-card how-card-featured">
            <div className="how-card-head">
              <div className="how-card-head-left">
                <span className="how-card-step">Шаг 01 · Бесплатно</span>
                <span className="how-card-head-label">
                  <span className="accent">Старт</span>
                </span>
              </div>
            </div>
            <div className="how-card-body">
              <div className="how-card-title">Определи свой уровень</div>
              <div className="how-card-text">
                Короткий тест — 10 минут, без регистрации, и мы знаем с чего начать.
              </div>
              <div className="how-card-cta how-card-cta-btn">Пройти тест →</div>
            </div>
          </Link>

          <div className="how-card">
            <div className="how-card-head">
              <div className="how-card-head-left">
                <span className="how-card-step">Шаг 02</span>
                <span className="how-card-head-label">Уроки</span>
              </div>
            </div>
            <div className="how-card-body">
              <div className="how-card-title">Живые занятия от 2×/нед</div>
              <div className="how-card-text">
                Индивидуально или в группе до 8 человек — с живым преподавателем.
              </div>
            </div>
          </div>

          <div className="how-card">
            <div className="how-card-head">
              <div className="how-card-head-left">
                <span className="how-card-step">Шаг 03</span>
                <span className="how-card-head-label">AI‑практика</span>
              </div>
            </div>
            <div className="how-card-body">
              <div className="how-card-title">Тренировки каждый день</div>
              <div className="how-card-text">
                Карточки, диалоги и разбор ошибок — между уроками, каждый день.
              </div>
            </div>
          </div>

          <div className="how-card">
            <div className="how-card-head">
              <div className="how-card-head-left">
                <span className="how-card-step">Шаг 04</span>
                <span className="how-card-head-label">
                  <span className="accent">Результат</span>
                </span>
              </div>
            </div>
            <div className="how-card-body">
              <div className="how-card-title">Реальный уровень языка</div>
              <div className="how-card-text">
                Ты доходишь до точки, где язык работает на тебя — без скуки.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ③ STATS — первое доказательство после объяснения */}
      <section className="stats-strip" ref={statsRef}>
        <div className="stats-strip-inner">
          <div className="stat-item">
            <div className={`stat-num${statsDone ? " stat-num-done" : ""}`}>
              {studentsCount > 0 ? studentsCount : "51"}
            </div>
            <div className="stat-label">
              {studentsLabel(studentsCount > 0 ? studentsCount : 51)}
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-badge">2–3 раза в неделю</div>
            <div className="stat-label">живые уроки с преподавателем, а не только карточки</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-badge">AI-практика 24/7</div>
            <div className="stat-label">карточки, диалоги и разбор ошибок между уроками</div>
          </div>
        </div>
      </section>

      {/* ④ REVIEWS — подтверждение после доказательств */}
      <section className="section-reviews">
        <div className="section-label">Отзывы</div>
        <h2 className="section-title">
          Что говорят
          <br />
          наши <em>ученики</em>
        </h2>
        <div className="reviews-marquee">
          <div className="reviews-marquee-track">
            {REVIEW_LOOP.map((r, i) => (
              <div className="review-card" key={`${r.name}-${i < REVIEWS.length ? "a" : "b"}`}>
                <div className="review-stars">
                  {REVIEW_STAR_KEYS.map((key) => (
                    <svg key={key} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <div className="review-text">{r.text}</div>
                <div className="review-author">
                  <div className="review-name">{r.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ TEAM — доверие перед ценами */}
      <section className="section-mission" id="mission">
        <div className="section-label">Команда</div>
        <div className="mission-merged">
          {/* Left: quote */}
          <div className="mission-merged-left">
            <h2 className="mission-merged-title">
              Японский — сложный.
              <br />
              Но путь до результата
              <br />
              <em>может быть понятным.</em>
            </h2>
            <p className="mission-body">
              Gojo — школа для тех, кто хочет не просто «учить японский», а{" "}
              <strong>реально им пользоваться</strong>: переехать, работать, смотреть аниме без
              субтитров.
            </p>
            <p className="mission-body mission-body-strong">
              Потому что нам важен ваш результат, а не просто оплата.
            </p>
          </div>

          {/* Right: team */}
          <div className="mission-merged-team">
            {/* Ruslan — founder, featured */}
            <div className="mteam-card mteam-featured">
              <img className="mteam-photo" src="/founder.webp" alt="Руслан Рустаев" />
              <div className="mteam-info">
                <div className="mteam-badge">Со-основатель</div>
                <div className="mteam-name">Руслан Рустаев</div>
                <div className="mteam-role">Токио, Япония</div>
                <div className="mteam-creds">
                  <span>МГУ · фак. Японии</span>
                  <span>Переводчик «Газпром»</span>
                  <span>Автор изд. «Бомбора»</span>
                  <span className="mteam-cred-highlight">⭐ Топ-преподаватель Profi.ru</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ⑤b TEAM — Максим, технический директор */}
      <section className="section-mission section-mission-alt">
        <div className="mission-merged">
          {/* Left: Maksim card */}
          <div className="mission-merged-team">
            <div className="mteam-card mteam-featured">
              <img className="mteam-photo" src="/maksim.webp" alt="Максим Кадочников" />
              <div className="mteam-info">
                <div className="mteam-badge">Со-основатель и технический директор</div>
                <div className="mteam-name">Максим Кадочников</div>
                <div className="mteam-role">Токио, Япония</div>
                <div className="mteam-creds">
                  <span>Менеджер по автоматизации в Ракутен</span>
                  <span>3 года в Aviatrix</span>
                  <span className="mteam-cred-highlight">⭐ 6 лет в разработке платформ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: message */}
          <div className="mission-merged-left">
            <h2 className="mission-merged-title">
              Технологии не
              <br />
              заменяют учителя —<br />
              <em>они делают его точнее.</em>
            </h2>
            <p className="mission-body">
              Мы строим платформу, где прогресс <strong>измерим</strong>, практика адаптивна к
              вашему темпу, а расписание встраивается в вашу жизнь — а не наоборот.
            </p>
            <p className="mission-body mission-body-strong">
              Хорошая технология незаметна. Вы просто учитесь быстрее.
            </p>
          </div>
        </div>
      </section>

      <section className="section-pricing" id="pricing">
        <div className="section-label">Тарифы</div>
        <h2 className="section-title">
          Выбери свой <em>формат</em>
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "var(--ink-2)",
            maxWidth: "560px",
            lineHeight: "1.6",
            marginBottom: "0",
          }}
        >
          Разовая оплата без автопродления. Первый урок бесплатно — платишь только если решишь
          продолжать.
        </p>

        <div className="pricing-grid">
          <div className="pricing-card featured">
            <div className="pricing-badge">★ Лучший прогресс</div>
            <div className="pricing-name">Индивидуально</div>
            <div className="pricing-tagline">
              Максимальная скорость и внимание. Занятия под тебя, без компромиссов.
            </div>
            <div className="pricing-divider" />
            <div className="pricing-price-wrap">
              <span className="pricing-currency">₽</span>
              <span className="pricing-price">23 200</span>
            </div>
            <div className="pricing-period">за 8 занятий · ₽2 900 за занятие</div>
            <div className="pricing-old">90 минут · без автопродления</div>
            <div className="pricing-features">
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>8 индивидуальных занятий
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Полностью персональная программа
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>AI-практика между уроками
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Все материалы и записи уроков
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Приоритетная обратная связь
              </div>
            </div>
            <Button variant="unstyled" type="button" className="pricing-cta" onClick={openModal}>
              Начать индивидуально
            </Button>
          </div>

          <div className="pricing-card">
            <div className="pricing-name">Группа</div>
            <div className="pricing-tagline">
              Живое общение и практика с другими учениками. Группы до 8 человек.
            </div>
            <div className="pricing-divider" />
            <div className="pricing-price-wrap">
              <span className="pricing-currency">₽</span>
              <span className="pricing-price">8 720</span>
            </div>
            <div className="pricing-period">за 8 занятий · ₽1 090 за занятие</div>
            <div className="pricing-old">90 минут · без автопродления</div>
            <div className="pricing-features">
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>8 групповых занятий
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Группы до 8 человек
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>AI-практика между уроками
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Все материалы и записи уроков
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Разговорная практика с группой
              </div>
            </div>
            <Button variant="unstyled" type="button" className="pricing-cta" onClick={openModal}>
              Записаться в группу
            </Button>
          </div>

          <div className="pricing-card">
            <div className="pricing-name">Заочная группа</div>
            <div className="pricing-tagline">
              Учись по записям и материалам в своём темпе. Без живых эфиров.
            </div>
            <div className="pricing-divider" />
            <div className="pricing-price-wrap">
              <span className="pricing-currency">₽</span>
              <span className="pricing-price">6 400</span>
            </div>
            <div className="pricing-period">за 30 дней · разовая оплата</div>
            <div className="pricing-old" style={{ color: "#b0b0b0" }}>
              Записи 8 занятий · ₽800 за занятие
            </div>
            <div className="pricing-features">
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Доступ ко всем записям уроков
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>Все учебные материалы
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>AI-практика и карточки
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot" style={{ opacity: "0.4" }}>
                  –
                </span>
                <span style={{ color: "var(--muted)" }}>Без живых уроков с преподавателем</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-feature-dot" style={{ opacity: "0.4" }}>
                  –
                </span>
                <span style={{ color: "var(--muted)" }}>Без индивидуальной обратной связи</span>
              </div>
            </div>
            <Button variant="unstyled" type="button" className="pricing-cta" onClick={openModal}>
              Записаться на бесплатный урок
            </Button>
          </div>
        </div>
        <p className="pricing-note">
          Специальные цены для первой когорты · Записаться — без оплаты и обязательств
        </p>
      </section>

      <section className="section-faq" id="faq">
        <div className="faq-inner">
          <aside className="faq-aside">
            <div className="section-label indigo">Частые вопросы</div>
            <h2 className="faq-aside-title">
              Знай, за что <em>платишь.</em>
            </h2>
            <p className="faq-aside-text">
              Мы набираем первую когорту и отвечаем на всё открыто. Не нашёл ответа — напиши,
              ответим лично.
            </p>
            <a
              href="https://t.me/gojoedu"
              target="_blank"
              rel="noopener noreferrer"
              className="faq-aside-link"
            >
              Написать нам
            </a>
          </aside>

          <div className="faq-list">
            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">01</span>Сколько это стоит?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                Тарифы открыты — они выше на странице: от ₽6 400. Все платежи разовые, без
                автопродления. Для первой когорты это <strong>специальная цена</strong> — запишись
                сейчас, и мы закрепим её за тобой.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">02</span>Как быстро можно начать?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                Записываешься на бесплатный урок, мы определяем уровень и согласовываем удобное
                время. Первый урок обычно проходит в течение <strong>3–5 дней</strong> после записи.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">03</span>Я полный ноль. С чего начинать?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                С нуля — <strong>наш основной формат</strong>. Первые недели мы вместе пройдём
                хирагану, катакану и базовую фонетику. Ничего знать заранее не нужно.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">04</span>А если я уже учил японский?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                На бесплатном первом уроке мы определим твой уровень и подберём подходящую группу —
                либо подтянем то, что ушло, либо возьмём сразу выше.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">05</span>Кто преподаёт?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                Команда из <strong>русскоязычных преподавателей с японским образованием</strong> и
                носителей языка. Мы публикуем профили преподавателей перед стартом каждой группы —
                никаких сюрпризов.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">06</span>Что если я пропущу урок?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                Все занятия записываются — посмотришь в удобное время. Домашка и AI-практика тебя
                ждут в приложении.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">07</span>Чем вы отличаетесь от приложений?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                Приложения хороши для одиночной зубрёжки, но <strong>говорить</strong> ты на них не
                научишься — потому что говорить не с кем. У нас живой человек 2–3 раза в неделю +
                AI-практика между уроками. Это не либо/либо.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">08</span>Можно ли вернуть деньги?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                Да. До начала оказания услуг вернём всю сумму, после начала — за вычетом стоимости
                уже оказанных услуг и фактически понесённых расходов. Подробные условия указаны в
                публичной оферте до оплаты.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-q">
                <span>
                  <span className="faq-q-num">09</span>Записаться сейчас — это уже оплата?
                </span>
                <span className="faq-q-icon">+</span>
              </summary>
              <div className="faq-a">
                <strong>Нет.</strong> Запись на бесплатный урок — это просто бронирование времени.
                Никаких списаний и обязательств. Оплата только если решишь продолжать.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* ⑦ GUIDE — ловим тех, кто дочитал до цены, но пока не готов записаться */}
      <section className="section-lm" id="guide">
        <div className="lm-inner">
          <div>
            <div className="section-label">Бесплатный гайд</div>
            <h2 className="lm-title">
              Слова запоминаются <em>сами</em>
            </h2>
            <p className="lm-body">
              Anki + Yomitan + asbplayer — настройка за 30 минут. Дальше любое видео, статья или
              манга становятся источником карточек: одно нажатие, и слово улетает в Anki с
              контекстом, аудио, частотностью и переводом.
            </p>
            <ul className="lm-list">
              <li>5 шагов со скриншотами — от установки Anki до субтитров на YouTube</li>
              <li>Готовый конфиг Yomitan и колода Anki с правильными полями</li>
              <li>Русские словари, питч-акцент, частотность и уровни JLPT</li>
            </ul>
            <Link href="/miner" className="btn-primary">
              Забрать гайд
            </Link>
          </div>
          <div className="lm-cover">
            <img
              src="/landing/miner-cover.webp"
              alt="Обложка гайда «Личный словарь-майнер»"
              width={1080}
              height={1350}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="section-cta" id="cta">
        <h2 className="cta-title">
          Попробуй японский —<br />
          первый урок <em>бесплатно.</em>
        </h2>
        <p className="cta-sub">
          Познакомимся, определим уровень и подберём формат. Никакой оплаты на первом уроке.
        </p>
        <Button variant="unstyled" type="button" className="btn-cta" onClick={openModal}>
          Первый урок — бесплатно
        </Button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            marginTop: "40px",
            flexWrap: "wrap",
          }}
        >
          <a
            href="https://t.me/gojoedu"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "14px 22px",
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: "700",
              transition: "background 0.18s",
            }}
          >
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.24-.02.27z"
                fill="#29B6F6"
              />
            </svg>
            Telegram сообщество
          </a>
          <a
            href="https://instagram.com/gojolearn"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "14px 22px",
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: "700",
              transition: "background 0.18s",
            }}
          >
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E1306C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            Instagram сообщество
          </a>
        </div>
      </section>

      <footer>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/landing/logo.png"
            alt="Gojo Learn"
            style={{ height: "26px", width: "auto", filter: "invert(1)", opacity: 0.75 }}
          />
          <div
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Школа японского
          </div>
        </div>
        <span className="footer-text">© 2026 Gojo Learn. Все права защищены.</span>
        <div className="footer-links">
          <a href="/privacy" className="footer-link">
            Политика конфиденциальности
          </a>
          <a href="/offer" className="footer-link">
            Публичная оферта
          </a>
          <a
            href="https://t.me/gojoedu"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Telegram
          </a>
        </div>
      </footer>

      <BookingModal open={bookingOpen} onClose={closeModal} />
    </div>
  );
}
