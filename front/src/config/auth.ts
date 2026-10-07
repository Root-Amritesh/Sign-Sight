/**
 * Auth configuration for SignSight Frontend.
 * Allows configuring the login field key ('username' vs 'email') depending on backend API variant.
 */

export interface AuthConfig {
  /**
   * Field name sent in POST /api/auth/login/ payload.
   * 'username' (API_SPEC default) or 'email' (CONTRACTS reference).
   */
  loginUsernameField: 'username' | 'email';
}

export const authConfig: AuthConfig = {
  loginUsernameField: 'username',
};
