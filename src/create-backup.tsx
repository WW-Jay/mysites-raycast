import { withMySitesAuth } from "./api/auth-context";
import { SiteOperationCommand } from "./site-operation";

function CreateBackupCommand() {
  return <SiteOperationCommand operation="backup" />;
}

export default withMySitesAuth(CreateBackupCommand);
