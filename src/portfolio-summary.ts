import { Clipboard, Toast, showToast } from "@raycast/api";
import { authorize } from "./api/auth";
import { getSitesSummary } from "./api/client";
import { errorMessage } from "./api/errors";
import { describePortfolio } from "./site-health";

export default async function PortfolioSummaryCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching portfolio summary…",
  });

  try {
    const token = await authorize();
    const { meta } = await getSitesSummary(token);
    const text = describePortfolio(meta);

    await Clipboard.copy(text);

    const attention = meta.counts.needsAttention ?? 0;
    toast.style = Toast.Style.Success;
    toast.title = "Portfolio Summary Copied";
    toast.message =
      attention > 0
        ? `${attention} of ${meta.total ?? "?"} sites need attention`
        : "All sites healthy";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to Fetch Summary";
    toast.message = errorMessage(error);
  }
}
