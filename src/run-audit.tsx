import { withMySitesAuth } from "./api/auth-context";
import { SiteOperationCommand } from "./site-operation";

function RunAuditCommand() {
  return <SiteOperationCommand operation="audit" />;
}

export default withMySitesAuth(RunAuditCommand);
