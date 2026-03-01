import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppError } from "../../domain/errors/errors";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  bootstrapError: AppError | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);


