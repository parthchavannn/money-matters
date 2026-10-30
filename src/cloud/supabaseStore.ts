import type { SupabaseClient } from "@supabase/supabase-js";
import { appDataSchema } from "@/store/storage";
import type { AppData } from "@/domain/types";
import type { CloudStore } from "./syncEngine";

const TABLE = "user_data";
const UNIQUE_VIOLATION = "23505";

/**
 * One row per user in `public.user_data` (see supabase/migrations). Row-level security
 * guarantees users only reach their own row; the `revision` guard guarantees an edit never
 * silently overwrites a newer version from another device.
 */
export function createSupabaseStore(client: SupabaseClient, userId: string): CloudStore {
  return {
    async fetch() {
      const { data, error } = await client.from(TABLE).select("data, revision").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const parsed = appDataSchema.safeParse(data.data);
      // Refuse to load — and therefore never overwrite — a document we can't understand.
      if (!parsed.success) throw new Error("Your cloud data is in an unexpected format. Please contact support.");
      return { data: parsed.data as AppData, revision: data.revision as number };
    },

    async push(doc, base) {
      if (base === null) {
        const { data, error } = await client.from(TABLE).insert({ user_id: userId, data: doc }).select("revision").single();
        if (error) {
          if (error.code === UNIQUE_VIOLATION) return { status: "conflict" };
          throw error;
        }
        return { status: "ok", revision: data.revision as number };
      }
      // Matches only if nobody else has written since `base`.
      const { data, error } = await client
        .from(TABLE)
        .update({ data: doc })
        .eq("user_id", userId)
        .eq("revision", base)
        .select("revision");
      if (error) throw error;
      if (!data || data.length === 0) return { status: "conflict" };
      return { status: "ok", revision: data[0].revision as number };
    },
  };
}
