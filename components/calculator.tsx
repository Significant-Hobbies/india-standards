"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  DEFAULT_FILTERS,
  PLFS_STATES,
  INCOME_THRESHOLDS,
  type EstimateFilters,
  type EstimateResponse,
} from "@/lib/types";
import { parseEstimateFilters } from "@/lib/validation";

const incomeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const countFormatter = new Intl.NumberFormat("en-IN", {
  maximumSignificantDigits: 3,
});
const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumSignificantDigits: 3,
});

const MARITAL_OPTIONS = [
  ["any", "Any marital status"],
  ["never_married", "Never married"],
  ["married", "Married"],
  ["widowed_divorced", "Widowed, divorced or separated"],
] as const;

const EDUCATION_OPTIONS = [
  ["any", "Any education"],
  ["below_secondary", "Below secondary"],
  ["secondary", "Secondary or diploma"],
  ["graduate", "Graduate"],
  ["postgraduate", "Postgraduate"],
] as const;

function peopleLabel(gender: EstimateFilters["gender"]) {
  return gender === "men" ? "Indian men" : "Indian women";
}

function formatCount(value: number) {
  if (value > 0 && value < 1) return "<1";
  return countFormatter.format(value);
}

function formatRange(low: number, high: number) {
  if (high > 0 && high < 1) return "<1";
  return `${formatCount(low)}–${formatCount(high)}`;
}

function formatPercent(value: number) {
  if (value > 0 && value < 0.001) return "<0.001%";
  return `${percentFormatter.format(value)}%`;
}

function formatIncomeThreshold(value: number) {
  if (value === 0) return "No minimum";
  const lakhs = value / 100_000;
  return lakhs % 1 === 0
    ? `₹${lakhs} lakh+`
    : `₹${lakhs.toLocaleString("en-IN", { maximumFractionDigits: 1 })} lakh+`;
}

function uncertaintyLabel(score: number) {
  if (score < 45) return "Very wide uncertainty";
  if (score < 65) return "Wide uncertainty";
  if (score < 80) return "Moderate uncertainty";
  return "Narrower uncertainty";
}

function filtersToSearch(filters: EstimateFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === "heightMin" || key === "heightMax") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

function filtersFromSearch(search: string) {
  const params = new URLSearchParams(search);
  if (!params.size) return DEFAULT_FILTERS;

  try {
    return parseEstimateFilters({
      gender: params.get("gender"),
      ageMin: Number(params.get("ageMin")),
      ageMax: Number(params.get("ageMax")),
      minIncome: Number(params.get("minIncome")),
      maritalStatus: params.get("maritalStatus"),
      education: params.get("education"),
      state: params.get("state"),
      area: params.get("area"),
      heightMin: Number(params.get("heightMin") ?? DEFAULT_FILTERS.heightMin),
      heightMax: Number(params.get("heightMax") ?? DEFAULT_FILTERS.heightMax),
    });
  } catch {
    return DEFAULT_FILTERS;
  }
}

function Icon({
  name,
}: {
  name:
    | "people"
    | "calendar"
    | "rupee"
    | "status"
    | "education"
    | "place"
    | "height"
    | "share"
    | "info"
    | "database";
}) {
  const paths = {
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 20c.4-4 2.5-6 5.5-6s5.1 2 5.5 6M14 15c3.8-.6 6.1 1.1 6.5 5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 18h3" />
      </>
    ),
    rupee: <path d="M6 5h12M6 9h12M8 5c5 0 7 1.2 7 4s-2 4-7 4h-1l9 7" />,
    status: (
      <>
        <circle cx="8" cy="8" r="4" />
        <circle cx="17" cy="8" r="3" />
        <path d="M2 21c.4-5 2.4-7 6-7s5.6 2 6 7M14 15c4-.8 6.5 1 7 5" />
      </>
    ),
    education: (
      <>
        <path d="m2 9 10-5 10 5-10 5L2 9Z" />
        <path d="M6 11v5c3 3 9 3 12 0v-5M21 10v7" />
      </>
    ),
    place: (
      <>
        <path d="M12 22s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13Z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
    height: (
      <>
        <path d="m7 20 13-13-3-3L4 17l3 3Z" />
        <path d="m13 8 3 3M10 11l2 2M7 14l3 3" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function DotMark() {
  return (
    <span className="dot-mark" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function RangeBand({
  low,
  high,
  central,
}: {
  low: number;
  high: number;
  central: number;
}) {
  const centralPosition =
    high > low
      ? Math.max(4, Math.min(96, ((central - low) / (high - low)) * 100))
      : 50;
  const style = {
    "--central-position": `${centralPosition}%`,
  } as CSSProperties;

  return (
    <div className="range-band" style={style}>
      <div className="range-band__track" aria-hidden="true">
        <span className="range-band__endpoint range-band__endpoint--low" />
        <span className="range-band__central">
          <span>Best estimate {formatCount(central)}</span>
        </span>
        <span className="range-band__endpoint range-band__endpoint--high" />
      </div>
      <div className="range-band__labels">
        <span>
          <small>Lower 95% bound</small>
          <strong>{formatCount(low)}</strong>
        </span>
        <span>
          <small>Upper 95% bound</small>
          <strong>{formatCount(high)}</strong>
        </span>
      </div>
    </div>
  );
}

function SourceBadge() {
  return (
    <span className="source-badge">
      <Icon name="database" />
      PLFS-backed preview · 2025 · height unavailable
    </span>
  );
}

function RangeControl({
  label,
  icon,
  minimum,
  maximum,
  minValue,
  maxValue,
  unit,
  onMinimum,
  onMaximum,
}: {
  label: string;
  icon: "calendar" | "height";
  minimum: number;
  maximum: number;
  minValue: number;
  maxValue: number;
  unit: string;
  onMinimum: (value: number) => void;
  onMaximum: (value: number) => void;
}) {
  return (
    <div className="filter-control filter-control--range">
      <div className="filter-label">
        <span className="filter-icon">
          <Icon name={icon} />
        </span>
        <span>{label}</span>
        {icon === "height" ? (
          <span className="modelled-label">Modelled across datasets</span>
        ) : null}
      </div>
      <div className="range-values">
        <output>{minValue}</output>
        <span aria-hidden="true">—</span>
        <output>
          {maxValue} {unit}
        </output>
      </div>
      <div className="paired-ranges">
        <label>
          <span className="sr-only">Minimum {label.toLowerCase()}</span>
          <input
            type="range"
            min={minimum}
            max={maximum}
            value={minValue}
            onChange={(event) =>
              onMinimum(Math.min(Number(event.target.value), maxValue))
            }
          />
        </label>
        <label>
          <span className="sr-only">Maximum {label.toLowerCase()}</span>
          <input
            type="range"
            min={minimum}
            max={maximum}
            value={maxValue}
            onChange={(event) =>
              onMaximum(Math.max(Number(event.target.value), minValue))
            }
          />
        </label>
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  setFilters,
  loading,
}: {
  filters: EstimateFilters;
  setFilters: (next: EstimateFilters) => void;
  loading: boolean;
}) {
  const update = <K extends keyof EstimateFilters>(
    key: K,
    value: EstimateFilters[K],
  ) => setFilters({ ...filters, [key]: value });

  return (
    <section className="filters-panel" aria-labelledby="filters-title">
      <div className="section-heading">
        <div>
          <h2 id="filters-title">Shape the estimate</h2>
          <p role="status" aria-live="polite">
            {loading ? "Querying PLFS aggregates…" : "Updated from hosted aggregates."}
          </p>
        </div>
        <button
          className="text-button"
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
        >
          Reset
        </button>
      </div>

      <div className="filter-grid">
        <fieldset className="filter-control">
          <legend className="filter-label">
            <span className="filter-icon">
              <Icon name="people" />
            </span>
            Gender
          </legend>
          <div className="segment">
            {(["men", "women"] as const).map((gender) => (
              <button
                aria-pressed={filters.gender === gender}
                className={filters.gender === gender ? "is-selected" : ""}
                key={gender}
                type="button"
                onClick={() => update("gender", gender)}
              >
                {gender === "men" ? "Men" : "Women"}
              </button>
            ))}
          </div>
        </fieldset>

        <RangeControl
          label="Age"
          icon="calendar"
          minimum={18}
          maximum={60}
          minValue={filters.ageMin}
          maxValue={filters.ageMax}
          unit="years"
          onMinimum={(value) => update("ageMin", value)}
          onMaximum={(value) => update("ageMax", value)}
        />

        <label className="filter-control">
          <span className="filter-label">
            <span className="filter-icon">
              <Icon name="rupee" />
            </span>
            Minimum annualized earned income
          </span>
          <strong className="control-value">
            {formatIncomeThreshold(filters.minIncome)}
          </strong>
          <input
            aria-label="Minimum annual earned income"
            type="range"
            min={0}
            max={INCOME_THRESHOLDS.length - 1}
            value={INCOME_THRESHOLDS.indexOf(filters.minIncome)}
            onChange={(event) =>
              update(
                "minIncome",
                INCOME_THRESHOLDS[Number(event.target.value)],
              )
            }
          />
          <span className="income-scale" aria-hidden="true">
            <span>₹0</span>
            <span>₹25L</span>
            <span>₹50L</span>
            <span>₹85L</span>
          </span>
          <span className="control-hint">
            ₹1 lakh steps · unchanged results mean no sampled earnings fall
            between those cutoffs.
          </span>
        </label>

        <label className="filter-control">
          <span className="filter-label">
            <span className="filter-icon">
              <Icon name="status" />
            </span>
            Marital status
          </span>
          <select
            value={filters.maritalStatus}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              update(
                "maritalStatus",
                event.target.value as EstimateFilters["maritalStatus"],
              )
            }
          >
            {MARITAL_OPTIONS.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-control">
          <span className="filter-label">
            <span className="filter-icon">
              <Icon name="education" />
            </span>
            Education
          </span>
          <select
            value={filters.education}
            onChange={(event) =>
              update(
                "education",
                event.target.value as EstimateFilters["education"],
              )
            }
          >
            {EDUCATION_OPTIONS.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-control">
          <span className="filter-label">
            <span className="filter-icon">
              <Icon name="place" />
            </span>
            State / UT
          </span>
          <select
            value={filters.state}
            onChange={(event) =>
              update("state", event.target.value as EstimateFilters["state"])
            }
          >
            {PLFS_STATES.map((state) => (
              <option value={state} key={state}>
                {state === "all" ? "All India" : state}
              </option>
            ))}
          </select>
          <span className="control-hint">PLFS State/UT groups · no city claims</span>
        </label>

        <fieldset className="filter-control">
          <legend className="filter-label">
            <span className="filter-icon">
              <Icon name="place" />
            </span>
            Area
          </legend>
          <div className="segment segment--three">
            {(
              [
                ["all", "Both"],
                ["urban", "Urban"],
                ["rural", "Rural"],
              ] as const
            ).map(([area, label]) => (
              <button
                aria-pressed={filters.area === area}
                className={filters.area === area ? "is-selected" : ""}
                key={area}
                type="button"
                onClick={() => update("area", area)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="filter-control filter-control--unavailable" aria-disabled="true">
          <div className="filter-label">
            <span className="filter-icon">
              <Icon name="height" />
            </span>
            <span>Height</span>
            <span className="modelled-label">Not applied</span>
          </div>
          <strong className="unavailable-title">Waiting for NFHS approval</strong>
          <span className="control-hint">
            Height is excluded from this PLFS-only estimate.
          </span>
        </div>
      </div>
    </section>
  );
}

function LoadingResult() {
  return (
    <section className="result-canvas" aria-busy="true" aria-label="Calculating estimate">
      <div className="skeleton skeleton--label" />
      <div className="skeleton skeleton--result" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton--block" />
        <div className="skeleton skeleton--block" />
        <div className="skeleton skeleton--block" />
      </div>
    </section>
  );
}

function ErrorResult({ message, retry }: { message: string; retry: () => void }) {
  return (
    <section className="result-canvas result-message" role="alert">
      <span className="confidence-badge confidence-badge--low">Couldn’t calculate</span>
      <h2>The hosted model didn’t respond.</h2>
      <p>{message}</p>
      <button className="primary-button" type="button" onClick={retry}>
        Retry estimate
      </button>
    </section>
  );
}

function ResultCanvas({
  filters,
  result,
  share,
  shareStatus,
}: {
  filters: EstimateFilters;
  result: Extract<EstimateResponse, { status: "ok" }>;
  share: () => void;
  shareStatus: string;
}) {
  const cohort = `${filters.ageMin}–${filters.ageMax}`;
  const label = peopleLabel(filters.gender);
  const activeFilters = [
    filters.gender === "men" ? "Men" : "Women",
    `Age ${filters.ageMin}–${filters.ageMax}`,
    filters.minIncome === 0
      ? "No income minimum"
      : `${incomeFormatter.format(filters.minIncome)}+`,
    MARITAL_OPTIONS.find(([value]) => value === filters.maritalStatus)?.[1],
    EDUCATION_OPTIONS.find(([value]) => value === filters.education)?.[1],
    filters.state === "all" ? "All India" : filters.state,
    filters.area === "all"
      ? "Urban + rural"
      : filters.area === "urban"
        ? "Urban"
        : "Rural",
  ].filter(Boolean);

  return (
    <section className="result-canvas">
      <div className="result-topline">
        <SourceBadge />
        <span className="uncertainty-badge">
          {uncertaintyLabel(result.rangePrecision.score)}
        </span>
      </div>

      <div className="result-lead">
        <div>
          <p className="result-prefix">Best estimate</p>
          <h2>
            About {formatCount(result.estimate.central)}
            <span>
              {" "}
              {label}
            </span>
          </h2>
          <p className="result-subtitle">
            <strong>95% uncertainty range:</strong>{" "}
            {formatRange(result.estimate.low, result.estimate.high)}
          </p>
          <p className="observation-count">
            {formatCount(result.observations)} direct PLFS{" "}
            {result.observations === 1 ? "record" : "records"}
          </p>
          {result.incomeSupport &&
          result.incomeSupport.lowestMatchedIncome > filters.minIncome ? (
            <p className="income-support">
              {result.incomeSupport.basis === "direct"
                ? "The direct sample first matches at "
                : "The broader supporting groups first match at "}
              <strong>
                {formatIncomeThreshold(
                  result.incomeSupport.lowestMatchedIncome,
                ).replace("+", "")}
              </strong>
              . Nearby cutoffs below that can share the same estimate.
            </p>
          ) : null}
          {result.estimateBasis.mode === "best_effort" ? (
            <p className="estimate-basis">
              <strong>{result.estimateBasis.label}.</strong>{" "}
              {result.estimateBasis.reason}
            </p>
          ) : null}
          <p className="accuracy-notice">{result.source.notice}</p>
          <p className="sr-only" role="status">
            PLFS-backed preview best estimate: about{" "}
            {formatCount(result.estimate.central)} {label}. The 95% uncertainty
            range is {formatRange(result.estimate.low, result.estimate.high)}.
            Height is unavailable and not applied.
          </p>
        </div>
        <button className="share-button" type="button" onClick={share}>
          <Icon name="share" />
          Share result
        </button>
      </div>
      {shareStatus ? (
        <p className="share-status" role="status">
          {shareStatus}
        </p>
      ) : null}

      <div className="filter-summary" aria-label="Active filters">
        <strong>Active filters</strong>
        <ul>
          {activeFilters.map((filter) => (
            <li key={filter}>{filter}</li>
          ))}
        </ul>
        <a href="#filters-title">Edit filters</a>
      </div>

      <div className="result-body">
        <div className="comparisons">
          <h3>How this compares</h3>
          <div className="comparison-row">
            <span className="comparison-icon">
              <Icon name="people" />
            </span>
            <div>
              <span>Of supported {label} aged 18–60</span>
              <strong>
                {formatPercent(result.denominators.percentOfGender.low)}–
                {formatPercent(result.denominators.percentOfGender.high)}
              </strong>
            </div>
          </div>
          <div className="comparison-row">
            <span className="comparison-icon comparison-icon--mango">
              <Icon name="calendar" />
            </span>
            <div>
              <span>Within {label} aged {cohort}</span>
              <strong>
                {formatPercent(result.denominators.percentOfAgeCohort.low)}–
                {formatPercent(result.denominators.percentOfAgeCohort.high)}
              </strong>
            </div>
          </div>
          {result.estimate.high < 1 ? (
            <p className="one-in">
              <strong>Fewer than one estimated person</strong> in this age
              cohort.
            </p>
          ) : result.estimate.low <= 0 ? (
            <p className="one-in">
              The lower bound includes zero; the upper bound is roughly{" "}
              <strong>
                1 in {formatCount(result.denominators.oneInAgeCohort.low)}
              </strong>{" "}
              in this age cohort.
            </p>
          ) : (
            <p className="one-in">
              Roughly{" "}
              <strong>
                1 in {formatCount(result.denominators.oneInAgeCohort.low)}
              </strong>{" "}
              to{" "}
              <strong>
                1 in {formatCount(result.denominators.oneInAgeCohort.high)}
              </strong>{" "}
              in this age cohort.
            </p>
          )}
        </div>

        <figure className="distribution-wrap">
          <figcaption>
            <h3>95% uncertainty range</h3>
            <p>
              The best estimate sits inside this interval. A zero lower bound
              does not mean the estimated population is zero.
            </p>
          </figcaption>
          <RangeBand
            low={result.estimate.low}
            high={result.estimate.high}
            central={result.estimate.central}
          />
        </figure>
      </div>

      <div className="precision-note">
        <div>
          <strong>Range tightness {result.rangePrecision.score}/100</strong>
          <span>Higher means narrower—not more correct.</span>
        </div>
        <p>{result.rangePrecision.reason}</p>
      </div>

      <details className="methodology" id="methodology">
        <summary>
          <span>
            <Icon name="info" />
            How this was calculated
          </span>
          <span aria-hidden="true">+</span>
        </summary>
        <div className="methodology-content">
          <div>
            <h3>Joined demographic filters</h3>
            <p>
              Gender, age, annual earned income, marital status, education,
              State/UT and area are filtered together in aggregate-only PLFS
              2025 cells. The count is weighted using the published multiplier.
            </p>
          </div>
          <div>
            <h3>Annualized earnings proxy</h3>
            <p>
              Income is 12 times the reported monthly regular salary or
              self-employment earnings. It is not observed twelve-month income
              or tax-return income.
            </p>
          </div>
          <div>
            <h3>Range, not an exact answer</h3>
            <p>
              The range uses the published PLFS 2025 analytic survey-variance
              method. Empty exact cells use a disclosed hierarchical back-off,
              and outputs are rounded to three significant digits.
            </p>
          </div>
          <div>
            <h3>Range tightness score</h3>
            <p>
              The 0–100 score is derived from the final range’s relative
              half-width: 100 ÷ (1 + relative half-width). Survey variance,
              direct support, and any back-off widening affect that range. It
              describes how narrow the range is, not the probability that the
              estimate is correct.
            </p>
          </div>
          <div className="demo-warning">
            <h3>Preview limitation</h3>
            <p>
              These are real PLFS-derived estimates in a non-commercial
              research preview. The PLFS usage scope is still under review, and
              NFHS height access is pending, so height is not available. This
              does not predict dating success, compatibility, or whether anyone
              will date you.
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}

export function Calculator() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState("");
  const [resultInView, setResultInView] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    setFilters(filtersFromSearch(window.location.search));
  }, []);

  useEffect(() => {
    const resultRegion = document.querySelector("#result");
    if (!resultRegion) return;

    const observer = new IntersectionObserver(
      ([entry]) => setResultInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(resultRegion);
    return () => observer.disconnect();
  }, []);

  const calculate = useCallback(async (nextFilters: EstimateFilters) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextFilters),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "The hosted estimate request failed.";
        throw new Error(
          errorMessage,
        );
      }
      if (currentRequest === requestId.current) {
        setResult(payload as EstimateResponse);
      }
    } catch (requestError) {
      if (currentRequest === requestId.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "The hosted estimate request failed.",
        );
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = filtersToSearch(filters);
      window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
      void calculate(filters);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [calculate, filters]);

  const share = useCallback(async () => {
    if (!result) return;
    const label = peopleLabel(filters.gender);
    const text = `PLFS-backed 2025 preview: best estimate about ${formatCount(result.estimate.central)} ${label}; 95% uncertainty range ${formatRange(result.estimate.low, result.estimate.high)}. Filters: age ${filters.ageMin}–${filters.ageMax}, ${filters.minIncome === 0 ? "no annualized earnings minimum" : `${incomeFormatter.format(filters.minIncome)}+ annualized earnings proxy`}, ${filters.state === "all" ? "All India" : filters.state}, ${filters.area}. Range tightness ${result.rangePrecision.score}/100; higher means narrower, not more correct. Height is unavailable and not applied. PLFS usage scope is under review.`;
    const shareData = {
      title: "India Standards PLFS-backed preview",
      text,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(`${text} ${shareData.url}`);
        setShareStatus("Result link copied.");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }
      setShareStatus("Could not share automatically. Copy the page URL instead.");
    }
  }, [filters, result]);

  const resultSurface = useMemo(() => {
    if (loading && !result) return <LoadingResult />;
    if (error) {
      return <ErrorResult message={error} retry={() => void calculate(filters)} />;
    }
    if (!result) return <LoadingResult />;
    return (
      <ResultCanvas
        filters={filters}
        result={result}
        share={share}
        shareStatus={shareStatus}
      />
    );
  }, [calculate, error, filters, loading, result, share, shareStatus]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="India Standards home">
          <DotMark />
          <span>India Standards</span>
        </a>
        <div className="topbar-actions">
          <SourceBadge />
          <a href="#methodology">How it works</a>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="intro-line">Playful by tone. Honest by method.</p>
          <h1>How rare are your standards?</h1>
          <p>
            Explore a demographic estimate for India—without pretending it is a
            dating prediction.
          </p>
        </div>
        <div className="demo-callout">
          <strong>Real PLFS 2025 aggregates</strong>
          <span>
            Research preview. Usage scope is under review; height remains
            unavailable until NFHS access is approved.
          </span>
        </div>
      </section>

      <div className={`workbench ${loading ? "is-updating" : ""}`}>
        <div className="result-region" id="result" aria-busy={loading}>
          {loading && result ? (
            <span className="updating-badge" role="status">
              Updating PLFS estimate…
            </span>
          ) : null}
          {resultSurface}
        </div>
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          loading={loading}
        />
      </div>

      {!resultInView ? (
        <nav className="mobile-jumpbar" aria-label="Calculator shortcut">
          <a href="#result">{loading ? "Updating…" : "View updated result"}</a>
        </nav>
      ) : null}

      <footer>
        <span>PLFS Calendar Year 2025 · weighted aggregate preview</span>
        <span>Height excluded · NFHS approval pending</span>
        <span>No raw microdata leaves the server</span>
      </footer>
    </div>
  );
}
