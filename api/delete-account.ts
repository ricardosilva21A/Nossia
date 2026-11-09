// Deletes the signed-in account. If a partner remains, the couple's data stays with them;
// otherwise the couple, its stored photos and everything else go with the account.

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

declare const process: { env: Record<string, string | undefined> };

const bucketName = "date-photos";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function listFiles(client: SupabaseClient, prefix: string): Promise<string[]> {
  const files: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.storage.from(bucketName).list(prefix, { limit: pageSize, offset });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      // Storage reports folders as entries without an id.
      if (item.id === null) files.push(...await listFiles(client, path));
      else files.push(path);
    }
    if ((data ?? []).length < pageSize) return files;
  }
}

async function removeCoupleFiles(client: SupabaseClient, coupleId: string) {
  const files = await listFiles(client, coupleId);
  for (let start = 0; start < files.length; start += 100) {
    const { error } = await client.storage.from(bucketName).remove(files.slice(start, start + 100));
    if (error) throw error;
  }
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json({ error: "not_configured" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const body = await request.json().catch(() => null) as { confirm?: string } | null;
  if (body?.confirm !== "APAGAR") return json({ error: "not_confirmed" }, 400);

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await client.auth.getUser(authorization.slice(7));
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  try {
    const { data: membership, error: membershipError } = await client.from("couple_members").select("couple_id").eq("user_id", user.id).maybeSingle();
    if (membershipError) throw membershipError;
    const { data: owned, error: ownedError } = await client.from("couples").select("id").eq("account_user_id", user.id).maybeSingle();
    if (ownedError) throw ownedError;
    const coupleId = (membership?.couple_id ?? owned?.id) as string | undefined;

    if (coupleId) {
      const { data: members, error: membersError } = await client.from("couple_members").select("user_id").eq("couple_id", coupleId);
      if (membersError) throw membersError;
      const partner = (members ?? []).find((member) => member.user_id !== user.id);
      if (partner) {
        // The couple is tied to its owner's account and would be deleted with it.
        if (owned) {
          const { error } = await client.from("couples").update({ account_user_id: partner.user_id }).eq("id", coupleId);
          if (error) throw error;
        }
      } else {
        await removeCoupleFiles(client, coupleId);
      }
    }

    const { error: deleteError } = await client.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return json({ deleted: true });
  } catch (error) {
    console.error("delete-account failed", error instanceof Error ? error.message : error);
    return json({ error: "failed" }, 500);
  }
}
