export type User = {
  id: string;
  email: string;
  username: string;
  role_id: number;
  role: string;  // Add role name field
  is_confirmed: boolean;
};

export type UserSignupRequest = {
  id?: string;
  email: string;
  password: string;
  username: string;
  role_id?: number;
};

export type UserLoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: 'bearer';
  user: User;
};

export type UserConfirmRequest = {
  user_id: string;
  confirm: boolean;
};

export type UserRemoveRequest = {
  user_id: string;
};
