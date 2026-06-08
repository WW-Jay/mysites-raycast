import {
  LocalStorage,
  OAuth,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { AUTHORIZE_URL, OAUTH_SCOPES, TOKEN_URL } from "./constants";
import { MySitesApiError } from "./errors";

interface AuthPreferences {
  clientId?: string;
}

const STORED_CLIENT_ID_KEY = "oauth-client-id";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "mySites.guru",
  providerIcon: "icon.png",
  description: "Connect your mySites.guru account",
});

let refreshPromise: Promise<string> | undefined;

function debugAuth(message: string) {
  if (environment.isDevelopment) {
    console.log(`[auth] ${message}`);
  }
}

async function prepareClient(): Promise<string> {
  const configuredClientId =
    getPreferenceValues<AuthPreferences>().clientId?.trim();
  const storedClientId =
    await LocalStorage.getItem<string>(STORED_CLIENT_ID_KEY);
  const clientId = configuredClientId || storedClientId;

  if (!clientId) {
    await openExtensionPreferences();
    throw new MySitesApiError(
      "Enter your MySites.guru OAuth client ID in the extension preferences.",
    );
  }

  if (
    configuredClientId &&
    storedClientId &&
    storedClientId !== configuredClientId
  ) {
    await oauthClient.removeTokens();
  }
  if (storedClientId !== clientId) {
    await LocalStorage.setItem(STORED_CLIENT_ID_KEY, clientId);
  }

  return clientId;
}

function isTokenResponse(value: unknown): value is OAuth.TokenResponse {
  if (typeof value !== "object" || value === null) return false;

  const response = value as Record<string, unknown>;
  return (
    typeof response.access_token === "string" &&
    (response.refresh_token === undefined ||
      typeof response.refresh_token === "string") &&
    (response.expires_in === undefined ||
      typeof response.expires_in === "number") &&
    (response.scope === undefined || typeof response.scope === "string")
  );
}

async function requestTokens(
  parameters: URLSearchParams,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: parameters,
  });

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok || !isTokenResponse(body)) {
    throw new MySitesApiError(
      response.ok
        ? "mySites.guru returned an invalid OAuth response"
        : "Unable to authenticate with mySites.guru",
      response.status,
    );
  }

  return body;
}

async function exchangeAuthorizationCode(
  authorizationCode: string,
  request: OAuth.AuthorizationRequest,
  clientId: string,
): Promise<string> {
  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: request.redirectURI,
      client_id: clientId,
      code_verifier: request.codeVerifier,
    }),
  );

  await oauthClient.setTokens(tokens);
  return tokens.access_token;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
): Promise<string> {
  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  );

  if (!tokens.refresh_token) {
    tokens.refresh_token = refreshToken;
  }

  await oauthClient.setTokens(tokens);
  return tokens.access_token;
}

async function refreshOnce(
  refreshToken: string,
  clientId: string,
): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refreshToken, clientId).finally(() => {
      refreshPromise = undefined;
    });
  }

  return refreshPromise;
}

function isServerRejection(error: unknown): boolean {
  return error instanceof MySitesApiError && error.status !== undefined;
}

export async function authorize(): Promise<string> {
  debugAuth("checking stored OAuth tokens");
  const clientId = await prepareClient();
  const tokens = await oauthClient.getTokens();

  if (tokens?.accessToken && !tokens.isExpired()) {
    debugAuth("using stored access token");
    return tokens.accessToken;
  }

  if (tokens?.refreshToken) {
    debugAuth("refreshing expired access token");
    try {
      return await refreshOnce(tokens.refreshToken, clientId);
    } catch (error) {
      if (isServerRejection(error)) {
        debugAuth("server rejected refresh; clearing tokens");
        await oauthClient.removeTokens();
      } else {
        debugAuth("refresh failed due to network error");
        throw error;
      }
    }
  }

  debugAuth("starting PKCE authorization");
  const request = await oauthClient.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId,
    scope: OAUTH_SCOPES,
  });
  const { authorizationCode } = await oauthClient.authorize(request);
  debugAuth("authorization completed; exchanging code");
  return exchangeAuthorizationCode(authorizationCode, request, clientId);
}

export async function forceRefresh(): Promise<string | undefined> {
  const clientId = await prepareClient();
  const tokens = await oauthClient.getTokens();
  if (!tokens?.refreshToken) return undefined;

  try {
    return await refreshOnce(tokens.refreshToken, clientId);
  } catch (error) {
    if (isServerRejection(error)) {
      await oauthClient.removeTokens();
    }
    return undefined;
  }
}

export async function signOut(): Promise<void> {
  debugAuth("removing stored OAuth tokens");
  refreshPromise = undefined;
  await oauthClient.removeTokens();
}
