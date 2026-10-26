// Supabase Edge Function entry point (Deno). All logic lives in core.ts so it can be tested anywhere.
import { handleChat } from "./core.ts";

Deno.serve((req: Request) => handleChat(req, { get: (name: string) => Deno.env.get(name) }));
