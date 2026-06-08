export const API_BASE_URL = "https://manage.mysites.guru/api/v1";
export const AUTHORIZE_URL = "https://manage.mysites.guru/oauth/authorize";
export const TOKEN_URL = "https://manage.mysites.guru/oauth/token";

export const OAUTH_SCOPES = [
  "api:profile:read",
  "api:sites:read",
  "api:audits:read",
  "api:audits:write",
  "api:backups:read",
  "api:backups:write",
  "api:updates:read",
  "api:updates:write",
  "api:tags:read",
].join(" ");
