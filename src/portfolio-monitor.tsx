import {
  Color,
  Icon,
  MenuBarExtra,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { authorize } from "./api/auth";
import { getSitesSummary } from "./api/client";
import {
  concernLabel,
  enabledConcerns,
  needsAttention,
  siteConcerns,
  sortSites,
} from "./site-health";
import {
  acknowledge,
  buildProblemMap,
  diffNewIssues,
  ensureBaseline,
  NewIssue,
  notifyNewIssues,
  ProblemMap,
} from "./monitor-state";
import { siteManagementUrl } from "./site-urls";

const DASHBOARD_URL = "https://manage.mysites.guru";

interface MonitorPreferences {
  notifyNewIssues?: boolean;
}

export default function PortfolioMonitorCommand() {
  const { notifyNewIssues: notifyEnabled = false } =
    getPreferenceValues<MonitorPreferences>();

  const { data, isLoading, error } = useCachedPromise(async () => {
    const token = await authorize();
    return getSitesSummary(token);
  });

  const concerns = useMemo(() => enabledConcerns(), []);
  const current = useMemo<ProblemMap | undefined>(
    () => (data ? buildProblemMap(data.sites, concerns) : undefined),
    [data, concerns],
  );

  const [newIssues, setNewIssues] = useState<NewIssue[]>([]);
  const processedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!current) return;

    // Only process a given state once, since the cached-then-revalidated data
    // flow re-renders with an equal value.
    const signature = JSON.stringify(current);
    if (processedRef.current === signature) return;
    processedRef.current = signature;

    (async () => {
      const baseline = await ensureBaseline(current);
      setNewIssues(diffNewIssues(current, baseline));
      await notifyNewIssues(current, notifyEnabled);
    })();
  }, [current, notifyEnabled]);

  const attentionSites = data
    ? sortSites(
        data.sites.filter((site) => needsAttention(site, concerns)),
        "name",
      )
    : [];
  const total = data?.sites.length ?? 0;
  const count = attentionSites.length;
  const hasNew = newIssues.length > 0;
  const headline =
    count > 0 ? `${count} of ${total} sites need attention` : "All sites healthy";

  async function handleAcknowledge() {
    if (!current) return;
    await acknowledge(current);
    processedRef.current = JSON.stringify(current);
    setNewIssues([]);
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={
        count > 0
          ? {
              source: Icon.Warning,
              tintColor: hasNew ? Color.Red : Color.Orange,
            }
          : { source: Icon.CheckCircle, tintColor: Color.Green }
      }
      title={count > 0 ? String(count) : undefined}
      tooltip={data ? headline : "mySites.guru"}
    >
      {error ? (
        <MenuBarExtra.Item
          title="Sign in required"
          icon={Icon.ExclamationMark}
          onAction={openExtensionPreferences}
        />
      ) : null}

      {data ? <MenuBarExtra.Item title={headline} /> : null}

      {newIssues.length > 0 ? (
        <MenuBarExtra.Section title="New Since Last Check">
          {newIssues.map((issue) => (
            <MenuBarExtra.Item
              key={issue.hashId}
              title={issue.name}
              subtitle={issue.concerns.map(concernLabel).join(", ")}
              icon={{ source: Icon.Dot, tintColor: Color.Red }}
              onAction={() => {
                const site = data?.sites.find(
                  (candidate) => candidate.hashId === issue.hashId,
                );
                if (site) open(siteManagementUrl(site));
              }}
            />
          ))}
          <MenuBarExtra.Item
            title="Mark All as Seen"
            icon={Icon.Check}
            onAction={handleAcknowledge}
          />
        </MenuBarExtra.Section>
      ) : null}

      {attentionSites.length > 0 ? (
        <MenuBarExtra.Section title="Needs Attention">
          {attentionSites.map((site) => (
            <MenuBarExtra.Item
              key={site.hashId}
              title={site.name}
              subtitle={siteConcerns(site, concerns).join(", ") || undefined}
              onAction={() => open(siteManagementUrl(site))}
            />
          ))}
        </MenuBarExtra.Section>
      ) : data ? (
        <MenuBarExtra.Item title="All sites healthy" icon={Icon.CheckCircle} />
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open mySites.guru"
          icon={Icon.Globe}
          onAction={() => open(DASHBOARD_URL)}
        />
        <MenuBarExtra.Item
          title="Configure Signals…"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
