import { LocalStorage } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { SiteSummary } from "./api/types";
import { ConcernKey, concernLabel, siteConcernKeys } from "./site-health";

const execFileAsync = promisify(execFile);

// Baseline = the state the user has acknowledged (drives the menu "new" list).
// Notified = the state we have already sent an OS notification for (fires once).
const BASELINE_KEY = "portfolio-monitor:baseline";
const NOTIFIED_KEY = "portfolio-monitor:notified";

export interface ProblemSite {
  name: string;
  concerns: ConcernKey[];
}

export type ProblemMap = Record<string, ProblemSite>;

export interface NewIssue {
  hashId: string;
  name: string;
  concerns: ConcernKey[];
}

export function buildProblemMap(
  sites: SiteSummary[],
  enabled: Set<ConcernKey>,
): ProblemMap {
  const map: ProblemMap = {};
  for (const site of sites) {
    const concerns = siteConcernKeys(site, enabled);
    if (concerns.length > 0) {
      map[site.hashId] = { name: site.name, concerns };
    }
  }
  return map;
}

// Sites that gained a concern they did not have in the previous state.
export function diffNewIssues(
  current: ProblemMap,
  previous: ProblemMap,
): NewIssue[] {
  const issues: NewIssue[] = [];
  for (const [hashId, site] of Object.entries(current)) {
    const before = new Set(previous[hashId]?.concerns ?? []);
    const added = site.concerns.filter((concern) => !before.has(concern));
    if (added.length > 0) {
      issues.push({ hashId, name: site.name, concerns: added });
    }
  }
  return issues;
}

async function loadMap(key: string): Promise<ProblemMap | undefined> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as ProblemMap)
      : undefined;
  } catch {
    return undefined;
  }
}

async function saveMap(key: string, map: ProblemMap): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(map));
}

// Return the acknowledged baseline, initialising it to the current state on the
// first run so the whole portfolio isn't reported as "new".
export async function ensureBaseline(current: ProblemMap): Promise<ProblemMap> {
  const existing = await loadMap(BASELINE_KEY);
  if (existing) return existing;
  await saveMap(BASELINE_KEY, current);
  return current;
}

export async function acknowledge(current: ProblemMap): Promise<void> {
  await Promise.all([
    saveMap(BASELINE_KEY, current),
    saveMap(NOTIFIED_KEY, current),
  ]);
}

function summarize(issues: NewIssue[]): { title: string; message: string } {
  if (issues.length === 1) {
    const issue = issues[0];
    return {
      title: "mySites.guru — New Issue",
      message: `${issue.name}: ${issue.concerns.map(concernLabel).join(", ")}`,
    };
  }

  const names = issues.map((issue) => issue.name);
  const preview = names.slice(0, 3).join(", ");
  const extra = names.length > 3 ? ` +${names.length - 3} more` : "";
  return {
    title: "mySites.guru — New Issues",
    message: `${issues.length} sites need attention: ${preview}${extra}`,
  };
}

function escapeForAppleScript(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function showSystemNotification(
  title: string,
  message: string,
): Promise<void> {
  const script = `display notification "${escapeForAppleScript(
    message,
  )}" with title "${escapeForAppleScript(title)}"`;
  await execFileAsync("osascript", ["-e", script]);
}

// Fire a macOS notification for concerns that appeared since the last one, then
// advance the notified marker so the same issue doesn't alert again. Best-effort
// and never throws (e.g. on non-macOS or if osascript is unavailable).
export async function notifyNewIssues(
  current: ProblemMap,
  enabled: boolean,
): Promise<void> {
  const notified = await loadMap(NOTIFIED_KEY);

  // First run: adopt the current state silently instead of alerting on all of it.
  if (!notified) {
    await saveMap(NOTIFIED_KEY, current);
    return;
  }

  const issues = diffNewIssues(current, notified);
  if (issues.length === 0) return;

  await saveMap(NOTIFIED_KEY, current);
  if (!enabled) return;

  try {
    const { title, message } = summarize(issues);
    await showSystemNotification(title, message);
  } catch {
    // Notifications are best-effort; the menu bar still highlights new issues.
  }
}
