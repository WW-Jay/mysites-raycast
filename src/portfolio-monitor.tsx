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
import { describePortfolio, formatAttentionReasons, sortSites } from "./site-health";
import { siteManagementUrl } from "./site-urls";

const DASHBOARD_URL = "https://manage.mysites.guru";

export default function PortfolioMonitorCommand() {
  const { data, isLoading, error } = useCachedPromise(async () => {
    const token = await authorize();
    return getSitesSummary(token);
  });

  const attentionSites = data
    ? sortSites(
        data.sites.filter((site) => site.needsAttention),
        "attention",
      )
    : [];
  const count = data?.meta.counts.needsAttention ?? attentionSites.length;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={
        count > 0
          ? { source: Icon.Warning, tintColor: Color.Orange }
          : { source: Icon.CheckCircle, tintColor: Color.Green }
      }
      title={count > 0 ? String(count) : undefined}
      tooltip={data ? describePortfolio(data.meta) : "mySites.guru"}
    >
      {error ? (
        <MenuBarExtra.Item
          title="Sign in required"
          icon={Icon.ExclamationMark}
          onAction={openExtensionPreferences}
        />
      ) : null}

      {data ? (
        <MenuBarExtra.Item title={describePortfolio(data.meta)} />
      ) : null}

      {attentionSites.length > 0 ? (
        <MenuBarExtra.Section title="Needs Attention">
          {attentionSites.map((site) => (
            <MenuBarExtra.Item
              key={site.hashId}
              title={site.name}
              subtitle={
                site.attentionReasons.length > 0
                  ? formatAttentionReasons(site.attentionReasons)
                  : undefined
              }
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
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
