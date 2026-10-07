// Microsoft Entra ID (Azure AD) MSAL Authentication Client
export interface EntraConfig {
  clientId: string;
  tenantId: string;
  enabled: boolean;
}

export const getEntraConfig = (): EntraConfig => {
  const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
  const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || 'common';
  const enabled = import.meta.env.VITE_ENABLE_ENTRA === 'true' && Boolean(clientId);

  return {
    clientId,
    tenantId,
    enabled,
  };
};

export const initiateEntraLogin = async (): Promise<never> => {
  const config = getEntraConfig();
  if (!config.enabled) {
    throw new Error('NOT IMPLEMENTED — Entra ID authentication backend endpoint is not configured (VITE_ENABLE_ENTRA=false).');
  }

  // Construct OAuth2 authorization endpoint
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth`);
  const scope = encodeURIComponent('openid profile email');
  const authUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?client_id=${config.clientId}&response_type=id_token&redirect_uri=${redirectUri}&scope=${scope}&response_mode=fragment&nonce=${Math.random().toString(36).substring(2)}`;

  window.location.href = authUrl;
  return new Promise(() => {});
};
