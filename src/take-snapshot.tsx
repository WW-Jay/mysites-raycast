import { withMySitesAuth } from "./api/auth-context";
import { SiteOperationCommand } from "./site-operation";

function TakeSnapshotCommand() {
  return <SiteOperationCommand operation="snapshot" />;
}

export default withMySitesAuth(TakeSnapshotCommand);
