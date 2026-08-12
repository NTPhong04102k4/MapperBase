# GitNexus – hướng dẫn sử dụng trong project Mapper

> Nguồn: repo gốc <https://github.com/abhigyanpatwari/GitNexus> + **CLI 1.6.9 đang cài trên máy này**
> (`D:\AppData\Local\nvm\v22.14.0\node_modules\gitnexus`). Mọi bảng cờ/lệnh dưới đây lấy từ
> `--help` của bản 1.6.9, không copy từ README bản `main` — README upstream đã lệch (thiếu
> `uninstall`, `index`, `doctor`, `remove`, `augment`, `publish`, và toàn bộ nhóm lệnh CLI
> `query/context/impact/trace/cypher/detect-changes/check`).
>
> Mục 12 là **kết quả chạy thật trên repo này**, gồm một hạn chế nghiêm trọng làm hỏng giả định
> của khối "GitNexus — Code Intelligence" trong `CLAUDE.md`. Đọc mục 12 trước khi tin `impact`.

---

## 1. GitNexus là gì và giải quyết vấn đề gì

GitNexus index codebase thành **knowledge graph** (đồ thị mã) rồi mở ra cho AI agent qua MCP
(Model Context Protocol) hoặc qua CLI. Mục đích: thay vì agent `grep` một tên hàm rồi đoán, nó
truy vấn được quan hệ thật — ai gọi ai, ai import ai, luồng thực thi nào đi qua hàm này.

| Việc cần làm | Không có GitNexus | Có GitNexus |
|---|---|---|
| "Sửa hàm này thì hỏng gì?" | grep tên hàm, đọc từng file, dễ sót | `impact` trả danh sách phụ thuộc theo độ sâu 1/2/3 + mức rủi ro |
| "Luồng đăng nhập chạy thế nào?" | mở 8 file lần theo import | `query` trả các *process* (luồng thực thi) kèm thứ tự bước |
| "A gọi tới B bằng đường nào?" | lần tay 3–8 chặng | `trace` trả đường ngắn nhất một lần gọi |
| "Diff hiện tại ảnh hưởng gì?" | đọc diff | `detect-changes` map hunk → symbol → luồng bị ảnh hưởng |

Kiến trúc: Node.js + tree-sitter parse AST, lưu vào **LadybugDB** (graph DB nhúng, file
`.gitnexus/lbug`), tìm kiếm BM25 (+ embedding nếu bật) — **toàn bộ chạy local**, không upload code.
Ngoại lệ duy nhất: `wiki` và `analyze --embeddings` với backend từ xa mới gọi mạng.

⚠️ **License: PolyForm Noncommercial 1.0.0.** Dùng trong công việc thương mại cần license riêng
(akonlabs.com). Đây là vấn đề pháp lý, không phải kỹ thuật — cần chốt trước khi bắt cả team dùng.

---

## 2. Trạng thái trên máy này (đo ngày 2026-08-11)

```
gitnexus -V                    → 1.6.9
node -v                        → v22.14.0
gitnexus status                → ✅ up-to-date (indexed commit 991094b == current)
```

Registry `~/.gitnexus/registry.json` có đúng một repo:

| Trường | Giá trị |
|---|---|
| name | `MapperBase` |
| files / nodes / edges | 205 / 1628 / 2879 |
| communities / processes | 47 / 89 |
| **embeddings** | **0** |
| branch | `chore/vscode-launch-makefile` |

Ba điều phải biết ngay:

1. **MCP chưa nối.** `claude mcp list` trên máy này chỉ có Figma, Google Drive, Gmail, Calendar —
   **không có `gitnexus`**. Nghĩa là các tool `impact/query/context/detect_changes` mà khối
   "Always Do" trong `CLAUDE.md` yêu cầu **không tồn tại trong session**. Hiện tại chỉ dùng được
   qua CLI. Cách nối: mục 3.2.
2. **`embeddings: 0`** → `query` đang chạy **BM25 thuần** (khớp từ khoá), không có tìm kiếm ngữ
   nghĩa. Hỏi bằng từ đồng nghĩa sẽ trượt; phải dùng đúng từ có trong code.
3. **`gitnexus doctor` crash** trên Node v22.14.0:
   ```
   SyntaxError: The requested module 'node:module' does not provide an export named 'registerHooks'
     at .../gitnexus/dist/core/embeddings/onnxruntime-node-resolver.js:54
   ```
   `registerHooks` chỉ có từ Node **22.15**. Nên `doctor` và nhánh embedding local không dùng được
   cho tới khi nâng Node. `analyze` thường và mọi lệnh truy vấn vẫn chạy bình thường.

---

## 3. Cài đặt và nối vào editor

### 3.1 Cài

```bash
npm install -g gitnexus@latest        # nên cài global: npx làm MCP khởi động rất chậm
npx gitnexus@latest analyze           # hoặc dùng một lần, không cài
```

Sự cố cài đặt đã biết (từ README upstream):

| Triệu chứng | Cách xử lý |
|---|---|
| npm 11 crash `node.target is null` khi `npx` | `npm i -g gitnexus` rồi chạy `gitnexus`, hoặc dùng `pnpm --allow-build=@ladybugdb/core --allow-build=gitnexus --allow-build=tree-sitter dlx gitnexus@latest analyze` ([#1939](https://github.com/abhigyanpatwari/GitNexus/issues/1939)) |
| Máy không có toolchain C++ | `GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1 npm i -g gitnexus@latest` (bỏ grammar Dart/Proto/Swift/Kotlin) |
| MCP khởi động chậm | cài global thay vì để `npx` tải lại mỗi lần |

### 3.2 Nối MCP (việc còn thiếu trên máy này)

Cách nhanh — tự dò editor đã cài (Claude Code, Cursor, OpenCode, Codex):

```bash
gitnexus setup
gitnexus setup -c claude-code        # chỉ cấu hình một editor
gitnexus uninstall                   # đảo ngược: xoá entry MCP + skills + hooks
```

Cấu hình tay cho Claude Code:

```bash
claude mcp add gitnexus -- npx -y gitnexus@latest mcp
# hoặc, khi đã cài global (nhanh hơn nhiều):
claude mcp add gitnexus -- gitnexus mcp
```

Cursor (`~/.cursor/mcp.json`), Antigravity (`~/.gemini/antigravity/mcp_config.json`):

```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "npx",
      "args": ["-y", "gitnexus@latest", "mcp"]
    }
  }
}
```

Codex: `codex mcp add gitnexus -- npx -y gitnexus@latest mcp`, hoặc `~/.codex/config.toml`:

```toml
[mcp_servers.gitnexus]
command = "npx"
args = ["-y", "gitnexus@latest", "mcp"]
```

MCP server từ xa (chỉ khi thật cần — mặc định là stdio, an toàn hơn):

```bash
gitnexus mcp                                     # stdio (mặc định)
gitnexus mcp --http -p 3000                      # Streamable HTTP tại POST /mcp
gitnexus mcp --http --host 0.0.0.0 --auth-token <tok>   # bind ngoài loopback BẮT BUỘC có token
```

> Sau khi đổi cấu hình MCP hoặc re-index, **phải restart Claude Code** để MCP server nạp lại index.

---

## 4. Index: chạy gì, sinh ra gì

```bash
gitnexus analyze                      # từ thư mục gốc repo
node .gitnexus/run.cjs analyze        # runner project-local (đã có trong repo này)
```

`run.cjs` là wrapper gitignore, tự chọn runner khả dụng (global `gitnexus` → `pnpm dlx` → `npx`),
nên không phụ thuộc package manager. Mất file này (clone mới, `git clean`) thì `npx gitnexus analyze`
sinh lại.

Pipeline 6 pha:

1. **Structure** – dựng cây file/folder.
2. **Parsing** – tree-sitter tách symbol.
3. **Resolution** – nối import, call, kế thừa giữa các file.
4. **Clustering** – gom nhóm chức năng bằng Leiden (repo này: 47 community).
5. **Processes** – lần luồng thực thi từ entry point (repo này: 89 process).
6. **Search** – dựng index BM25 (+ embedding nếu bật).

Sản phẩm ghi ra:

| Đường dẫn | Nội dung | Có commit? |
|---|---|---|
| `.gitnexus/lbug` | graph DB (~52 MB ở repo này) | không (gitignored) |
| `.gitnexus/meta.json`, `gitnexus.json` | metadata index | không |
| `.gitnexus/run.cjs` | runner local | không |
| `~/.gitnexus/registry.json` | registry toàn cục các repo | không |
| `CLAUDE.md` / `AGENTS.md` | **chèn/ghi đè block "GitNexus — Code Intelligence"** | có |
| `.claude/skills/gitnexus/*/SKILL.md` | 6 skill chuẩn (exploring, debugging, impact-analysis, refactoring, guide, cli) | có |
| `.claude/skills/generated/*` | skill sinh theo community (chỉ khi `--skills`) | có |

⚠️ `analyze` **sửa `CLAUDE.md`**. Sửa tay trong block đó sẽ bị mất ở lần analyze sau. Muốn giữ:
dùng `--skip-agents-md`, hoặc `--index-only` để không chèn gì cả.

### Cờ của `analyze` (bản 1.6.9)

| Cờ | Tác dụng |
|---|---|
| `-f, --force` | re-index toàn bộ dù đang up-to-date |
| `--repair-fts` | dựng lại index tìm kiếm FTS, không phân tích lại |
| `--embeddings [limit]` | bật embedding cho semantic search (mặc định tắt). `[limit]` ghi đè trần an toàn 50.000 node; `0` = bỏ trần |
| `--drop-embeddings` | xoá embedding cũ khi rebuild (mặc định `analyze` **giữ** embedding đã có) |
| `--pdg` | dựng tầng CFG/PDG (BasicBlock + CFG edge) — điều kiện để dùng `explain`/`pdg_query` |
| `--skills` | sinh skill riêng theo community phát hiện được |
| `--skip-skills` | không cài 6 skill chuẩn |
| `--skip-agents-md` | không sửa block gitnexus trong `AGENTS.md`/`CLAUDE.md` |
| `--index-only` | chỉ index, không chèn bất kỳ file ngữ cảnh nào |
| `--no-stats` | bỏ số file/symbol (số dễ lệch) khỏi `CLAUDE.md` |
| `--default-branch <b>` | branch dùng làm `base_ref` trong ví dụ regression |
| `--branch <name>` | pin working tree vào slot index riêng theo branch (multi-branch) |
| `--skip-git` | index thư mục không phải git repo |
| `--name <alias>` | đăng ký repo dưới tên khác (khi hai repo trùng basename) |
| `--workers <n>` | số worker parse (mặc định `cores-1`, trần 16) |
| `--max-file-size <kb>` | bỏ file lớn hơn ngưỡng (mặc định 512, trần 32768) |
| `--worker-timeout <s>` | timeout idle của worker (mặc định 30) |
| `--embedding-device <d>` | `auto` / `cpu` / `dml` / `cuda` / `wasm` |
| `--embedding-base-url <url>` / `--embedding-model <m>` | dùng embedding server OpenAI-compatible (vd Ollama `http://host:11434/v1`) |
| `-v, --verbose` | log file bị bỏ qua |

**Khi nào chạy lại:** lần đầu; sau khi đổi nhiều code; khi resource `context` báo stale. Trong
Claude Code có PostToolUse hook phát hiện stale sau `git commit`/`git merge` và **nhắc** agent chạy
analyze — hook **không** tự chạy, để tránh treo agent 120s và làm hỏng DB nếu timeout.

---

## 5. Toàn bộ lệnh CLI (1.6.9)

| Lệnh | Việc |
|---|---|
| `setup` / `uninstall` | cấu hình / gỡ MCP + skills + hooks cho các editor |
| `analyze [path]` | index repo |
| `index [path...]` | đăng ký `.gitnexus/` đã có vào registry (không phân tích lại) |
| `status` | tình trạng index của repo hiện tại |
| `list` | liệt kê mọi repo đã index |
| `clean` | xoá index của repo hiện tại (`--force`, `--all`) |
| `remove <target>` | xoá index của repo đã đăng ký theo alias/name/path — không cần đứng trong repo |
| `doctor` | năng lực runtime + cấu hình embedding (**đang crash, xem mục 2**) |
| `serve` | HTTP server cho web UI |
| `mcp` | chạy MCP server |
| `wiki [path]` | sinh tài liệu bằng LLM từ graph |
| `augment <pattern>` | bổ sung ngữ cảnh graph cho một pattern tìm kiếm (dùng bởi hook) |
| `publish` | thông báo registry `understand-quickly` (opt-in, cần token) |
| `query`, `context`, `impact`, `trace`, `cypher`, `detect-changes`, `check` | bản CLI của các MCP tool — **dùng được khi chưa nối MCP** |
| `group ...` | quản lý group multi-repo |
| `eval-server` | HTTP server nhẹ cho tool call khi đánh giá |

Cờ dùng chung cho nhóm truy vấn: `-r, --repo <name>` (chọn repo khi registry có nhiều),
`--branch <name>` (chọn slot index theo branch), `-l, --limit <n>`.

---

## 6. Bốn vòng lặp dùng hằng ngày

Mỗi vòng lặp dưới đây ghi cả **CLI** (dùng ngay được) và **MCP tool** (sau khi `gitnexus setup`).

### 6.1 Hiểu code lạ / kiến trúc

```
1. đọc  gitnexus://repo/MapperBase/context      → tổng quan + cảnh báo stale
2. query   {search_query: "<khái niệm>"}        → các luồng thực thi liên quan
3. context {name: "<symbol>"}                   → caller/callee/luồng của một symbol
4. đọc  gitnexus://repo/MapperBase/process/<name>  → trace từng bước
5. đọc source để xác nhận
```

```bash
gitnexus query -q "biometric login unlock" -l 3
gitnexus context loadProfileAndPermissions
```

### 6.2 Trước khi sửa một symbol (bắt buộc theo `CLAUDE.md`)

```bash
gitnexus impact performLogout -d upstream --depth 3
gitnexus impact performLogout --summary-only        # chỉ số đếm + risk
```

Đọc kết quả:

| Độ sâu | Ý nghĩa |
|---|---|
| d=1 | **CHẮC CHẮN HỎNG** — caller/importer trực tiếp |
| d=2 | có khả năng ảnh hưởng |
| d=3 | nên chạy test |

| Phạm vi ảnh hưởng | Rủi ro |
|---|---|
| <5 symbol, ít process | LOW |
| 5–15 symbol, 2–5 process | MEDIUM |
| >15 symbol hoặc nhiều process | HIGH |
| đường tới hạn (auth, payment) | CRITICAL |

⚠️ Với repo này con số `impact` **thấp hơn thực tế rất nhiều** — xem mục 12.1.

### 6.3 Debug

```bash
gitnexus query -q "payment polling timeout"
gitnexus context watchPolling
gitnexus trace loginWithCredentialsSaga applyPermissionRules   # A tới B bằng đường nào
```

| Triệu chứng | Cách tiếp cận |
|---|---|
| có message lỗi | `query` theo text lỗi → `context` chỗ throw |
| trả về sai giá trị | `context` → lần callee để theo dòng dữ liệu |
| lỗi chập chờn | `context` → tìm call ra ngoài / phụ thuộc async |
| chậm | `context` → symbol có nhiều caller = hot path |
| regression mới | `detect-changes` |
| "A tới B thế nào?" | `trace` |

`trace` khi không có đường đi sẽ báo **node xa nhất còn tới được** — đúng chỗ chuỗi bị đứt (dynamic
dispatch, reflection, hoặc biên external).

### 6.4 Refactor và trước khi commit

```bash
# rename: xem trước rồi mới áp dụng (chỉ có ở MCP tool `rename`, CLI chưa expose)
rename {symbol_name: "old", new_name: "new", dry_run: true}
#   → tách 2 loại edit: graph (tin được) và text_search (phải soát tay)

gitnexus detect-changes -s unstaged            # unstaged | staged | all | compare
gitnexus detect-changes -s compare -b main     # so với default branch
gitnexus check --cycles                        # vòng import (đọc mục 12.2 trước khi tin)
```

Thứ tự cập nhật khi refactor: interface → implementation → caller → test.

---

## 7. 17 MCP tool ↔ lệnh CLI

| MCP tool | Việc | CLI tương đương |
|---|---|---|
| `query` | tìm kiếm hybrid (BM25 + semantic + RRF), gom theo process | `gitnexus query` |
| `context` | góc nhìn 360° của một symbol | `gitnexus context` |
| `impact` | bán kính ảnh hưởng + confidence | `gitnexus impact` |
| `trace` | đường ngắn nhất giữa 2 symbol | `gitnexus trace` |
| `detect_changes` | map git diff → symbol → luồng | `gitnexus detect-changes` |
| `check` | kiểm bất biến cấu trúc (vd vòng import) | `gitnexus check` |
| `rename` | rename đa file có confidence | — |
| `cypher` | truy vấn graph thô | `gitnexus cypher` |
| `route_map` | route API ↔ component/hook gọi nó | — |
| `shape_check` | lệch shape response (key route trả vs key consumer đọc) | — |
| `api_impact` | báo cáo trước khi đổi một route | — |
| `tool_map` | định nghĩa tool MCP/RPC và file xử lý | — |
| `explain` | taint finding source→sink (**cần `analyze --pdg`**) | — |
| `pdg_query` | phụ thuộc điều khiển/dữ liệu (CDG, REACHING_DEF) | `gitnexus impact --mode pdg --line <n>` |
| `list_repos` | liệt kê repo đã index (phân trang `limit`≤200/`offset`) | `gitnexus list` |
| `group_list` / `group_sync` | group multi-repo, dựng lại Contract Registry | `gitnexus group list` / `sync` |

MCP resource (đọc rẻ, ~100–500 token):

| Resource | Nội dung |
|---|---|
| `gitnexus://repos` | danh sách repo |
| `gitnexus://setup` | hướng dẫn setup |
| `gitnexus://repo/{name}/context` | thống kê + kiểm stale |
| `gitnexus://repo/{name}/clusters` · `/cluster/{name}` | vùng chức năng + thành viên |
| `gitnexus://repo/{name}/processes` · `/process/{name}` | luồng thực thi + trace từng bước |
| `gitnexus://repo/{name}/schema` | schema để viết Cypher |

MCP prompt: `detect_impact` (phân tích trước commit), `generate_map` (tài liệu kiến trúc + Mermaid).

`explain` / `pdg_query` trên index **không** có `--pdg` sẽ trả ghi chú "không có tầng taint/PDG" —
và cần nhớ: closure/callback, truy cập thuộc tính và luồng ngầm **không** được mô hình hoá, nên
"không có finding" **không** đồng nghĩa với an toàn.

---

## 8. Cypher: schema thật đo được trên index này

Node label và số lượng (`MATCH (n:Label) RETURN count(*)`):

| Label | Số |
|---|---|
| File | 205 |
| Folder | 84 |
| Function | 383 |
| Method | 115 |
| Class | 23 |
| Interface | 1 |
| Community | 45 |
| Process | 89 |
| CodeElement | 0 |

Quan hệ đi qua một bảng duy nhất `CodeRelation`, phân biệt bằng `r.type`:

| type | Số |
|---|---|
| DEFINES | 679 |
| CONTAINS | 559 |
| IMPORTS | 397 |
| CALLS | 378 |
| STEP_IN_PROCESS | 285 |
| MEMBER_OF | 242 |
| HAS_METHOD | 143 |
| ACCESSES | 106 |
| HAS_PROPERTY | 90 |

Các type khác có trong schema nhưng **0 dòng** ở index này: `EXTENDS`, `IMPLEMENTS`,
`METHOD_OVERRIDES`, `METHOD_IMPLEMENTS`, `HANDLES_ROUTE`, `FETCHES`, `HANDLES_TOOL`,
`ENTRY_POINT_OF`, `WRAPS`, `QUERIES`, `INJECTS`, và nhóm chỉ có khi `--pdg` (`CFG`, `REACHING_DEF`,
`TAINTED`, `SANITIZES`, `TAINT_PATH`, `CDG`).

Hai điểm cú pháp đã va phải (LadybugDB, không phải Neo4j):

```cypher
-- SAI: labels(n) trả rỗng, n._label không bind được
MATCH (n) RETURN labels(n)[0], count(*)          -- → cột label rỗng
MATCH (n) RETURN n._label                        -- → Binder exception: Cannot find property _label

-- ĐÚNG: chỉ định label trong pattern
MATCH (n:Function) RETURN count(*) AS c
MATCH (a)-[r:CodeRelation]->(b)
WHERE r.type = 'CALLS' AND b.name = 'performLogout'
RETURN a.name AS src, a.filePath AS f
```

Node có một tập property phẳng dùng chung cho mọi label (`id`, `name`, `filePath`, `content`,
`startLine`, `endLine`, `isExported`, `parameterCount`, `returnType`, `cohesion`, `processType`,
`method`, `responseKeys`, `embedding`, …), phần không áp dụng thì `null`. Đọc
`gitnexus://repo/MapperBase/schema` trước khi viết Cypher phức tạp.

---

## 9. Cấu hình

### `.gitnexusrc` (JSON, đặt ở gốc repo)

```json
{
  "defaultBranch": "develop",
  "skipAgentsMd": true,
  "skipSkills": true,
  "embeddings": true,
  "workerTimeout": 60
}
```

Repo này **chưa có** `.gitnexusrc`. Nếu không muốn `analyze` sửa `CLAUDE.md` nữa thì thêm file với
`"skipAgentsMd": true` — bền hơn là phải nhớ truyền cờ mỗi lần.

### Biến môi trường

| Biến | Mặc định | Tác dụng |
|---|---|---|
| `GITNEXUS_WORKER_POOL_SIZE` | cores−1, trần 16 | số worker parse |
| `GITNEXUS_MAX_FILE_SIZE` | 512 KB | ngưỡng bỏ file |
| `GITNEXUS_WORKER_SUB_BATCH_TIMEOUT_MS` | 30000 | timeout worker |
| `GITNEXUS_VERBOSE` | – | log file bị bỏ qua + throughput |
| `GITNEXUS_FTS_STEMMER` | `porter` | stemmer BM25 — đặt `none` cho CJK |
| `GITNEXUS_SKIP_OPTIONAL_GRAMMARS` | – | `=1` bỏ grammar Dart/Proto/Swift/Kotlin **(sẽ mất phần native Kotlin/Swift của repo này khỏi graph)** |
| `GITNEXUS_MCP_READ_ONLY` | – | `=1` chỉ expose surface read-only (không có `rename`) |
| `GITNEXUS_MCP_ALLOWED_REPOS` | – | allowlist repo, phân tách bằng dấu phẩy |
| `GITNEXUS_MCP_DEFAULT_REPO` | – | repo mặc định khi gọi tool không nêu repo |
| `GITNEXUS_MCP_AUTH_TOKEN` | – | bearer token cho `mcp --http` |
| `GITNEXUS_AUTH_TOKEN` | – | bearer token cho `eval-server` không loopback |

Ngôn ngữ được hỗ trợ: TypeScript, JavaScript, Python, Java, Kotlin, C#, Go, Rust, PHP, Ruby, Swift,
C, C++, Dart — mức độ hỗ trợ import/type annotation/kế thừa/constructor khác nhau theo ngôn ngữ.
Với repo này nghĩa là cả `src/` (TS/TSX), `android/` (Kotlin) và `ios/` (Swift) đều vào graph.

---

## 10. Sinh wiki bằng LLM

```bash
gitnexus wiki                                  # cần API key, lưu vào ~/.gitnexus/config.json
gitnexus wiki --provider claude --model claude-opus-5
gitnexus wiki --lang vietnamese                # ép ngôn ngữ đầu ra
gitnexus wiki --review                         # dừng sau khi gom nhóm để soát cấu trúc module
gitnexus wiki --force --concurrency 5
gitnexus wiki --gist                           # publish thành public Gist
```

Provider hỗ trợ: `openai`, `openrouter`, `azure`, `custom`, `cursor`, `claude`, `codex`, `opencode`.
Model mặc định `minimax/minimax-m2.5`. Với Azure dùng `--base-url https://{res}.openai.azure.com/openai/v1`
và `--api-version`; model reasoning (o1/o3/o4-mini) thêm `--reasoning-model`.

⚠️ `wiki` **gửi code lên LLM provider**. Không chạy với repo có mã nhạy cảm nếu chưa được duyệt.
`--gist` thì publish công khai — chỉ dùng khi thật sự muốn.

---

## 11. Group multi-repo (khi có backend riêng)

```bash
gitnexus group create mapper
gitnexus group add mapper mapper/mobile MapperBase
gitnexus group add mapper mapper/api    MapperApi
gitnexus group sync mapper            # dựng Contract Registry (link HTTP contract giữa repo)
gitnexus group status mapper
gitnexus group contracts mapper
gitnexus group impact mapper --target <symbol> --repo <path>
gitnexus group query mapper "<query>"
```

Dùng khi muốn biết đổi một endpoint ở backend thì mobile hỏng chỗ nào. `trace` cũng nhận
`repo: "@groupName"` để đi xuyên **một** biên `ContractLink`. Phải `group sync` lại sau khi sửa
`group.yaml` hoặc sau khi một repo thành viên được re-index.

---

## 12. Cạm bẫy — kiểm chứng trên repo này

### 12.1 `impact` bỏ sót toàn bộ tầng saga ⚠️ nghiêm trọng nhất

```bash
$ gitnexus impact performLogout --summary-only
{ "impactedCount": 0, "risk": "LOW", "epistemic": "exact", "summary": {"direct": 0} }
```

Nhưng `performLogout` **có hai chỗ gọi thật**:

```
src/features/auth/store/authSaga.ts:228   yield call(performLogout);   // logoutSaga
src/features/auth/store/authSaga.ts:238   yield call(performLogout);   // sessionExpiredSaga
```

Và `gitnexus context logoutSaga` trả `incoming: {}`, `outgoing: {}`, `processes: []`.

**Cơ chế:** GitNexus chỉ ghi cạnh `CALLS` cho cú pháp gọi trực tiếp `fn(...)`. Trong
`authSaga.ts` nó bắt được `isBiometricUnlockEnabled()` (dòng 86, gọi thẳng), `describeError(error)`,
`isCancellation(error)`, `getDeviceId()` — nhưng **không** bắt `yield call(bootstrapAuth)` hay
`yield call(performLogout)`, vì ở đó hàm là **tham số**, không phải callee. Kiểm chứng:

```cypher
MATCH (a)-[r:CodeRelation]->(b)
WHERE r.type='CALLS' AND a.filePath='src/features/auth/store/authSaga.ts'
RETURN a.name, b.name
-- 10 dòng, không có một `call(...)` nào
```

**Hệ quả cho repo này:** kiến trúc chốt là *mọi side-effect đi qua saga* (thunk đã tắt). Nghĩa là
phần logic bất đồng bộ quan trọng nhất — `yield call`, `yield put`, `takeLatest`, `fork`, `race` —
**vô hình với call graph**. `impactedCount: 0` ở đây **không** có nghĩa "an toàn khi sửa", dù trường
`epistemic` ghi `"exact"`.

**Cách làm việc đúng:** coi `impact` là *sàn dưới*, không phải câu trả lời. Với symbol nằm trong
service/saga, luôn kiểm tra chéo bằng grep tên symbol trước khi kết luận. Quy tắc "MUST run impact
analysis before editing any symbol" trong `CLAUDE.md` vẫn nên làm, nhưng **kết quả LOW phải được
xác minh lại bằng tay**.

### 12.2 `check --cycles` có false positive

```bash
$ gitnexus check --cycles
android/.../MapperPackage.kt -> android/.../auth/ForgeRockAuthModule.kt -> MapperPackage.kt
src/shared/contexts/ThemeContext.tsx -> src/shared/theme/index.ts -> ThemeContext.tsx
src/shared/permissions/ability.ts -> src/shared/permissions/types.ts -> ability.ts
```

Soát từng cái:

| Vòng báo | Thực tế |
|---|---|
| ThemeContext ↔ theme/index | **THẬT.** `theme/index.ts:74` re-export `useTheme, useThemeMode` từ `../contexts/ThemeContext`, còn ThemeContext import token từ `theme/index`. Vòng barrel kinh điển. |
| ability.ts ↔ types.ts | **SAI.** `types.ts` chỉ import từ package ngoài `@casl/ability`; nó **không** import `./ability`. GitNexus phân giải specifier `@casl/ability` thành file local `./ability.ts` vì trùng tên. |
| MapperPackage.kt ↔ ForgeRockAuthModule.kt | **SAI.** `ForgeRockAuthModule.kt` chỉ `import com.mapper.BuildConfig`; nó không tham chiếu `MapperPackage`. Cạnh sinh ra do phân giải import theo package `com.mapper`. |

→ Import trùng tên với file local (rất dễ gặp: `@casl/ability`, `@react-native-firebase/app`,
`react-native-keychain`) sinh cạnh ma. **Luôn soát tay từng vòng trước khi "sửa" gì.**

### 12.3 `run.cjs` cắt nhỏ tham số nhiều từ trên Windows

```
$ node .gitnexus/run.cjs query -q "biometric login unlock"
error: too many arguments for 'query'. Expected 1 argument but got 2: login, unlock.

$ gitnexus query -q "biometric login unlock"        # binary global: chạy đúng
{ "processes": [ ... ] }
```

Wrapper `run.cjs` làm mất dấu ngoặc kép. Trên Windows: **dùng binary global `gitnexus`** cho mọi
lệnh có tham số nhiều từ; `run.cjs` chỉ dùng cho lệnh một từ hoặc không tham số (`analyze`,
`status`).

### 12.4 Những cái còn lại

| Vấn đề | Xử lý |
|---|---|
| `doctor` crash, embedding local không chạy | nâng Node lên ≥ 22.15 (`registerHooks`) |
| `embeddings: 0` → `query` chỉ khớp từ khoá | `gitnexus analyze --embeddings`, hoặc trỏ `--embedding-base-url` sang Ollama |
| Index stale sau commit | `gitnexus analyze` (hook chỉ **nhắc**, không tự chạy) |
| MCP vẫn báo stale sau khi analyze | **restart Claude Code** để MCP nạp lại |
| `analyze` ghi đè block trong `CLAUDE.md` | `--skip-agents-md` hoặc `.gitnexusrc: {"skipAgentsMd": true}` |
| "Not inside a git repository" | chạy từ trong repo, hoặc `--skip-git` |
| Index hỏng | `gitnexus clean --force` rồi `analyze` |
| Xuất `--summary-only`, `-l`, `--offset` | dùng khi output JSON quá dài; `impact` mặc định `-l 100` mỗi mức độ sâu |

---

## 13. Ranh giới: khi nào tin GitNexus, khi nào không

**Tin được:**

- Bản đồ file/folder, danh sách symbol và vị trí `file:line` (từ AST, chính xác).
- Cạnh `IMPORTS` giữa file nội bộ — trừ trường hợp trùng tên package ở 12.2.
- `CALLS` cho lời gọi trực tiếp `fn()` và method của class.
- `query` để **định vị** nhanh vùng code liên quan tới một từ khoá.

**Không tin được nếu chưa xác minh:**

- `impact = 0` / `risk = LOW` với code trong saga, service, hay bất cứ chỗ nào truyền hàm như giá
  trị (`call(fn)`, `map(fn)`, callback, DI). Xem 12.1.
- Vòng import từ `check --cycles`. Xem 12.2.
- "Không có taint finding" ⇒ **không** phải là an toàn (closure/property/luồng ngầm không được mô
  hình hoá, và index này chưa có `--pdg`).
- Quan hệ chạy động: deep link, registry modal (`app/modals/registry.tsx`), `NativeModules[...]`,
  navigation theo tên route — graph không thấy.

Nói cách khác: GitNexus rút ngắn bước **tìm**, không thay thế bước **đọc**. Kết luận cuối cùng vẫn
phải dựa trên source đọc bằng `Read`, đúng nguyên tắc trong `TurioldBase.md`.

---

## 14. Checklist

**Dựng lần đầu trên máy mới**

```
[ ] npm install -g gitnexus@latest        (Node >= 22.15)
[ ] gitnexus analyze                      (từ gốc repo)
[ ] gitnexus setup -c claude-code         → xác nhận bằng `claude mcp list`
[ ] restart Claude Code
[ ] đọc gitnexus://repo/MapperBase/context để chắc index đã nạp
```

**Trước khi sửa một symbol**

```
[ ] gitnexus impact <symbol> -d upstream
[ ] nếu kết quả LOW/0 → grep tên symbol để xác minh (bẫy 12.1)
[ ] báo người dùng nếu HIGH/CRITICAL
[ ] không rename bằng find-and-replace — dùng tool `rename` với dry_run trước
```

**Trước khi commit**

```
[ ] gitnexus detect-changes -s all
[ ] gitnexus detect-changes -s compare -b main   (soát regression)
[ ] yarn lint && yarn tsc && yarn test           (cổng thật của repo)
[ ] gitnexus analyze                             (nếu diff lớn, để index không stale)
```
