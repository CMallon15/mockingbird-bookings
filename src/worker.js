// Mockingbird Theater band portal API
// Secrets (set in Cloudflare, never in code): AIRTABLE_TOKEN, CALENDAR_FEED_URL (optional)
// Vars (wrangler.jsonc): AIRTABLE_BASE, ALLOWED_ORIGIN

const AGREEMENT_VERSION = "2026-10-A";

const T_DATES = "tblgIxDYNF9ty615D";
const T_SHOWS = "tblI9GY63AdEcaqlW";

// Shows field IDs
const F = {
  band: "fldIg5wJfYHIBhaAy",
  status: "fldaoJl6VCwtPAndG",
  showDate: "fldUuTfFswjLsNZWZ",
  altDates: "fldXRPM6fZz7dKOTb",
  contact: "fldmjZEH4qnwsHuQQ",
  email: "fldBokixm5NeAjZNE",
  phone: "fldNbHgl4q7TmzReo",
  hometown: "fldVka7zTUi8X6Hda",
  genre: "fldaHEnf3gavmInbY",
  bio: "fldRpPErXSvYnfjtb",
  links: "fldjNxPyaJB6ZLtfw",
  instagram: "fldrKvlt2txwdyirk",
  facebook: "fldUAkZndSgEw5YlI",
  otherBands: "fldBvhcD7f1QnorB1",
  draw: "fldl9v9tAohYAAL8C",
  message: "fldBkXkaRaKsTzaPM",
  setTime: "fldQX9DU1hg2Oqikx",
  token: "fldDkxEtyelm9LjlO",
  agreementVersion: "fldzn8K702wlwDzLX",
  signedName: "fldRlsxW4UGqCG8ww",
  signedTitle: "fldI7pGs7FLfX0uUx",
  signedAt: "fldXu9x2X9lSVfHeQ",
  signedIp: "fldviJWTL2qGkYebc",
  signedUa: "fldQ17ypObseKc87Q",
  ackPresale: "fldX30OSKe5SdwUNj",
  ackRadius: "fldJRP2I48kWadgBZ",
  ackPromo: "fldSJqkBz2nHtPwY6",
  members: "fldXkCes2MP5QD7Y3",
  vox: "fldw9EgUvN2iQd2nQ",
  dis: "fld6PNlFt6m5T2wKi",
  amps: "fld3ckQ1WN3C6f3VA",
  acoustic: "fld4K343dKUNfJavI",
  soundNotes: "fldYnLdV3JTgH2UZs",
  stagePlot: "fldnjVdTlpxRHmy7n",
  showName: "fldnFkJciPgtFPgMG",
  startTime: "fldc3UswJIy4bWdek",
  presale: "fldlMDNGLO9kxGrZ2",
  dayOf: "fldNXSRdMbxWem8JA",
  vipPresale: "fldz9By4YzqSOzoOF",
  vipDayOf: "fld5hsF8LUrUjivAc",
  vipSeats: "fldWBun0ymCoGCUHA",
  ages: "fldJFVYUKdEC20n8v",
  description: "fldHSRqgxd4e1GsDI",
  tunehatch: "fldIFTBIQAjmXoIwv",
  fbEvent: "fldLpUs6z7qAQKXS0",
  flyer: "fldQzyguptXtfPdwO",
  press: "fld2ZBla1qZzuxi3S",
  logo: "fldqd2EbYTbuqXuxz",
  payMethod: "fldmTrqqJcyZpUOz9",
  payHandle: "fld5aqhGjd2QQQudZ",
  w9: "fld5u6LRwgFErVczi",
  advanceAt: "fldAEaxDHtxLbhSbl",
  resendAt: "fldTAPyiMt6QAOGSY",
  techUpdatedAt: "fldYaSV2YmNbGDE3w",
  progress: "fldPEA0kRY5CwJguq",
  missing: "fldaST15AO5UfocTd",
};

// What a band owes before the show. section = where it lives on the page.
const CHECKLIST = [
  { key: "agreement", label: "Sign the agreement", section: "sec-agreement", done: (f) => !!f[F.signedAt] },
  { key: "sound", label: "Sound info", section: "adv-sound", done: (f) => f[F.members] != null && f[F.vox] != null },
  { key: "stageplot", label: "Stage plot and rider", section: "sec-uploads", done: (f) => !!(f[F.stagePlot] || []).length },
  { key: "tickets", label: "Ticket details", section: "adv-tickets", done: (f) => !!(f[F.startTime] && f[F.presale] != null && f[F.dayOf] != null && f[F.ages] && f[F.description]) },
  { key: "tunehatch", label: "TuneHatch profile link", section: "adv-tickets", done: (f) => !!f[F.tunehatch] },
  { key: "promoinfo", label: "Bio and Instagram", section: "adv-promo", done: (f) => !!(f[F.bio] && f[F.instagram]) },
  { key: "fbevent", label: "Facebook event co-hosted", section: "adv-promo", done: (f) => !!f[F.fbEvent] },
  { key: "flyer", label: "Show flyer", section: "sec-uploads", done: (f) => !!(f[F.flyer] || []).length },
  { key: "press", label: "Press photo", section: "sec-uploads", done: (f) => !!(f[F.press] || []).length },
  { key: "logo", label: "Band logo", section: "sec-uploads", done: (f) => !!(f[F.logo] || []).length },
  { key: "payment", label: "Payment details", section: "adv-payment", done: (f) => !!(f[F.payMethod] && f[F.payHandle]) },
];
const TECH_FIELDS = ["members", "vox", "dis", "amps", "acoustic", "soundNotes"];

function checklist(f) {
  return CHECKLIST.map((c) => ({ key: c.key, label: c.label, section: c.section, done: c.done(f) }));
}

// Recompute progress after any band change; promote to "Advanced" when everything is in.
async function syncProgress(env, rec, extra = {}) {
  const merged = { ...rec.fields, ...extra };
  const list = checklist(merged);
  const missing = list.filter((c) => !c.done);
  const fields = {
    ...extra,
    [F.progress]: `${list.length - missing.length} of ${list.length}`,
    [F.missing]: missing.map((c) => c.label).join("\n") || null,
  };
  if (!missing.length && merged[F.status] === "Agreement Signed") fields[F.status] = "Advanced";
  await at(env, T_SHOWS, { method: "PATCH", body: JSON.stringify({ records: [{ id: rec.id, fields }], typecast: true }) });
}

// Open Dates field IDs
const D = { date: "fldRhteJq4oXsih49", status: "fldoSXP9FkYt7X4if", notes: "fld8Y9YXi0SSJdRo5" };

const UPLOAD_FIELDS = { flyer: F.flyer, press: F.press, logo: F.logo, stageplot: F.stagePlot };
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_UPLOAD = 5 * 1024 * 1024; // Airtable direct-upload limit

const SIGNABLE = ["Approved"];
const ADVANCEABLE = ["Agreement Signed", "Advanced", "Confirmed"];
const UPLOADABLE = ["Approved", "Agreement Signed", "Advanced", "Confirmed"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      if (request.method === "POST") {
        const origin = request.headers.get("Origin");
        if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) return json({ error: "Bad origin" }, 403);
      }
      const route = `${request.method} ${url.pathname}`;
      switch (route) {
        case "GET /api/dates": return await getDates(env);
        case "POST /api/request": return await postRequest(request, env);
        case "GET /api/show": return await getShow(url, env);
        case "POST /api/sign": return await postSign(request, env);
        case "POST /api/advance": return await postAdvance(request, env);
        case "POST /api/upload": return await postUpload(request, url, env);
        case "POST /api/resend": return await postResend(request, env);
        default: return json({ error: "Not found" }, 404);
      }
    } catch (err) {
      console.error("API error: " + (err && err.message ? err.message : String(err)));
      return json({ error: "Something went wrong. Please try again or email the venue." }, 500);
    }
  },
};

// ---------- helpers ----------
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

function str(v, max = 500) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
function num(v, min = 0, max = 100000) {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const validToken = (t) => typeof t === "string" && /^[a-f0-9]{40}$/.test(t);

function newToken() {
  const b = new Uint8Array(20);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function todayCentral() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

async function at(env, path, init = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function findShow(env, token) {
  const formula = encodeURIComponent(`{Portal Token}='${token}'`);
  const data = await at(env, `${T_SHOWS}?filterByFormula=${formula}&maxRecords=1&returnFieldsByFieldId=true`);
  return data.records[0] || null;
}

async function readBody(request) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 50000) throw new Error("Body too large");
  return request.json();
}

// ---------- routes ----------
// Open dates = every Wed-Sun in the booking window with nothing on the venue calendar,
// plus Airtable overrides: Open forces a date on (with notes), Hold/Booked/Closed forces it off.
// Without CALENDAR_FEED_URL, only Airtable "Open" dates are offered.
const SHOW_DAYS = [0, 3, 4, 5, 6]; // Sun, Wed, Thu, Fri, Sat
const WINDOW_DAYS = 180;
const MIN_LEAD_DAYS = 14;

function isoAddDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function busyDates(env) {
  if (!env.CALENDAR_FEED_URL) return null;
  const cache = caches.default;
  const key = new Request("https://cache.internal/mockingbird-busy");
  const hit = await cache.match(key);
  if (hit) return new Set((await hit.json()).busy);
  const res = await fetch(env.CALENDAR_FEED_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`Calendar feed ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.busy)) throw new Error(`Calendar feed bad payload: ${JSON.stringify(data).slice(0, 200)}`);
  await cache.put(key, new Response(JSON.stringify({ busy: data.busy }), { headers: { "cache-control": "max-age=300" } }));
  return new Set(data.busy);
}

async function computeOpenDates(env) {
  const today = todayCentral();
  const formula = encodeURIComponent(`NOT(IS_BEFORE({Date}, '${today}'))`);
  const data = await at(env, `${T_DATES}?filterByFormula=${formula}&returnFieldsByFieldId=true`);
  const overrides = new Map();
  for (const r of data.records) {
    const d = r.fields[D.date];
    if (d && d >= today) overrides.set(d, { status: r.fields[D.status] || "", notes: r.fields[D.notes] || "" });
  }
  const busy = await busyDates(env);
  const out = new Map();
  if (busy) {
    for (let i = MIN_LEAD_DAYS; i <= WINDOW_DAYS; i++) {
      const iso = isoAddDays(today, i);
      const dow = new Date(iso + "T12:00:00Z").getUTCDay();
      if (SHOW_DAYS.includes(dow) && !busy.has(iso)) out.set(iso, "");
    }
  }
  for (const [d, o] of overrides) {
    if (o.status === "Open") out.set(d, o.notes);
    else if (o.status) out.delete(d);
  }
  return [...out.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, notes]) => ({ date, notes }));
}

async function getDates(env) {
  const dates = await computeOpenDates(env);
  return json({ dates }, 200, { "cache-control": "public, max-age=60" });
}

async function postRequest(request, env) {
  const b = await readBody(request);
  if (b.website) return json({ ok: true, token: newToken() }); // honeypot: pretend success

  const band = str(b.band, 120);
  const contact = str(b.contact, 120);
  const email = str(b.email, 200).toLowerCase();
  const date = str(b.date, 10);
  const altDates = str(b.altDates, 200);
  if (!band || !contact || !isEmail(email) || (date && !isISODate(date)) || (!date && !altDates)) {
    return json({ error: "Please fill in band name, contact name, a valid email and a date." }, 400);
  }

  // A picked date must still be open. With no date, the band told us what they want in altDates.
  if (date) {
    const open = await computeOpenDates(env);
    if (!open.some((d) => d.date === date)) return json({ error: "That date is no longer available. Please pick another." }, 409);
  }

  const token = newToken();
  const fields = {
    [F.band]: band,
    [F.status]: "Requested",
    [F.showDate]: date,
    [F.altDates]: altDates,
    [F.contact]: contact,
    [F.email]: email,
    [F.phone]: str(b.phone, 40),
    [F.hometown]: str(b.hometown, 120),
    [F.genre]: str(b.genre, 120),
    [F.bio]: str(b.bio, 3000),
    [F.links]: str(b.links, 1500),
    [F.instagram]: str(b.instagram, 120),
    [F.facebook]: str(b.facebook, 200),
    [F.otherBands]: str(b.otherBands, 600),
    [F.message]: str(b.message, 2000),
    [F.token]: token,
  };
  const draw = num(b.draw, 0, 1000);
  if (draw !== null) fields[F.draw] = draw;
  for (const k of Object.keys(fields)) if (fields[k] === "") delete fields[k];

  await at(env, T_SHOWS, { method: "POST", body: JSON.stringify({ records: [{ fields }], typecast: true }) });
  return json({ ok: true, token });
}

function publicShow(rec) {
  const f = rec.fields;
  const files = (arr) => (arr || []).map((a) => ({
    name: a.filename, url: a.url, type: a.type,
    thumb: a.thumbnails && a.thumbnails.large ? a.thumbnails.large.url : "",
  }));
  return {
    band: f[F.band] || "",
    status: f[F.status] || "Requested",
    showDate: f[F.showDate] || "",
    setTime: f[F.setTime] || "",
    contact: f[F.contact] || "",
    email: f[F.email] || "",
    instagram: f[F.instagram] || "",
    otherBands: f[F.otherBands] || "",
    checklist: checklist(f),
    agreementVersion: f[F.agreementVersion] || "",
    signedName: f[F.signedName] || "",
    signedTitle: f[F.signedTitle] || "",
    signedAt: f[F.signedAt] || "",
    advance: {
      members: f[F.members] ?? "", vox: f[F.vox] ?? "", dis: f[F.dis] ?? "", amps: f[F.amps] ?? "",
      acoustic: f[F.acoustic] || "", soundNotes: f[F.soundNotes] || "",
      showName: f[F.showName] || "", startTime: f[F.startTime] || "",
      presale: f[F.presale] ?? "", dayOf: f[F.dayOf] ?? "", vipPresale: f[F.vipPresale] ?? "", vipDayOf: f[F.vipDayOf] ?? "",
      vipSeats: f[F.vipSeats] || "", ages: f[F.ages] || "", description: f[F.description] || "",
      tunehatch: f[F.tunehatch] || "", fbEvent: f[F.fbEvent] || "",
      payMethod: f[F.payMethod] || "", payHandle: f[F.payHandle] || "",
      bio: f[F.bio] || "", hometown: f[F.hometown] || "", instagram: f[F.instagram] || "",
      facebook: f[F.facebook] || "", otherBands: f[F.otherBands] || "", links: f[F.links] || "",
    },
    w9: !!f[F.w9],
    advanceAt: f[F.advanceAt] || "",
    files: { flyer: files(f[F.flyer]), press: files(f[F.press]), logo: files(f[F.logo]), stageplot: files(f[F.stagePlot]) },
  };
}

async function getShow(url, env) {
  const t = url.searchParams.get("t");
  if (!validToken(t)) return json({ error: "This link isn't valid." }, 404);
  const rec = await findShow(env, t);
  if (!rec) return json({ error: "This link isn't valid." }, 404);
  return json({ show: publicShow(rec), agreementVersion: AGREEMENT_VERSION });
}

async function postSign(request, env) {
  const b = await readBody(request);
  if (!validToken(b.t)) return json({ error: "This link isn't valid." }, 404);
  const rec = await findShow(env, b.t);
  if (!rec) return json({ error: "This link isn't valid." }, 404);
  const status = rec.fields[F.status];
  if (rec.fields[F.signedAt]) return json({ error: "This agreement is already signed." }, 409);
  if (!SIGNABLE.includes(status)) return json({ error: "The agreement opens once Mockingbird approves your date." }, 409);
  if (!rec.fields[F.showDate]) return json({ error: "We're still setting your show date. You can sign once it's on your page." }, 409);
  if (b.version !== AGREEMENT_VERSION) return json({ error: "The agreement was updated. Please reload the page and review it again." }, 409);

  const name = str(b.name, 120);
  if (name.length < 3) return json({ error: "Type your full name to sign." }, 400);
  if (!(b.ackPresale && b.ackRadius && b.ackPromo && b.agree)) return json({ error: "Please check every box to sign." }, 400);

  const fields = {
    [F.signedName]: name,
    [F.signedTitle]: str(b.title, 120),
    [F.signedAt]: new Date().toISOString(),
    [F.signedIp]: request.headers.get("CF-Connecting-IP") || "",
    [F.signedUa]: str(request.headers.get("User-Agent"), 300),
    [F.agreementVersion]: AGREEMENT_VERSION,
    [F.ackPresale]: true,
    [F.ackRadius]: true,
    [F.ackPromo]: true,
    [F.status]: "Agreement Signed",
  };
  await syncProgress(env, rec, fields);
  return json({ ok: true });
}

async function postAdvance(request, env) {
  const b = await readBody(request);
  if (!validToken(b.t)) return json({ error: "This link isn't valid." }, 404);
  const rec = await findShow(env, b.t);
  if (!rec) return json({ error: "This link isn't valid." }, 404);
  const status = rec.fields[F.status];
  if (!ADVANCEABLE.includes(status)) return json({ error: "Please sign the agreement first." }, 409);

  const a = b.advance || {};
  const sel = (v, allowed) => (allowed.includes(v) ? v : null);
  const fields = {
    [F.members]: num(a.members, 0, 30),
    [F.vox]: num(a.vox, 0, 30),
    [F.dis]: num(a.dis, 0, 30),
    [F.amps]: num(a.amps, 0, 30),
    [F.acoustic]: str(a.acoustic, 300),
    [F.soundNotes]: str(a.soundNotes, 3000),
    [F.showName]: str(a.showName, 200),
    [F.startTime]: str(a.startTime, 40),
    [F.presale]: num(a.presale, 0, 1000),
    [F.dayOf]: num(a.dayOf, 0, 1000),
    [F.vipPresale]: num(a.vipPresale, 0, 1000),
    [F.vipDayOf]: num(a.vipDayOf, 0, 1000),
    [F.vipSeats]: sel(a.vipSeats, ["None", "20", "25", "30"]),
    [F.ages]: sel(a.ages, ["All Ages", "18+", "21+"]),
    [F.description]: str(a.description, 3000),
    [F.tunehatch]: str(a.tunehatch, 300),
    [F.fbEvent]: str(a.fbEvent, 300),
    [F.instagram]: str(a.instagram, 120) || rec.fields[F.instagram] || null,
    [F.bio]: str(a.bio, 3000) || rec.fields[F.bio] || null,
    [F.hometown]: str(a.hometown, 120),
    [F.facebook]: str(a.facebook, 200),
    [F.otherBands]: str(a.otherBands, 600),
    [F.payMethod]: sel(a.payMethod, ["Venmo", "PayPal"]),
    [F.payHandle]: str(a.payHandle, 120),
    [F.advanceAt]: new Date().toISOString(),
  };
  for (const k of Object.keys(fields)) if (fields[k] === "") fields[k] = null;
  const norm = (v) => (v === undefined || v === null ? "" : String(v));
  const techChanged = TECH_FIELDS.some((k) => norm(fields[F[k]]) !== norm(rec.fields[F[k]]));
  if (techChanged && ["Advanced", "Confirmed"].includes(status)) fields[F.techUpdatedAt] = new Date().toISOString();

  await syncProgress(env, rec, fields);
  return json({ ok: true });
}

async function postUpload(request, url, env) {
  const t = url.searchParams.get("t");
  const kind = url.searchParams.get("kind");
  if (!validToken(t)) return json({ error: "This link isn't valid." }, 404);
  const field = UPLOAD_FIELDS[kind];
  if (!field) return json({ error: "Unknown upload type." }, 400);

  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_UPLOAD + 100000) return json({ error: "File is over 5 MB. Please send a smaller version." }, 413);

  const rec = await findShow(env, t);
  if (!rec) return json({ error: "This link isn't valid." }, 404);
  if (!UPLOADABLE.includes(rec.fields[F.status])) return json({ error: "Uploads open once your date is approved." }, 409);

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "No file received." }, 400);
  if (file.size > MAX_UPLOAD) return json({ error: "File is over 5 MB. Please send a smaller version." }, 413);
  if (!UPLOAD_TYPES.includes(file.type)) return json({ error: "Please upload a JPG, PNG, WEBP, GIF or PDF." }, 415);

  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const filename = str(file.name, 120).replace(/[^\w.\- ]/g, "_") || `${kind}`;

  // Flyer, press photo and logo hold one file each: a new upload replaces the old one.
  if (kind !== "stageplot" && (rec.fields[field] || []).length) {
    await at(env, T_SHOWS, { method: "PATCH", body: JSON.stringify({ records: [{ id: rec.id, fields: { [field]: [] } }] }) });
  }
  if (kind === "stageplot" && (rec.fields[field] || []).length >= 4) {
    return json({ error: "That's the limit of 4 files. Email Alex if you need to send more." }, 409);
  }
  const res = await fetch(`https://content.airtable.com/v0/${env.AIRTABLE_BASE}/${rec.id}/${field}/uploadAttachment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ contentType: file.type, file: btoa(bin), filename }),
  });
  if (!res.ok) throw new Error(`Upload ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const fresh = await findShow(env, t);
  const extra = {};
  if (kind === "stageplot" && ["Advanced", "Confirmed"].includes(fresh.fields[F.status])) extra[F.techUpdatedAt] = new Date().toISOString();
  await syncProgress(env, fresh, extra);
  return json({ ok: true, name: filename });
}

// Email a band their portal link(s) again. Always answers the same way so it can't be used to probe emails.
async function postResend(request, env) {
  const b = await readBody(request);
  const email = str(b.email, 200).toLowerCase();
  const generic = json({ ok: true, message: "If that email has a booking with us, we just sent the link. Check your inbox and spam folder." });
  if (!isEmail(email)) return json({ error: "Please enter a valid email." }, 400);
  const safe = email.replace(/'/g, "");
  const formula = encodeURIComponent(`AND(LOWER({Email})='${safe}', NOT(OR({Status}='Declined', {Status}='Cancelled')))`);
  const data = await at(env, `${T_SHOWS}?filterByFormula=${formula}&maxRecords=10&returnFieldsByFieldId=true`);
  const now = Date.now();
  const due = data.records.filter((r) => !r.fields[F.resendAt] || now - Date.parse(r.fields[F.resendAt]) > 10 * 60 * 1000);
  if (due.length) {
    await at(env, T_SHOWS, {
      method: "PATCH",
      body: JSON.stringify({ records: due.map((r) => ({ id: r.id, fields: { [F.resendAt]: new Date().toISOString() } })) }),
    });
  }
  return generic;
}
