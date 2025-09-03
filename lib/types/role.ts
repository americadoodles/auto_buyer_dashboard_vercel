export type Role = {
  id: number;
  name: string;
  description?: string;
};

export type RoleCreate = {
  name: string;
  description?: string;
};

export type RoleEdit = {
  id: number;
  name: string;
  description?: string;
};
