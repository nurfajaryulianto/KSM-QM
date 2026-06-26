"""
=======================================================
  LOAD TEST — KSM-QM LMS Assessment
  Arsitektur BARU: Frontend → Supabase langsung

  Perubahan dari versi lama:
  ✅ Submit jawaban  : POST langsung ke Supabase (bukan via GAS)
  ✅ Leaderboard     : GET langsung dari Supabase (bukan via GAS)
  ✅ getConfig       : tetap via GAS
  ✅ startSession    : tetap via GAS
  ✅ Success check   : HTTP 201 untuk Supabase POST (bukan success:true)
  ✅ Payload submit  : schema baru (null scores, answers_detail berisi teks)
  ✅ Cleanup         : hapus dari Supabase, bukan Google Sheets

  Run: python load_test_ksm_qm.py
=======================================================

  ⚠️  CLEANUP SETELAH TEST
  Jalankan query ini di Supabase SQL Editor:
    DELETE FROM assessment_responses WHERE nik LIKE 'LDTEST%';
  Atau via Supabase Table Editor → filter nik contains "LDTEST" → delete

  ⚠️  PASTIKAN SEBELUM MENJALANKAN:
  1. Isi SUPABASE_ANON_KEY dengan anon/public key (bukan service_role)
  2. Assessment harus dalam kondisi OPEN (via Admin Panel)
  3. TEST_SUBDEPT harus sesuai dengan nama sheet yang ada
=======================================================
"""

import asyncio
import aiohttp
import json
import random
import time
import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────

VERCEL_URL        = "https://ksm-qm-ia.vercel.app"
GAS_URL           = "https://script.google.com/macros/s/AKfycbzLpAY6b3TIh5zfrxN1FHV2kacyRRNW-wQGhVDoshXqi6gFgDjOlPWEZxXZB9SccepfiQ/exec"
SUPABASE_URL      = "https://zbdynfmrxhnxzktztniy.supabase.co"

# ⚠️  Wajib diisi: anon/public key dari Supabase Dashboard → Settings → API
# BUKAN service_role key — gunakan baris "anon public"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZHluZm1yeGhueHprdHp0bml5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM3MzI3OSwiZXhwIjoyMDk3OTQ5Mjc5fQ.9jnqCOmDUfnLfb0k9t-kXJggbQsV53KGsBxbfS0bdQs"

TOTAL_REQUESTS    = 300   # total request yang dikirim
DURATION_SECONDS  = 5     # spread ke berapa detik (ramp-up)
CONCURRENCY_LIMIT = 150   # max concurrent connection

# Rasio distribusi request (total harus tepat 1.0)
SUBMIT_RATIO      = 0.30  # 30% → POST submit ke Supabase  (~90 req) ← bottleneck utama
LEADERBOARD_RATIO = 0.15  # 15% → GET leaderboard dari Supabase (~45 req)
# Sisa 55% → GAS getConfig, startSession, Vercel frontend (~165 req)

# Sub-dept target untuk startSession & payload submit
TEST_SUBDEPT = "Global"

# Jumlah soal simulasi — sesuaikan dengan jumlah soal di sheet TEST_SUBDEPT
NUM_MC     = 18
NUM_BINARY = 18
NUM_ESSAY  = 24
TOTAL_Q    = NUM_MC + NUM_BINARY + NUM_ESSAY  # 60

# ─────────────────────────────────────────────
#  DUMMY DATA GENERATOR
# ─────────────────────────────────────────────

ESSAY_FILLERS = [
    "Proses pengecekan kualitas dilakukan secara sistematis sesuai standar perusahaan",
    "Identifikasi defect menggunakan metode fishbone diagram dan analisis 5 why",
    "Pengendalian kualitas melalui sampling berkala dan inspeksi rutin di lini produksi",
    "Analisis akar penyebab masalah dengan metode 5 why dan PDCA cycle",
    "Implementasi poka yoke untuk mencegah kesalahan produksi sejak dini",
    "Standar kualitas produk ditetapkan berdasarkan AQL dan spesifikasi pelanggan",
    "Dokumentasi temuan defect dilakukan secara real-time menggunakan sistem digital",
]

# Opsi teks dummy untuk MC dan Binary
# (tidak perlu cocok dengan soal asli — load test hanya uji infrastruktur)
MC_OPTIONS_DUMMY     = ["Opsi A", "Opsi B", "Opsi C", "Opsi D"]
BINARY_OPTIONS_DUMMY = ["Benar", "Salah"]

def make_answers_detail() -> dict:
    """
    Build answers_detail sesuai format baru (script.js v5):
      - MC/Binary : teks opsi yang dipilih (bukan index angka)
      - Essay     : teks jawaban bebas

    Q-key = "Q{id}" di mana id = nomor baris di sheet (1-based).
    Untuk load test, Q1 – Q{TOTAL_Q} digunakan sebagai proxy.
    """
    detail = {}
    q_num  = 1

    for _ in range(NUM_MC):
        detail[f"Q{q_num}"] = random.choice(MC_OPTIONS_DUMMY)
        q_num += 1

    for _ in range(NUM_BINARY):
        detail[f"Q{q_num}"] = random.choice(BINARY_OPTIONS_DUMMY)
        q_num += 1

    for _ in range(NUM_ESSAY):
        detail[f"Q{q_num}"] = random.choice(ESSAY_FILLERS)
        q_num += 1

    return detail

def make_submit_payload(index: int) -> dict:
    """
    Payload POST ke Supabase assessment_responses.
    Sesuai schema baru (script.js v5):
      - correct_count, accuracy_pct, total_score = null
        (penilaian dilakukan terpisah oleh GAS/Supabase function)
      - answers_detail berisi teks opsi (bukan index)
    """
    return {
        "submitted_at":    datetime.now(timezone.utc).isoformat(),
        "nik":             f"LDTEST{index:05d}",
        "name":            f"Load Test User {index:05d}",
        "sub_department":  TEST_SUBDEPT,
        "correct_count":   None,          # null — belum dinilai
        "total_questions": TOTAL_Q,
        "accuracy_pct":    None,          # null — belum dinilai
        "base_score":      0,
        "speed_bonus":     0,
        "total_score":     None,          # null — belum dinilai
        "time_taken_s":    random.randint(120, 540),
        "mc_score":        0,
        "binary_score":    0,
        "essay_score":     0,
        "answers_detail":  make_answers_detail()
    }

# ─────────────────────────────────────────────
#  SHARED HEADERS
# ─────────────────────────────────────────────

def supabase_post_headers() -> dict:
    return {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }

def supabase_get_headers() -> dict:
    return {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    }

# ─────────────────────────────────────────────
#  ENDPOINT POOL BUILDER
# ─────────────────────────────────────────────

def build_endpoint_pool(total: int) -> list[dict]:
    n_submit      = round(total * SUBMIT_RATIO)
    n_leaderboard = round(total * LEADERBOARD_RATIO)
    n_get         = total - n_submit - n_leaderboard

    # ── 1. Supabase POST (submit jawaban) ─────────────────────────────────
    # Setiap request punya NIK unik agar tidak bertabrakan di unique constraint
    submit_pool = [
        {
            "label":     "Supabase → POST assessment_responses (submit)",
            "method":    "POST",
            "url":       f"{SUPABASE_URL}/rest/v1/assessment_responses",
            "headers":   supabase_post_headers(),
            "json":      make_submit_payload(i),
            "is_sb_post": True,
        }
        for i in range(1, n_submit + 1)
    ]

    # ── 2. Supabase GET (leaderboard) ─────────────────────────────────────
    # Sesuai query di loadLeaderboard() script.js v5
    lb_url = (
        f"{SUPABASE_URL}/rest/v1/assessment_responses"
        "?select=name,sub_department,correct_count,total_questions,"
        "accuracy_pct,base_score,speed_bonus,total_score,time_taken_s"
        "&order=total_score.desc.nullslast,time_taken_s.asc"
        "&limit=20"
    )
    leaderboard_pool = [
        {
            "label":     "Supabase → GET assessment_responses (leaderboard)",
            "method":    "GET",
            "url":       lb_url,
            "headers":   supabase_get_headers(),
            "is_sb_post": False,
        }
        for _ in range(n_leaderboard)
    ]

    # ── 3. GAS + Vercel GET ───────────────────────────────────────────────
    # GAS getLeaderboard TIDAK diuji (sudah digantikan Supabase langsung)
    get_templates = [
        {
            "label":  "Frontend (Vercel /)",
            "url":    f"{VERCEL_URL}/",
            "weight": 2,
        },
        {
            "label":  "GAS → getConfig",
            "url":    f"{GAS_URL}?action=getConfig",
            "weight": 5,
        },
        {
            "label":  "GAS → startSession",
            "url":    (
                f"{GAS_URL}?action=startSession"
                f"&nik=LDPREVIEW&name=Preview+User&subDept={TEST_SUBDEPT}"
            ),
            "weight": 2,
        },
    ]
    total_weight = sum(e["weight"] for e in get_templates)
    get_pool: list[dict] = []
    for ep in get_templates:
        count = round((ep["weight"] / total_weight) * n_get)
        for _ in range(count):
            get_pool.append({
                "label":     ep["label"],
                "method":    "GET",
                "url":       ep["url"],
                "is_sb_post": False,
            })
    # Padding / trim agar tepat n_get
    while len(get_pool) < n_get:
        get_pool.append({
            "label":     "GAS → getConfig",
            "method":    "GET",
            "url":       f"{GAS_URL}?action=getConfig",
            "is_sb_post": False,
        })
    get_pool = get_pool[:n_get]

    # Gabung & shuffle agar submit tersebar merata, tidak cluster di awal/akhir
    pool = submit_pool + leaderboard_pool + get_pool
    random.shuffle(pool)
    return pool

# ─────────────────────────────────────────────
#  RESULT TRACKER
# ─────────────────────────────────────────────

@dataclass
class Result:
    label:       str
    status:      int   = 0
    latency_ms:  float = 0.0
    error:       str   = ""
    response:    str   = ""
    is_sb_post:  bool  = False

results: list[Result] = []

# ─────────────────────────────────────────────
#  WORKER
# ─────────────────────────────────────────────

async def send_request(session: aiohttp.ClientSession, ep: dict, sem: asyncio.Semaphore):
    async with sem:
        start       = time.monotonic()
        is_sb_post  = ep.get("is_sb_post", False)

        try:
            kwargs: dict = {"timeout": aiohttp.ClientTimeout(total=60)}
            if ep.get("headers"):
                kwargs["headers"] = ep["headers"]
            if ep["method"] == "POST" and ep.get("json"):
                kwargs["json"] = ep["json"]

            async with session.request(ep["method"], ep["url"], **kwargs) as resp:
                body    = await resp.text()
                latency = (time.monotonic() - start) * 1000

                actual_status = resp.status
                body_error    = ""

                if is_sb_post:
                    # Supabase POST: HTTP 201 = sukses
                    # Kode lain = error (duplikat NIK → 409, RLS deny → 401/403, dll)
                    if resp.status not in (200, 201):
                        try:
                            parsed     = json.loads(body)
                            body_error = (
                                parsed.get("message") or
                                parsed.get("error")   or
                                parsed.get("details") or
                                body[:100]
                            )
                        except Exception:
                            body_error = body[:100]

                elif resp.status == 200:
                    # GAS / Vercel: deteksi success:false di body
                    try:
                        parsed = json.loads(body)
                        if isinstance(parsed, dict) and parsed.get("success") is False:
                            actual_status = -1
                            body_error    = parsed.get("message", "success:false")[:80]
                    except Exception:
                        pass  # bukan JSON, pakai HTTP status asli

                results.append(Result(
                    label      = ep["label"],
                    status     = actual_status,
                    latency_ms = latency,
                    error      = body_error,
                    response   = body[:120],
                    is_sb_post = is_sb_post,
                ))

        except asyncio.TimeoutError:
            latency = (time.monotonic() - start) * 1000
            results.append(Result(
                label      = ep["label"],
                status     = 0,
                latency_ms = latency,
                error      = "TIMEOUT (>60s)",
                is_sb_post = is_sb_post,
            ))
        except Exception as exc:
            latency = (time.monotonic() - start) * 1000
            results.append(Result(
                label      = ep["label"],
                status     = 0,
                latency_ms = latency,
                error      = str(exc)[:100],
                is_sb_post = is_sb_post,
            ))

# ─────────────────────────────────────────────
#  REPORT HELPER
# ─────────────────────────────────────────────

def print_report(reqs: list[Result], label: str) -> tuple[int, int]:
    """Print per-endpoint report. Returns (ok_count, total_count)."""
    lats       = sorted(r.latency_ms for r in reqs)
    is_sb_post = any(r.is_sb_post for r in reqs)
    is_sb_get  = (not is_sb_post) and any("supabase" in r.label.lower() for r in reqs)

    if is_sb_post:
        # Supabase POST: sukses = 200 or 201
        truly_ok  = [r for r in reqs if r.status in (200, 201)]
        gas_fail  = []
        http_fail = [r for r in reqs if r.status not in (200, 201, 0)]
    elif is_sb_get:
        # Supabase GET: sukses = 200, array response normal
        truly_ok  = [r for r in reqs if r.status == 200]
        gas_fail  = []
        http_fail = [r for r in reqs if r.status not in (200, 0)]
    else:
        # GAS / Vercel
        truly_ok  = [r for r in reqs if 200 <= r.status < 400]
        gas_fail  = [r for r in reqs if r.status == -1]
        http_fail = [r for r in reqs if r.status >= 400]

    net_fail = [r for r in reqs if r.status == 0]
    pct_ok   = 100 * len(truly_ok) // len(reqs) if reqs else 0

    print(f"  ┌─ {label}")
    print(f"  │   Total requests        : {len(reqs)}")

    if is_sb_post:
        print(f"  │   ✅ Sukses (HTTP 201/200): {len(truly_ok):>4}  ({pct_ok}%)")
        if http_fail:
            # Tampilkan breakdown HTTP status kode untuk error Supabase
            code_map: dict[int, int] = defaultdict(int)
            for r in http_fail:
                code_map[r.status] += 1
            codes_str = ", ".join(f"HTTP {c}: {n}" for c, n in sorted(code_map.items()))
            print(f"  │   ❌ Supabase Error       : {len(http_fail):>4}  ({codes_str})")
    elif is_sb_get:
        print(f"  │   ✅ Sukses (HTTP 200)    : {len(truly_ok):>4}  ({pct_ok}%)")
        print(f"  │   ❌ HTTP Error 4xx/5xx   : {len(http_fail):>4}")
    else:
        print(f"  │   ✅ Sukses               : {len(truly_ok):>4}  ({pct_ok}%)")
        print(f"  │   ❌ GAS-level fail        : {len(gas_fail):>4}")
        print(f"  │   ❌ HTTP Error 4xx/5xx   : {len(http_fail):>4}")

    print(f"  │   ❌ Network/Timeout       : {len(net_fail):>4}")

    if lats:
        p = lambda pct: lats[max(0, int(len(lats) * pct / 100) - 1)]
        print(
            f"  │   Latency : "
            f"min={min(lats):.0f}ms  avg={statistics.mean(lats):.0f}ms  "
            f"p50={p(50):.0f}ms  p95={p(95):.0f}ms  p99={p(99):.0f}ms  max={max(lats):.0f}ms"
        )

    # Error message breakdown
    all_errs = gas_fail + net_fail + http_fail
    if all_errs:
        err_map: dict[str, int] = defaultdict(int)
        for r in all_errs:
            key = r.error if r.error else f"HTTP {r.status}"
            err_map[key] += 1
        print(f"  │   Error breakdown:")
        for msg, cnt in sorted(err_map.items(), key=lambda x: -x[1])[:5]:
            print(f"  │     [{cnt:>3}x] {msg}")

    # Sample responses (submit & leaderboard saja)
    if is_sb_post or is_sb_get:
        ok_samples   = [(r.status, r.response) for r in truly_ok[:2]]
        fail_samples = [(r.status, r.response) for r in (http_fail + net_fail)[:2]]
        if ok_samples:
            print(f"  │   Sample SUKSES:")
            for st, body in ok_samples:
                print(f"  │     [HTTP{st}] {body[:100]}")
        if fail_samples:
            print(f"  │   Sample GAGAL:")
            for st, body in fail_samples:
                print(f"  │     [HTTP{st}] {body[:100]}")

    print(f"  └{'─' * 57}")
    print()
    return len(truly_ok), len(reqs)

# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────

async def main():
    # Guard: jangan jalankan jika key belum diisi
    if SUPABASE_ANON_KEY == "GANTI_DENGAN_ANON_KEY_DARI_SUPABASE_DASHBOARD":
        print("❌  ERROR: SUPABASE_ANON_KEY belum diisi!")
        print()
        print("    Cara mendapatkan anon key:")
        print("    1. Buka https://supabase.com → pilih project Anda")
        print("    2. Project Settings → API")
        print("    3. Salin nilai di baris 'anon  public' (BUKAN service_role)")
        print("    4. Tempel ke variabel SUPABASE_ANON_KEY di bagian CONFIG atas")
        return

    pool = build_endpoint_pool(TOTAL_REQUESTS)

    n_submit = sum(1 for ep in pool if ep.get("is_sb_post"))
    n_lb     = sum(1 for ep in pool if "leaderboard" in ep["label"])
    n_get    = TOTAL_REQUESTS - n_submit - n_lb

    print("=" * 65)
    print("  KSM-QM LOAD TEST  (Supabase-Direct Architecture)")
    print(f"  {TOTAL_REQUESTS} req · ramp-up {DURATION_SECONDS}s · concurrency {CONCURRENCY_LIMIT}")
    print(f"  ┌ Supabase POST  (submit)     : {n_submit:>3} req  ← write bottleneck")
    print(f"  ├ Supabase GET   (leaderboard): {n_lb:>3} req")
    print(f"  └ GAS + Vercel   (GET)        : {n_get:>3} req")
    print(f"  Sub-dept target : {TEST_SUBDEPT}")
    print(f"  NIK dummy range : LDTEST00001 – LDTEST{n_submit:05d}")
    print("=" * 65)
    print()
    print("  ⚠️  Setelah test selesai, hapus data dummy di Supabase:")
    print("     DELETE FROM assessment_responses WHERE nik LIKE 'LDTEST%';")
    print()

    sem        = asyncio.Semaphore(CONCURRENCY_LIMIT)
    connector  = aiohttp.TCPConnector(limit=CONCURRENCY_LIMIT, limit_per_host=60)
    interval   = DURATION_SECONDS / TOTAL_REQUESTS
    tasks: list = []
    start_wall = time.monotonic()

    async with aiohttp.ClientSession(connector=connector) as session:
        for i, ep in enumerate(pool):
            elapsed   = time.monotonic() - start_wall
            sleep_for = (i * interval) - elapsed
            if sleep_for > 0:
                await asyncio.sleep(sleep_for)
            tasks.append(asyncio.create_task(send_request(session, ep, sem)))

        print(f"  ✓ Semua {TOTAL_REQUESTS} request dijadwalkan — menunggu respons...")
        await asyncio.gather(*tasks)

    total_wall = time.monotonic() - start_wall

    # ─── PER-ENDPOINT REPORT ──────────────────────────────────
    print()
    print("=" * 65)
    print("  HASIL LOAD TEST")
    print("=" * 65)
    print(f"  Total waktu aktual    : {total_wall:.2f}s")
    print(f"  Total request selesai : {len(results)}")
    print()

    by_label: dict[str, list[Result]] = defaultdict(list)
    for r in results:
        by_label[r.label].append(r)

    total_ok  = 0
    total_all = 0
    for label, reqs in sorted(by_label.items()):
        ok, total = print_report(reqs, label)
        total_ok  += ok
        total_all += total

    # ─── SUMMARY ──────────────────────────────────────────────
    all_lats  = [r.latency_ms for r in results]
    fail_net  = sum(1 for r in results if r.status == 0)
    fail_gas  = sum(1 for r in results if r.status == -1)
    fail_http = sum(1 for r in results if r.status >= 400)
    rps       = len(results) / total_wall
    pct_ok    = 100 * total_ok // total_all if total_all else 0

    print(f"  ══ SUMMARY ══════════════════════════════════════════════")
    print(f"  Total request         : {total_all}")
    print(f"  ✅ Sukses              : {total_ok:>4}  ({pct_ok}%)")
    print(f"  ❌ GAS fail            : {fail_gas:>4}")
    print(f"  ❌ Network/Timeout     : {fail_net:>4}")
    print(f"  ❌ HTTP Error 4xx/5xx  : {fail_http:>4}")
    print(f"  Throughput            : {rps:.1f} req/s")
    if all_lats:
        sorted_lats = sorted(all_lats)
        p95 = sorted_lats[max(0, int(len(sorted_lats) * 0.95) - 1)]
        p99 = sorted_lats[max(0, int(len(sorted_lats) * 0.99) - 1)]
        print(f"  Avg latency           : {statistics.mean(all_lats):.0f} ms")
        print(f"  p95 latency           : {p95:.0f} ms")
        print(f"  p99 latency           : {p99:.0f} ms")
    print(f"  ════════════════════════════════════════════════════════")
    print()
    print("  ⚠️  CLEANUP — jalankan di Supabase SQL Editor:")
    print("     DELETE FROM assessment_responses WHERE nik LIKE 'LDTEST%';")
    print()


if __name__ == "__main__":
    asyncio.run(main())