/**
 * Supabase Database typing for the unified app.
 * Uses index signatures so table operations stay typed without `never` inference.
 * Replace with generated types from `supabase gen types typescript` when available.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef = {
  Row: Record<string, Json | undefined>;
  Insert: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
  Relationships: [];
};

type FunctionDef = {
  Args: Record<string, Json | undefined>;
  Returns: Json;
};

export interface Database {
  public: {
    Tables: Record<string, TableDef>;
    Functions: Record<string, FunctionDef>;
  };
}
