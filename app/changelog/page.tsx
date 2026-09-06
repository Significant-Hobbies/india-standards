import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

const repository = "https://github.com/Significant-Hobbies/india-standards";

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
            Meaningful improvements to the calculator, published only after they
            are part of the public product.
          </p>
          <nav className={styles.projectLinks} aria-label="Project links">
            <a href={`${repository}/issues`}>Roadmap</a>
            <a
              href={repository}
              aria-label="GitHub repository"
              title="GitHub repository"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                viewBox="0 0 16 16"
                width="20"
                height="20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span className="sr-only">GitHub repository</span>
            </a>
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
