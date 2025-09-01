export type User = {
  id: string;
  email: string;
  role: 'admin' | 'buyer' | 'analyst';
  is_confirmed: boolean;
};

export type UserSignupRequest = {
  id?: string;
  email: string;
  password: string;
  role?: 'buyer';
};

export type UserLoginRequest = {
  email: string;
  password: string;
};

export type UserConfirmRequest = {
  user_id: string;
  confirm: boolean;
};

export type UserRemoveRequest = {
  user_id: string;
};
