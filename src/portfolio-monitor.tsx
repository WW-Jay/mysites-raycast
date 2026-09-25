import {
  Color,
  Icon,
  MenuBarExtra,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { authorize } from "./api/auth";
import { getSitesSummary } from "./api/client";
import {
  enabledConcerns,
  needsAttention,
  siteConcerns,
  sortSites,
} from "./site-health";
import { siteManagementUrl } from "./site-urls";

const DASHBOARD_URL = "https://manage.mysites.guru";

export default function PortfolioMonitorCommand() {
  const { data, isLoading, error } = useCachedPromise(async () => {
    const token = await authorize();
    return getSitesSummary(token);
  });

  const concerns = enabledConcerns();
  const attentionSites = data
    ? sortSites(
        data.sites.filter((site) => needsAttention(site, concerns)),
        "name",
      )
    : [];
  const total = data?.sites.length ?? 0;
  const count = attentionSites.length;
  const headline =
    count > 0 ? `${count} of ${total} sites need attention` : "All sites healthy";

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={
        count > 0
          ? { source: Icon.Warning, tintColor: Color.Orange }
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
