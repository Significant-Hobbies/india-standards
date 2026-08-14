export function comparableEstimate(result) {
  return {
    observationCount: Number(result.observationCount),
    backoffObservationCount:
      result.backoffObservationCount === undefined
        ? undefined
        : Number(result.backoffObservationCount),
    estimate: Number(result.estimate),
    variance: Number(result.variance),
    low95: Number(result.low95),
    high95: Number(result.high95),
    lowestMatchedIncome:
      result.lowestMatchedIncome === null
        ? null
        : Number(result.lowestMatchedIncome),
    highestMatchedIncome:
      result.highestMatchedIncome === null
        ? null
        : Number(result.highestMatchedIncome),
    mode: result.mode,
    modelVersion: result.modelVersion,
  };
}
