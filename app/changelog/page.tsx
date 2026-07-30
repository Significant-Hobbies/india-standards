import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

const repository =
  "https://github.com/Significant-Hobbies/india-standards";

const release = {
  date: "2026-07-27",
  title: "The PLFS-backed preview went live",
  outcomes: [
    "The calculator launched with eight jointly applied demographic and earned-income filters backed by aggregate PLFS 2025 data.",
    "Results show a rounded central estimate, an explicitly labelled 95% uncertainty range, and two denominators instead of a false-precision match score.",
    "Height remains unavailable until the separate NFHS data and usage gates are approved; unsupported source states fail closed.",
  ],
} as const;

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Meaningful, deliberately published improvements to the India Standards demographic calculator.",
  alternates: {
    canonical: "/changelog",
  },
};

function DotMark() {
  return (
    <span className="dot-mark" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <div className={styles.page}>
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="India Standards home">
          <DotMark />
          <span>India Standards</span>
        </Link>
        <Link className={styles.homeLink} href="/">
          Open calculator
        </Link>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="changelog-title">
          <p className={styles.eyebrow}>Product history</p>
          <h1 id="changelog-title">Changelog</h1>
          <p className={styles.lede}>
            Meaningful improvements to the calculator, published only after
            they are part of the public product.
          </p>
          <nav className={styles.projectLinks} aria-label="Project links">
            <a href={`${repository}/issues`}>Roadmap</a>
            <a href={repository}>Source</a>
          </nav>
        </section>

        <ol className={styles.history}>
          <li>
            <article className={styles.release}>
              <time dateTime={release.date}>27 July 2026</time>
              <div>
                <h2>{release.title}</h2>
                <ul>
                  {release.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </div>
            </article>
          </li>
          <li className={styles.note}>
            New entries will appear here when meaningful product changes ship.
          </li>
        </ol>
      </main>

      <footer>
        <span>PLFS Calendar Year 2025 · weighted aggregate preview</span>
        <span>Height excluded · NFHS approval pending</span>
      </footer>
    </div>
  );
}
