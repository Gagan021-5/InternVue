const blockedPatterns = [
  /\bsenior\b/i,
  /\blead\b/i,
  /\bmanager\b/i,
  /\bdirector\b/i,
  /\bhead\s+of\b/i,
  /\bvp\b/i,
  /\bprincipal\b/i,
  /\bstaff\s/i,
];

export const applyAuthenticityFilter = (jobs = []) =>
  jobs.filter((job) => {
    const title = String(job?.title || "");
    return !blockedPatterns.some((pattern) => pattern.test(title));
  });
