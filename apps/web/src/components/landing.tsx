"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PHRASES = [
  "смотреть мангу и аниме в оригинале.",
  "приобщиться к культуре Японии.",
  "учиться и жить в Японии.",
];

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

/**
 * Hero typewriter. Owns its own state so per-keystroke updates don't re-render
 * the whole landing tree. Calls onAdvance(index) when it rolls to a new phrase
 * so the parent can sync the hero triptych.
 */
function CyclingWord({ onAdvance }: { onAdvance: (index: number) => void }) {
  const [text, setText] = useState(PHRASES[0]);
  useEffect(() => {
    let current = 0;
    let charIndex = PHRASES[0].length;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const type = () => {
      const phrase = PHRASES[current];
      if (!deleting) {
        charIndex += 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex === phrase.length) {
          timer = setTimeout(() => {
            deleting = true;
            type();
          }, 2600);
          return;
        }
        timer = setTimeout(type, 44);
      } else {
        charIndex -= 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          current = (current + 1) % PHRASES.length;
          onAdvance(current % 3);
          timer = setTimeout(type, 320);
          return;
        }
        timer = setTimeout(type, 24);
      }
    };
    timer = setTimeout(() => {
      deleting = true;
      type();
    }, 2600);
    return () => clearTimeout(timer);
  }, [onAdvance]);
  return <>{text}</>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PENDING_LEAD_KEY = "gojo:pending-lead-email";

const readValue = (id: string) =>
  (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? "";

export function Landing() {
  const [active, setActive] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSubmitted, setGuideSubmitted] = useState(false);
  const [intercomOpen, setIntercomOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [studentsCount, setStudentsCount] = useState(0);
  const [yearsCount, setYearsCount] = useState(0);
  const [statsDone, setStatsDone] = useState(false);
  const statsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    let raf: number;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) {
          cancelAnimationFrame(raf);
          setStudentsCount(0);
          setYearsCount(0);
          setStatsDone(false);
          return;
        }
        setStatsDone(false);
        const duration = 1600;
        const start = Date.now();
        const tick = () => {
          const t = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - (1 - t) ** 3;
          setStudentsCount(Math.round(ease * 112));
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
  const openGuideModal = () => setGuideOpen(true);
  const closeGuideModal = () => setGuideOpen(false);
  const toggleIntercom = () => {
    setIntercomOpen((o) => !o);
    setShowTooltip(false);
  };

  const submitForm = async () => {
    if (!readValue("f-name") || !readValue("f-email")) {
      toast.error("Пожалуйста, заполни имя и email");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "booking",
          name: readValue("f-name"),
          email: readValue("f-email"),
          contact: readValue("f-contact") || undefined,
          level: readValue("f-level") || undefined,
          goal: readValue("f-goal") || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem(PENDING_LEAD_KEY, readValue("f-email"));
      setBookingSubmitted(true);
    } catch {
      toast.error("Не удалось отправить заявку. Попробуй ещё раз.");
    }
  };
  const submitGuideForm = async () => {
    if (!readValue("g-name") || !readValue("g-email")) {
      toast.error("Пожалуйста, заполни имя и email");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "guide",
          name: readValue("g-name"),
          email: readValue("g-email"),
          contact: readValue("g-tg") || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setGuideSubmitted(true);
    } catch {
      toast.error("Не удалось отправить. Попробуй ещё раз.");
    }
  };

  // lock body scroll while a modal is open
  useEffect(() => {
    const open = bookingOpen || guideOpen;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bookingOpen, guideOpen]);

  // close modals on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBookingOpen(false);
        setGuideOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // auto-hide the intercom tooltip after 4s
  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="landing-root">
      <nav>
        <a href="#" className="nav-logo">
          <img className="nav-logo-img" src="/landing/logo.png" alt="Gojo Learn" />
          <span className="nav-logo-sub">Школа японского языка</span>
        </a>
        <div className="nav-links">
          <a href="#mission" className="nav-link">
            Команда
          </a>
          <a href="#how" className="nav-link">
            Как работает
          </a>
          <a href="#pricing" className="nav-link">
            Цены
          </a>
          <a href="#faq" className="nav-link">
            Вопросы
          </a>
          <a href="/kana" className="nav-link">
            Тренажёр
          </a>
          <a href="/onboarding/quiz" className="nav-link">
            Квиз уровня
          </a>
          <a href="/dashboard" className="nav-link">
            Личный кабинет
          </a>
          <a
            href="#"
            className="nav-cta"
            onClick={(e) => {
              e.preventDefault();
              openModal();
            }}
          >
            Попробовать бесплатно
          </a>
          <button
            type="button"
            className="nav-burger"
            aria-label="Меню"
            onClick={() => setNavOpen((o) => !o)}
          >
            {navOpen ? "✕" : "☰"}
          </button>
        </div>
        <div className={`nav-mobile ${navOpen ? "open" : ""}`}>
          <a href="#mission" onClick={() => setNavOpen(false)}>
            Команда
          </a>
          <a href="#how" onClick={() => setNavOpen(false)}>
            Как работает
          </a>
          <a href="#pricing" onClick={() => setNavOpen(false)}>
            Цены
          </a>
          <a href="#faq" onClick={() => setNavOpen(false)}>
            Вопросы
          </a>
          <a href="/kana" onClick={() => setNavOpen(false)}>
            Тренажёр
          </a>
          <a href="/onboarding/quiz" onClick={() => setNavOpen(false)}>
            Квиз уровня
          </a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-brand">
            <img className="hero-brand-logo" src="/landing/logo.png" alt="Gojo Learn" />
            <span className="hero-brand-divider" />
            <span className="hero-brand-tag">
              Школа японского языка
              <br />
              нового поколения
            </span>
          </div>
          <h1 className="hero-title">
            Японский,
            <br />
            который не хочется
            <br />
            <span className="orange">бросать.</span>
          </h1>
          <p className="hero-subtitle">
            Для тех, кто хочет{" "}
            <span id="cycling-text-wrap">
              <span id="cycling-text">
                <CyclingWord onAdvance={setActive} />
              </span>
              <span className="cycling-cursor">|</span>
            </span>
          </p>
          <div className="hero-btns">
            <a
              href="#"
              className="btn-primary"
              onClick={(e) => {
                e.preventDefault();
                openModal();
              }}
            >
              Начать учить японский
            </a>
            <a href="/onboarding/quiz" className="btn-secondary-dark">
              Пройти тест уровня
            </a>
          </div>
          <a href="/kana" className="hero-trainer-link">
            🎮 Тренажёр
          </a>
        </div>

        <div className="hero-image-col" id="hero-images">
          <div
            className={`triptych-card ${active === 0 ? "active" : "dim"}`}
            onClick={() => setActive(0)}
          >
            <img className="img-manga" src="/landing/manga.webp" alt="Манга и аниме в оригинале" />
            <div className="label">Манга и аниме</div>
          </div>
          <div
            className={`triptych-card ${active === 1 ? "active" : "dim"}`}
            onClick={() => setActive(1)}
          >
            <img className="img-culture" src="/landing/culture.webp" alt="Культура Японии" />
            <div className="label">Культура</div>
          </div>
          <div
            className={`triptych-card ${active === 2 ? "active" : "dim"}`}
            onClick={() => setActive(2)}
          >
            <img className="img-study" src="/landing/study.webp" alt="Учёба и жизнь в Японии" />
            <div className="label">Жить в Японии</div>
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
              Начал с Duolingo, перешёл на YouTube, купил учебник. Полгода прошло — ни один диалог
              не получается. Потому что всё это — не система.
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
          <a
            href="#"
            className="btn-primary"
            onClick={(e) => {
              e.preventDefault();
              openModal();
            }}
          >
            Начать по-другому
          </a>
        </div>
      </section>

      {/* ② HOW IT WORKS — решение сразу после боли */}
      <section className="section-how" id="how">
        <div className="section-label">Процесс</div>
        <h2 className="section-title">Как это работает</h2>

        <div className="how-grid">
          <Link href="/onboarding/quiz" className="how-card">
            <div className="how-card-head">
              <div className="how-card-head-left">
                <span className="how-card-step">Шаг 01</span>
                <span className="how-card-head-label">
                  <span className="accent">Старт</span>
                </span>
              </div>
            </div>
            <div className="how-card-body">
              <div className="how-card-title">Определи свой уровень</div>
              <div className="how-card-text">
                Короткий тест — 10 минут, и мы знаем с чего начать.
              </div>
              <div className="how-card-cta">Пройти тест</div>
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
              {studentsCount > 0 ? studentsCount : "112"}
            </div>
            <div className="stat-label">довольных учеников</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-badge">Используем ИИ</div>
            <div className="stat-label">
              вас тренируют несколько моделей и агентов между уроками
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-badge">Инновационная подача</div>
            <div className="stat-label">аниме, манга и живые уроки</div>
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
              <img className="mteam-photo" src="/founder.png" alt="Руслан Рустаев" />
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
              <img className="mteam-photo" src="/maksim.jpg" alt="Максим Кадочников" />
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
          Все тарифы — месячная подписка. Первый урок бесплатно — платишь только если решишь
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
              <span className="pricing-price">30 000</span>
            </div>
            <div className="pricing-period">в месяц · при оплате подпиской</div>
            <div className="pricing-old">Поурочно: ₽ 40 000 / мес</div>
            <div className="pricing-features">
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>8 индивидуальных уроков в месяц
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
            <a
              href="#"
              className="pricing-cta"
              onClick={(e) => {
                e.preventDefault();
                openModal();
              }}
            >
              Начать индивидуально
            </a>
          </div>

          <div className="pricing-card">
            <div className="pricing-name">Группа</div>
            <div className="pricing-tagline">
              Живое общение и практика с другими учениками. Группы до 8 человек.
            </div>
            <div className="pricing-divider" />
            <div className="pricing-price-wrap">
              <span className="pricing-currency">₽</span>
              <span className="pricing-price">15 000</span>
            </div>
            <div className="pricing-period">в месяц · при оплате подпиской</div>
            <div className="pricing-old">Поурочно: ₽ 22 000 / мес</div>
            <div className="pricing-features">
              <div className="pricing-feature">
                <span className="pricing-feature-dot">✓</span>10–12 групповых уроков в месяц
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
            <a
              href="#"
              className="pricing-cta"
              onClick={(e) => {
                e.preventDefault();
                openModal();
              }}
            >
              Записаться в группу
            </a>
          </div>

          <div className="pricing-card">
            <div className="pricing-name">Заочная группа</div>
            <div className="pricing-tagline">
              Учись по записям и материалам в своём темпе. Без живых эфиров.
            </div>
            <div className="pricing-divider" />
            <div className="pricing-price-wrap">
              <span className="pricing-currency">₽</span>
              <span className="pricing-price">10 000</span>
            </div>
            <div className="pricing-period">в месяц · при оплате подпиской</div>
            <div className="pricing-old" style={{ color: "#b0b0b0" }}>
              Поурочно: ₽ 14 000 / мес
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
            <a
              href="#"
              className="pricing-cta"
              onClick={(e) => {
                e.preventDefault();
                openModal();
              }}
            >
              Записаться на бесплатный урок
            </a>
          </div>
        </div>
        <p className="pricing-note">
          Цены указаны со скидкой 40% для первой когорты · Записаться — без оплаты и обязательств
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
              Школа ещё запускается, и мы стараемся отвечать на всё открыто. Не нашёл ответа —
              напиши, ответим лично.
            </p>
            <a href="mailto:ruslan@gojolearn.ru" className="faq-aside-link">
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
                Цена для первой когорты — со скидкой <strong>40% от планируемой</strong>. Финальные
                тарифы озвучим перед стартом набора. Запишись сейчас и мы закрепим скидку за тобой.
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
                  <span className="faq-q-num">07</span>Чем вы отличаетесь от Duolingo / приложений?
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
                Да. В первые две недели — без вопросов. Дальше — пропорционально оставшимся
                занятиям. Условия пропишем в договоре до оплаты.
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

      <section className="section-cta" id="cta">
        <h2 className="cta-title">
          Попробуй японский —<br />
          первый урок <em>бесплатно.</em>
        </h2>
        <p className="cta-sub">
          Познакомимся, определим уровень и подберём формат. Никакой оплаты на первом уроке.
        </p>
        <a
          href="#"
          className="btn-cta"
          onClick={(e) => {
            e.preventDefault();
            openModal();
          }}
        >
          Первый урок — бесплатно
        </a>

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
            Telegram-сообщество
          </a>
          <a
            href="#"
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
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                fill="#25D366"
              />
            </svg>
            WhatsApp-сообщество
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
          <a href="#" className="footer-link">
            Политика конфиденциальности
          </a>
          <a href="mailto:ruslan@gojolearn.ru" className="footer-link">
            ruslan@gojolearn.ru
          </a>
          <a href="mailto:tam@gojolearn.ru" className="footer-link">
            tam@gojolearn.ru
          </a>
        </div>
      </footer>

      <div
        className={`modal-overlay ${guideOpen ? "open" : ""}`}
        id="guide-modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeGuideModal();
        }}
      >
        <div className="modal-box">
          <button type="button" className="modal-close" onClick={closeGuideModal}>
            ✕
          </button>

          <div id="guide-form-view" style={{ display: guideSubmitted ? "none" : "block" }}>
            <div className="modal-tag">📄 Бесплатный гайд</div>
            <h2 className="modal-title">
              Получи гайд
              <br />
              <em>на почту</em>
            </h2>
            <p className="modal-sub">
              7 страниц: система N5→N3, программа по неделям, AI-практика, преподаватели. Оставь
              контакты — пришлём сразу.
            </p>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="g-name">
                  Имя
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Как тебя зовут?"
                  id="g-name"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="g-email">
                  Email
                </label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="your@email.com"
                  id="g-email"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="g-tg">
                  Telegram (необязательно)
                </label>
                <input className="form-input" type="text" placeholder="@username" id="g-tg" />
              </div>
              <button type="button" className="form-submit" onClick={submitGuideForm}>
                Получить гайд
              </button>
              <p className="form-note">
                Никакого спама. Только гайд и, если захочешь, новости о старте школы.
              </p>
            </div>
          </div>

          <div
            className="form-success"
            id="guide-success-view"
            style={{ display: guideSubmitted ? "block" : "none" }}
          >
            <div className="form-success-icon">📄</div>
            <div className="form-success-title">Готово!</div>
            <p className="form-success-text">
              Гайд уже скачивается. Если не открылся — нажми ещё раз.
            </p>
            <a
              href="Gojo_Guide_Free.pdf"
              download
              className="form-submit"
              style={{
                display: "inline-block",
                textAlign: "center",
                textDecoration: "none",
                marginTop: "16px",
                borderRadius: "8px",
                padding: "14px 28px",
              }}
            >
              ⬇ Скачать PDF
            </a>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay ${bookingOpen ? "open" : ""}`}
        id="modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal-box">
          <button type="button" className="modal-close" onClick={closeModal}>
            ✕
          </button>

          <div id="modal-form-view" style={{ display: bookingSubmitted ? "none" : "block" }}>
            <div className="modal-tag">🎌 Бесплатный первый урок</div>
            <h2 className="modal-title">
              Попробуй японский
              <br />
              <em>без обязательств</em>
            </h2>
            <p className="modal-sub">
              Запишись на бесплатный первый урок. Никакой оплаты — просто познакомимся и определим
              твой уровень.
            </p>

            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="f-name">
                    Имя
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Как тебя зовут?"
                    id="f-name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="f-email">
                    Email
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="your@email.com"
                    id="f-email"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="f-contact">
                  Telegram или телефон
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="@username или +7 999 ..."
                  id="f-contact"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="f-level">
                  Твой уровень японского
                </label>
                <select className="form-select form-input" id="f-level">
                  <option value="">Выбери вариант</option>
                  <option>Полный ноль — начинаю с нуля</option>
                  <option>Знаю хирагану / катакану</option>
                  <option>N5 — базовый уровень</option>
                  <option>N4 — элементарный</option>
                  <option>N3 и выше</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="f-goal">
                  Что хочешь получить от японского?
                </label>
                <select className="form-select form-input" id="f-goal">
                  <option value="">Выбери вариант</option>
                  <option>Смотреть аниме / читать мангу в оригинале</option>
                  <option>Переехать или учиться в Японии</option>
                  <option>Работать с японскими партнёрами</option>
                  <option>Просто интересно / хочу попробовать</option>
                </select>
              </div>
              <button type="button" className="form-submit" onClick={submitForm}>
                Записаться на бесплатный урок
              </button>
              <p className="form-note">
                Нажимая кнопку, ты соглашаешься с политикой конфиденциальности. Никакого спама —
                только информация о записи.
              </p>
            </div>
          </div>

          <div
            className="form-success"
            id="modal-success-view"
            style={{ display: bookingSubmitted ? "block" : "none" }}
          >
            <div className="form-success-icon">🎌</div>
            <div className="form-success-title">Отлично, ждём тебя!</div>
            <p className="form-success-text">
              Мы получили твою заявку и свяжемся в течение 24 часов, чтобы договориться о времени
              первого урока.
              <br />
              <br />
              Создай аккаунт с тем же email, чтобы заявка привязалась к личному кабинету.
            </p>
            <a
              href="/login?mode=signup&intent=booking"
              className="form-submit"
              style={{
                display: "inline-block",
                textAlign: "center",
                textDecoration: "none",
                marginTop: "18px",
                borderRadius: "8px",
              }}
            >
              Создать аккаунт
            </a>
            <a
              href="https://t.me/gojoedu"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "14px",
                background: "var(--orange)",
                color: "var(--white)",
                padding: "13px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              ✈️ Telegram-сообщество Gojo
            </a>
          </div>
        </div>
      </div>

      <div className="intercom-bubble">
        <div className={`intercom-menu ${intercomOpen ? "open" : ""}`} id="intercom-menu">
          <a
            href="#"
            className="intercom-menu-item"
            onClick={(e) => {
              e.preventDefault();
              openModal();
              toggleIntercom();
            }}
          >
            <span className="ico">📝</span> Записаться на урок
          </a>
          <a
            href="https://t.me/gojoedu"
            target="_blank"
            rel="noopener noreferrer"
            className="intercom-menu-item"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.24-.02.27z"
                fill="#29B6F6"
              />
            </svg>
            Telegram
          </a>
          <a href="#" className="intercom-menu-item">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                fill="#25D366"
              />
            </svg>
            WhatsApp
          </a>
          <a href="mailto:hello@gojolearn.ru" className="intercom-menu-item">
            <span className="ico">✉️</span> Написать нам
          </a>
        </div>
        <button
          type="button"
          className={`intercom-btn ${intercomOpen ? "open" : ""}`}
          id="intercom-btn"
          onClick={toggleIntercom}
        >
          <span className="ico-open">🗣</span>
          <span className="ico-close">✕</span>
          <div
            className="intercom-tooltip"
            id="intercom-tooltip"
            style={{ display: showTooltip ? "block" : "none" }}
          >
            Есть вопросы?
          </div>
        </button>
      </div>
    </div>
  );
}
