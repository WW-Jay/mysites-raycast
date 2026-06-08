import { Toast, showToast } from "@raycast/api";
import { signOut } from "./api/auth";

export default async function SignOutCommand() {
  await signOut();
  await showToast({
    style: Toast.Style.Success,
    title: "Signed Out of MySites.guru",
  });
}
