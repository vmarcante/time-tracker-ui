export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthenticationOutput {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  tokenType: string;
}

export interface RequestPasswordResetInput {
  username: string;
  email: string;
  locale?: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}
