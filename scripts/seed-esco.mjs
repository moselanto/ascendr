#!/usr/bin/env node
/**
 * Seed the Career Graph from ESCO.
 *
 *   node scripts/seed-esco.mjs                 # seed the default role set
 *   node scripts/seed-esco.mjs --dry-run       # fetch + report, write nothing
 *   node scripts/seed-esco.mjs --role "data analyst" --role "ux designer"
 *   node scripts/seed-esco.mjs --no-embed      # skip OpenAI, insert labels only
 *
 * ---------------------------------------------------------------------------
 * WHY ROLE-DRIVEN RATHER THAN A FULL TAXONOMY DUMP
 *
 * ESCO holds ~3,000 occupations and ~14,000 skills. Ingesting all of it is
 * possible but pointless right now: gap analysis only needs the skills that
 * some target role actually requires. Seeding role-first gives working gap
 * analysis in minutes instead of hours, costs a fraction of the embedding
 * spend, and keeps `skills` free of 13,000 rows nobody will ever match.
 *
 * Add roles to ROLES (or pass --role) as the product grows. The script is
 * idempotent, so re-running with a longer list only adds what is missing.
 *
 * ---------------------------------------------------------------------------
 * THE VERSION TRAP
 *
 * The hosted ESCO API does NOT default to the current classification. Without
 * an explicit selectedVersion it answers from v1.0.9, an old revision, and the
 * drift is real — the same query returns materially different result counts.
 * ESCO_VERSION below pins it. Do not remove that parameter.
 *
 * ---------------------------------------------------------------------------
 * REQUIRES
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     (writes bypass RLS — server-side only)
 *   OPENAI_API_KEY                (optional; --no-embed skips it)
 *
 * Node 20+ (built-in fetch). No dependencies beyond @supabase/supabase-js,
 * which the app already ships.
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ESCO_BASE = "https://ec.europa.eu/esco/api";
const ESCO_VERSION = "v1.2.0"; // see "THE VERSION TRAP" above
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
const EMBED_BATCH = 96; // OpenAI accepts more; smaller batches fail smaller
const ESCO_DELAY_MS = 250; // be a polite guest on a free public API

/** Default target roles. Chosen to cover the demo journey and common goals. */
const ROLES = [
  "product manager",
  "data analyst",
  "data scientist",
  "software developer",
  "business analyst",
  "ux designer",
  "project manager",
  "marketing manager",
  "sales manager",
  "operations manager",
  "technical support specialist",
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const NO_EMBED = argv.includes("--no-embed");
const roleArgs = argv.reduce((acc, arg, i) => {
  if (arg === "--role" && argv[i + 1]) acc.push(argv[i + 1]);
  return acc;
}, []);
const TARGET_ROLES = roleArgs.length > 0 ? roleArgs : ROLES;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set them, or use --dry-run to inspect what would be seeded."
  );
  process.exit(1);
}

const embedEnabled = !NO_EMBED && !!OPENAI_KEY;
if (!embedEnabled && !NO_EMBED) {
  console.warn(
    "! OPENAI_API_KEY not set — seeding labels without embeddings.\n" +
      "  Exact skill matching will work; vector alias matching will not.\n" +
      "  Re-run later with the key set to backfill (the script is idempotent).\n"
  );
}

const supabase =
  DRY_RUN || !SUPABASE_URL
    ? null
    : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function escoGet(path, params) {
  const url = new URL(`${ESCO_BASE}${path}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("selectedVersion", ESCO_VERSION);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`ESCO ${res.status} ${res.statusText} for ${url.pathname}`);
  }
  await sleep(ESCO_DELAY_MS);
  return res.json();
}

/**
 * ESCO responses are HAL-shaped, but the envelope has varied between versions
 * and endpoints. Read defensively rather than assuming one layout — a shape
 * change should degrade to "found nothing", not throw.
 */
function readResults(payload) {
  return payload?._embedded?.results ?? payload?.results ?? [];
}

function readLinked(resource, relation) {
  const link = resource?._links?.[relation];
  if (!link) return [];
  return Array.isArray(link) ? link : [link];
}

/** ESCO skill URIs classify into our skill_type enum via their skillType field. */
function mapSkillType(raw) {
  const v = String(raw ?? "").toLowerCase();
  if (v.includes("knowledge")) return "knowledge";
  if (v.includes("language")) return "language";
  if (v.includes("transversal")) return "transversal";
  return "skill";
}

async function embedAll(texts) {
  if (!embedEnabled || texts.length === 0) return new Map();
  const out = new Map();

  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
    });
    if (!res.ok) {
      // Embeddings are an optimisation, not a correctness requirement. Warn and
      // continue so a quota blip does not abandon a half-finished seed.
      console.warn(`  ! embedding batch failed (${res.status}) — continuing without`);
      return out;
    }
    const json = await res.json();
    json.data.forEach((d, j) => out.set(batch[j], d.embedding));
    process.stdout.write(`  embedded ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}\r`);
  }
  process.stdout.write("\n");
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `ESCO seed — version ${ESCO_VERSION}, ${TARGET_ROLES.length} role(s)` +
      `${DRY_RUN ? " [DRY RUN]" : ""}${embedEnabled ? "" : " [no embeddings]"}\n`
  );

  /** label -> skill record, deduped across roles */
  const skillsByUri = new Map();
  /** { roleExternalId, skillUri, importance } */
  const roleSkillLinks = [];
  const roleRecords = [];

  for (const term of TARGET_ROLES) {
    process.stdout.write(`• ${term} … `);

    let occupation;
    try {
      const search = await escoGet("/search", { text: term, type: "occupation", limit: "1" });
      const top = readResults(search)[0];
      if (!top?.uri) {
        console.log("no match, skipped");
        continue;
      }
      occupation = await escoGet("/resource/occupation", { uri: top.uri });
    } catch (err) {
      console.log(`failed (${err.message})`);
      continue;
    }

    const roleUri = occupation.uri;
    const title = occupation.preferredLabel?.en ?? occupation.title ?? term;
    const iscoCode =
      occupation.code ??
      readLinked(occupation, "broaderIscoGroup")[0]?.code ??
      null;

    roleRecords.push({
      external_id: roleUri,
      isco_code: iscoCode,
      title,
      alt_titles: (occupation.alternativeLabel?.en ?? []).slice(0, 20),
      description: occupation.description?.en?.literal ?? null,
    });

    const essential = readLinked(occupation, "hasEssentialSkill");
    const optional = readLinked(occupation, "hasOptionalSkill");

    for (const [list, importance] of [
      [essential, "essential"],
      [optional, "optional"],
    ]) {
      for (const s of list) {
        if (!s.uri) continue;
        if (!skillsByUri.has(s.uri)) {
          skillsByUri.set(s.uri, {
            external_id: s.uri,
            source: "esco",
            preferred_label: s.title ?? s.preferredLabel?.en ?? "",
            alt_labels: [],
            skill_type: mapSkillType(s.skillType),
          });
        }
        roleSkillLinks.push({ roleUri, skillUri: s.uri, importance });
      }
    }

    console.log(`${essential.length} essential, ${optional.length} optional`);
  }

  const skills = [...skillsByUri.values()].filter((s) => s.preferred_label);
  console.log(
    `\nResolved ${roleRecords.length} role(s), ${skills.length} unique skill(s), ` +
      `${roleSkillLinks.length} link(s).`
  );

  if (DRY_RUN) {
    console.log("\nDry run — nothing written.");
    return;
  }
  if (skills.length === 0) {
    console.error("Nothing to seed. Check connectivity to ec.europa.eu.");
    process.exit(1);
  }

  // --- Embed skill labels -------------------------------------------------
  if (embedEnabled) {
    console.log("\nEmbedding skill labels…");
    const vectors = await embedAll(skills.map((s) => s.preferred_label));
    for (const s of skills) {
      const v = vectors.get(s.preferred_label);
      if (v) s.embedding = v;
    }
  }

  // --- Write ---------------------------------------------------------------
  // Upsert on external_id so re-running is safe and additive.
  console.log("Writing skills…");
  for (let i = 0; i < skills.length; i += 200) {
    const { error } = await supabase
      .from("skills")
      .upsert(skills.slice(i, i + 200), { onConflict: "external_id" });
    if (error) throw new Error(`skills upsert: ${error.message}`);
  }

  console.log("Writing role profiles…");
  const { error: roleErr } = await supabase
    .from("role_profiles")
    .upsert(roleRecords, { onConflict: "external_id" });
  if (roleErr) throw new Error(`role_profiles upsert: ${roleErr.message}`);

  // Resolve external ids back to primary keys for the join table.
  const { data: skillRows } = await supabase
    .from("skills")
    .select("id, external_id")
    .in("external_id", skills.map((s) => s.external_id));
  const { data: roleRows } = await supabase
    .from("role_profiles")
    .select("id, external_id")
    .in("external_id", roleRecords.map((r) => r.external_id));

  const skillId = new Map((skillRows ?? []).map((r) => [r.external_id, r.id]));
  const roleId = new Map((roleRows ?? []).map((r) => [r.external_id, r.id]));

  const links = roleSkillLinks
    .map((l) => ({
      role_id: roleId.get(l.roleUri),
      skill_id: skillId.get(l.skillUri),
      importance: l.importance,
      // Uniform to start. Once opportunity ingestion runs, weight should be
      // learned from how often each skill appears in real job descriptions
      // for the role — that is what makes coverage scoring meaningful.
      weight: l.importance === "essential" ? 0.8 : 0.3,
    }))
    .filter((l) => l.role_id && l.skill_id);

  console.log("Writing role/skill links…");
  for (let i = 0; i < links.length; i += 300) {
    const { error } = await supabase
      .from("role_required_skills")
      .upsert(links.slice(i, i + 300), { onConflict: "role_id,skill_id" });
    if (error) throw new Error(`role_required_skills upsert: ${error.message}`);
  }

  console.log(
    `\nDone. ${skills.length} skills, ${roleRecords.length} roles, ${links.length} links.\n` +
      `Gap analysis is live for any goal whose target_role_id points at one of these roles.`
  );
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
