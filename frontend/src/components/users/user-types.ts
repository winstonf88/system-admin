/** Shape used for user list rows and edit forms (matches API `UserRead`). */
export type UserRow = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
};
