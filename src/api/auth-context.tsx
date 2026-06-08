import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import {
  ComponentType,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { authorize } from "./auth";
import { errorMessage } from "./errors";

const AccessTokenContext = createContext<string | undefined>(undefined);

function AuthenticatedCommand({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [token, setToken] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setToken(undefined);
    setError(undefined);

    authorize().then(
      (accessToken) => {
        if (active) setToken(accessToken);
      },
      (authorizationError) => {
        if (active) setError(authorizationError);
      },
    );

    return () => {
      active = false;
    };
  }, [attempt]);

  if (!token) {
    return (
      <Detail
        isLoading={!error}
        markdown={
          error
            ? `# Unable to Sign In\n\n${errorMessage(error)}`
            : "# Connecting to MySites.guru"
        }
        actions={
          error ? (
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => setAttempt((value) => value + 1)}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  return (
    <AccessTokenContext.Provider value={token}>
      {children}
    </AccessTokenContext.Provider>
  );
}

export function useAccessToken(): string {
  const token = useContext(AccessTokenContext);
  if (!token) {
    throw new Error("useAccessToken must be used inside withMySitesAuth");
  }
  return token;
}

export function withMySitesAuth<Props extends object>(
  Component: ComponentType<Props>,
): ComponentType<Props> {
  function WrappedComponent(props: Props) {
    return (
      <AuthenticatedCommand>
        <Component {...props} />
      </AuthenticatedCommand>
    );
  }

  WrappedComponent.displayName = `withMySitesAuth(${Component.displayName ?? Component.name})`;
  return WrappedComponent;
}
