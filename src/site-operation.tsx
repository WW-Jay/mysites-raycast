import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Image,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useAccessToken } from "./api/auth-context";
import {
  invalidateCache,
  listSites,
  triggerAudit,
  triggerBackup,
  triggerSnapshot,
} from "./api/client";
import { errorMessage } from "./api/errors";
import { Site } from "./api/types";
import { SiteActionPreferences } from "./site-urls";

export type SiteOperation = "audit" | "backup" | "snapshot";

const operationDetails = {
  audit: {
    title: "Queue Audit",
    gerund: "Queuing audit",
    queuedTitle: "Audit Queued",
    description: "mySites.guru will run the security audit in the background.",
    icon: Icon.Shield,
  },
  backup: {
    title: "Queue Backup",
    gerund: "Queuing backup",
    queuedTitle: "Backup Queued",
    description: "mySites.guru will create the backup in the background.",
    icon: Icon.HardDrive,
  },
  snapshot: {
    title: "Queue Snapshot",
    gerund: "Queuing snapshot",
    queuedTitle: "Snapshot Queued",
    description: "mySites.guru will check the file snapshot in the background.",
    icon: Icon.Camera,
  },
} satisfies Record<
  SiteOperation,
  {
    title: string;
    gerund: string;
    queuedTitle: string;
    description: string;
    icon: Image.ImageLike;
  }
>;

function faviconUrl(siteUrl: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(siteUrl).hostname}&sz=64`;
  } catch {
    return "";
  }
}

async function runOperation(
  operation: SiteOperation,
  token: string,
  site: Site,
) {
  const details = operationDetails[operation];
  const { confirmSiteActions } = getPreferenceValues<SiteActionPreferences>();

  if (confirmSiteActions) {
    const confirmed = await confirmAlert({
      title: `${details.title} for ${site.name}?`,
      message: details.description,
      icon: details.icon,
      primaryAction: {
        title: details.title,
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: details.gerund,
    message: site.name,
  });

  try {
    const trigger = {
      audit: triggerAudit,
      backup: triggerBackup,
      snapshot: triggerSnapshot,
    }[operation];
    await trigger(token, site.hashId);
    toast.style = Toast.Style.Success;
    toast.title = details.queuedTitle;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to ${details.title.toLowerCase()}`;
    toast.message = errorMessage(error);
  }
}

export function SiteOperationCommand({
  operation,
}: {
  operation: SiteOperation;
}) {
  const token = useAccessToken();
  const details = operationDetails[operation];
  const { data, isLoading, error, revalidate } = useCachedPromise(
    listSites,
    [token],
    { failureToastOptions: { title: "Failed to Fetch Sites" } },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`${details.title} for a site...`}
    >
      <List.EmptyView
        title={error ? "Failed to Load Sites" : "No Sites Found"}
        description={error ? errorMessage(error) : undefined}
      />
      {data?.map((site) => (
        <List.Item
          key={site.hashId}
          icon={{
            source: faviconUrl(site.url),
            fallback: Icon.Globe,
            mask: Image.Mask.RoundedRectangle,
          }}
          title={site.name}
          subtitle={site.url}
          accessories={[
            site.platform ? { text: site.platform } : {},
            {
              icon: {
                source: site.isConnected
                  ? Icon.CheckCircle
                  : Icon.ExclamationMark,
                tintColor: site.isConnected ? Color.Green : Color.Red,
              },
              tooltip: site.isConnected ? "Connected" : "Disconnected",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={details.title}
                icon={details.icon}
                onAction={() => runOperation(operation, token, site)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => { invalidateCache(); revalidate(); }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
