# Superpowers – hướng dẫn dùng trong project Mapper

> Plugin `superpowers@claude-plugins-official` **v6.2.0** (tác giả Jesse Vincent / `obra`, MIT).
> Nguồn đọc: bản đã cài trên máy này —
> `C:\Users\phong\.claude\plugins\cache\claude-plugins-official\superpowers\6.2.0`
> (commit `44c9b2d`, cài 2026-08-11 19:12), **không** copy từ README trên GitHub.
>
> Đây **không phải một tool** như GitNexus hay `sr`. Nó là một **bộ quy trình làm việc** gồm 14 skill
> mà agent tự động áp vào, có nhiều "cổng chặn" (hard gate) và luật tuyệt đối (iron law). Vì vậy nó
> **chồng lấn và xung đột** với `sr` (skillrunner) và với `CLAUDE.md` của repo — mục 8 xử lý chỗ này.
> Đọc mục 2 trước: **hiện tại plugin chưa hoạt động trong session đang mở.**

---

## 1. Nó làm gì

Vòng đời một tính năng, theo Superpowers:

```
Yêu cầu của bạn
   │
   ├─▶ brainstorming            hỏi từng câu một, đề xuất 2–3 phương án, chốt design
   │                            ⛔ HARD GATE: chưa được viết một dòng code nào
   │                            → ghi spec vào docs/superpowers/specs/<ngày>-<chủ đề>-design.md + commit
   │
   ├─▶ writing-plans            biến spec thành plan từng bước 2–5 phút, có sẵn code + lệnh test
   │                            → ghi vào docs/superpowers/plans/<ngày>-<tên>.md
   │
   ├─▶ subagent-driven-development   (khuyến nghị) mỗi task một subagent mới + review 2 tầng
   │   hoặc executing-plans          (chạy tuần tự trong session hiện tại)
   │        └─ mỗi task đi qua test-driven-development
   │
   ├─▶ requesting-code-review  →  receiving-code-review
   │
   └─▶ finishing-a-development-branch   merge local / tạo PR / giữ nguyên
```

Xuyên suốt có hai skill "phanh":

- **`verification-before-completion`** — cấm nói "xong / đã sửa / test pass" nếu chưa chạy lệnh
  chứng minh **trong chính message đó**.
- **`systematic-debugging`** — cấm đề xuất fix trước khi tìm ra nguyên nhân gốc.

Triết lý cốt lõi: TDD thật (đỏ trước, xanh sau), YAGNI, DRY, commit thường xuyên, và **bằng chứng
trước khi tuyên bố**.

---

## 2. Trạng thái trên máy này (đo 2026-08-11)

| Kiểm tra | Kết quả |
|---|---|
| `~/.claude/plugins/installed_plugins.json` | `superpowers@claude-plugins-official` 6.2.0, scope `user` |
| `~/.claude/settings.json` → `enabledPlugins` | `"superpowers@claude-plugins-official": true` |
| Marketplace | `anthropics/claude-plugins-official` (github) |
| Số skill | **14** (`skills/*/SKILL.md`, tổng 3.185 dòng) |
| Commands / Agents | **không có** — plugin chỉ gồm skills + 1 hook |
| Claude Code | 2.1.227 (đủ điều kiện `"shell": "bash"`, cần ≥ 2.1.81) |
| Chạy thử hook | `bash hooks/run-hook.cmd session-start` → JSON `hookSpecificOutput` đúng định dạng, exit 0 ✅ |
| **Gọi thử `Skill(superpowers:using-superpowers)`** | ❌ **`Unknown skill`** |

**Kết luận: plugin đã cài và đã bật, nhưng session đang mở không thấy nó.** Claude Code nạp
danh sách skill của plugin **lúc khởi tạo session**, còn plugin được cài lúc 19:12 — sau khi session
này bắt đầu. Muốn dùng: xem mục 3.

---

## 3. Kích hoạt và kiểm chứng

```
1. Thoát Claude Code rồi mở lại  (thử `/clear` trước — hook khớp matcher "startup|clear|compact",
                                  nếu `/clear` chưa đủ thì restart hẳn)
2. Xem lại danh sách plugin:      /plugin
3. Kiểm chứng thật:               yêu cầu agent gọi `superpowers:brainstorming`
                                  — chạy được nghĩa là đã nạp; báo `Unknown skill` là chưa
```

Dấu hiệu plugin đã hoạt động: ngay đầu session agent nhận được block
`<EXTREMELY_IMPORTANT> You have superpowers ...` do hook `SessionStart` bơm vào — đó là **toàn bộ nội
dung** skill `using-superpowers`, không phải một dòng thông báo.

### Hook trên Windows — cơ chế và một cái bẫy

`hooks/hooks.json` khai:

```json
{ "hooks": { "SessionStart": [ { "matcher": "startup|clear|compact",
  "hooks": [ { "type": "command",
    "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
    "shell": "bash", "async": false } ] } ] } }
```

`run-hook.cmd` là script **polyglot**: Windows đọc phần batch ở đầu, còn shell Unix coi phần đó là
heredoc no-op rồi chạy tiếp phần dưới. Script hook đặt tên **không có đuôi** (`session-start`, không
phải `session-start.sh`) là có chủ ý — Claude Code trên Windows tự chèn `bash` vào trước mọi lệnh có
chứa `.sh`, làm hỏng dispatcher.

⚠️ Cái bẫy trên **máy này**: nhánh batch của `run-hook.cmd` dò bash theo thứ tự
`C:\Program Files\Git\bin\bash.exe` → `C:\Program Files (x86)\...` → `where bash`. Máy này cài Git ở
`D:\Program Files\Git\`, nên hai đường đầu **trượt**, và `where bash` trả
`C:\Windows\System32\bash.exe` = **bash của WSL** — WSL không hiểu đường dẫn kiểu `C:\Users\...` nên
hook sẽ chết. Không thành vấn đề vì `"shell": "bash"` (Claude Code ≥ 2.1.81, ở đây 2.1.227) đã ép đi
đường Git Bash, bỏ qua nhánh batch — và tôi đã chạy thử đúng đường đó, exit 0. Nhưng nếu sau này hook
im lặng không bơm gì, đây là nơi cần soi đầu tiên. (Khi không tìm được bash, script **thoát im lặng**,
không báo lỗi — plugin vẫn "đã cài" nhưng mất phần tự kích hoạt.)

---

## 4. 14 skill và khi nào chúng tự bật

| Skill | Tự bật khi | Điểm cần biết |
|---|---|---|
| `using-superpowers` | mọi đầu session (hook bơm sẵn) | Luật: nếu thấy **1% khả năng** một skill áp dụng được thì **buộc phải** gọi nó, trước cả khi hỏi lại hay đọc file |
| `brainstorming` | **trước mọi việc sáng tạo**: thêm tính năng, dựng component, đổi hành vi | HARD GATE: không code cho tới khi bạn duyệt design. Kể cả việc "nhỏ xíu" |
| `writing-plans` | có spec, việc nhiều bước, trước khi chạm code | Plan không được có "TBD"/"tương tự Task N"; mỗi step là 1 hành động 2–5 phút |
| `executing-plans` | thi hành plan tuần tự trong một session | Blocker thì **dừng và hỏi**, không đoán |
| `subagent-driven-development` | thi hành plan có các task độc lập, ở lại session này | Mỗi task 1 subagent mới + review 2 tầng; có ledger chống mất dấu sau compaction |
| `dispatching-parallel-agents` | có ≥2 việc độc lập, không chia state | Chạy song song rồi hợp nhất |
| `test-driven-development` | trước khi viết code cho bất kỳ feature/bugfix | Iron law: **không có code production nào trước một test đang đỏ**. Viết code trước test → **xoá đi làm lại** |
| `systematic-debugging` | mọi bug, test đỏ, hành vi lạ | Iron law: không fix trước khi xong Phase 1 (đọc kỹ lỗi → tái hiện → soi thay đổi gần đây → chèn log ở từng biên component) |
| `verification-before-completion` | trước mọi câu "xong/đã sửa/pass", trước commit/PR | Iron law: chưa chạy lệnh trong message này thì không được nói nó pass |
| `requesting-code-review` | xong task lớn, trước khi merge | |
| `receiving-code-review` | nhận feedback review | Cấm đồng ý cho có; feedback vô lý thì phải phản biện có dẫn chứng |
| `using-git-worktrees` | bắt đầu việc cần tách khỏi workspace hiện tại | Ưu tiên tool native của harness (`EnterWorktree`), chỉ fallback `git worktree add` khi không có |
| `finishing-a-development-branch` | code xong, test xanh, cần chốt cách hợp nhất | Verify test → chọn merge local / PR / giữ nguyên → dọn worktree |
| `writing-skills` | tạo/sửa skill mới | Dùng khi muốn tự viết skill cho repo này |

Thứ tự ưu tiên khi nhiều skill cùng áp dụng: **skill quy trình đi trước** rồi mới tới skill thực thi.
"Làm X đi" → `brainstorming` trước. "Sửa bug này" → `systematic-debugging` trước.

---

## 5. Ba "iron law" đáng chú ý nhất

### 5.1 TDD — xoá code viết trước test

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Đã viết code trước test thì **xoá**, không giữ làm "tham khảo", không "chỉnh lại cho khớp test".
Vòng lặp: RED (viết test) → **xem nó đỏ đúng lý do** → GREEN (code tối thiểu) → verify xanh →
REFACTOR → vẫn xanh. Ngoại lệ phải **hỏi bạn**: prototype dùng một lần, code sinh tự động, file config.

Với repo này: `yarn test` (Jest) chạy được nên phần `src/` áp TDD bình thường. Phần **native
Kotlin/Swift thì không** — không có test runner native, `Makefile` lại macOS-only. Biên thực tế: viết
test cho **wrapper JS** trong `shared/native/` (đã có sẵn mock ở `jest.setup.js`), còn code native tự
kiểm bằng build + chạy thiết bị.

### 5.2 Debug — không fix trước khi biết nguyên nhân

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Phase 1 bắt buộc: đọc hết stack trace; tái hiện ổn định (không tái hiện được thì **thu thập thêm dữ
liệu, không đoán**); soi thay đổi gần đây; và với hệ nhiều tầng thì **chèn log ở từng biên** rồi chạy
một lần để biết chỗ nào vỡ, trước khi phán.

Đúng ngay với vấn đề đang treo của repo: nghi vấn interop Android ở `docs/09` mục 12 hiện là **suy
luận từ source**, chưa có bằng chứng chạy thật. Theo skill này thì bước tiếp phải là chèn
`console.warn` + `adb logcat`, chứ không phải sửa `MapperPackage.kt` theo giả thuyết.

### 5.3 Verification — bằng chứng trước lời tuyên bố

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

Cổng 5 bước: xác định lệnh chứng minh → chạy **đầy đủ, mới** → đọc hết output + exit code → đối chiếu
→ mới được nói. Bảng "không đủ": "lint pass" **không** chứng minh build được; "agent báo success"
**không** chứng minh có thay đổi (phải xem diff); "test chạy một lần pass" **không** chứng minh
regression test đúng (phải revert fix, thấy nó đỏ, restore, thấy xanh).

Các từ bị coi là cờ đỏ: "should", "probably", "seems to", và cả "Great!/Perfect!/Done!" nói trước khi
verify.

---

## 6. Đường chạy bằng subagent (đắt, cần hiểu trước khi bật)

`subagent-driven-development` là đường được plugin khuyến nghị: mỗi task dispatch một subagent mới,
subagent tự implement + test + commit + self-review, rồi controller dispatch tiếp một reviewer.
Những điểm thực tế:

- **Ledger, không phải todo.** Tiến độ ghi ra file `<repo>/.superpowers/sdd/<tên-plan>/progress.md`.
  Lý do: ký ức hội thoại **không sống qua compaction**, và lỗi đắt nhất từng gặp là controller mất
  dấu rồi dispatch lại cả loạt task đã xong. Sau compaction phải tin ledger + `git log`, không tin
  ký ức. `git clean -fdx` sẽ xoá thư mục này (nó là scratch bị gitignore).
- **Chọn model theo việc, và phải khai rõ.** Task cơ học 1–2 file có spec đầy đủ → model rẻ nhất;
  nhiều file cần phối hợp → model tiêu chuẩn; thiết kế/kiến trúc và **review cuối toàn branch** →
  model mạnh nhất; fix loop vòng 4–5 → nâng ít nhất một bậc so với implementer bị kẹt. Không khai
  model = subagent thừa hưởng model của session (thường là đắt nhất) và triệt tiêu toàn bộ mục này.
  Lưu ý ngược lại: model rẻ nhất thường tốn **2–3× số lượt** cho việc nhiều bước nên tổng chi phí
  lại cao hơn — sàn khuyến nghị là model tầm trung, chỉ dùng model rẻ nhất khi plan đã chứa sẵn code.
- **Truyền artifact bằng file.** Mọi thứ paste vào prompt và mọi thứ subagent in ra sẽ **nằm lại
  trong context của controller suốt session** và bị đọc lại mỗi lượt.
- ⚠️ **Trong setup hiện tại của bạn có chỉ thị "không gọi AgentTool trừ khi người dùng yêu cầu".**
  Nghĩa là đường subagent **sẽ không tự chạy** — muốn dùng thì phải nói rõ ("dùng
  subagent-driven-development"). Không nói thì agent sẽ đi đường `executing-plans` (tuần tự).

---

## 7. Plugin ghi gì vào repo

| Đường dẫn | Nội dung | Nên làm gì |
|---|---|---|
| `docs/superpowers/specs/YYYY-MM-DD-<chủ đề>-design.md` | spec sau brainstorming, **được commit** | commit — đây là tài sản |
| `docs/superpowers/plans/YYYY-MM-DD-<tên>.md` | plan thi hành | commit |
| `.superpowers/sdd/<plan>/` | ledger, brief, report, review package | **thêm `.superpowers/` vào `.gitignore`** — hiện `.gitignore` của repo **chưa có** dòng này |
| worktree (nếu dùng) | workspace tách biệt | dọn ở bước `finishing-a-development-branch` |

Hai đường dẫn `docs/superpowers/...` là **mặc định**, và skill ghi rõ *"User preferences for spec
location override this default"*. Repo này đang theo quy ước `docs/NN-TEN-TAI-LIEU.md`. Muốn thống
nhất thì khai một dòng trong `CLAUDE.md`, ví dụ:

```markdown
Spec/plan của Superpowers đặt tại `docs/superpowers/{specs,plans}/` (giữ mặc định của plugin),
không đánh số theo hệ `docs/NN-`. Chỉ tài liệu kiến trúc do người viết mới dùng tiền tố số.
```

---

## 8. Xung đột với quy trình đang có — phần quan trọng nhất

Repo này đã có **hai** hệ chỉ dẫn: `sr` (skillrunner, khối managed trong `CLAUDE.md`) và GitNexus.
Superpowers chồng lên cả hai. Luật phân xử nằm trong chính `using-superpowers`:

> *User instructions (CLAUDE.md, AGENTS.md, …, direct requests) take precedence over skills, which
> in turn override default behavior.*

Tức là: **`CLAUDE.md` > skill của Superpowers > hành vi mặc định.** Bảng đối chiếu:

> Riêng phần commit / worktree / Jira, **§11.9 là kết luận cuối** (đã chốt cùng người dùng). Bảng dưới
> giữ lại để thấy vì sao, nhưng khi hai chỗ lệch nhau thì theo §11.9.

| Điểm | `sr` (skillrunner) | Superpowers | Xử lý cho repo này |
|---|---|---|---|
| Quyền commit | *"Never commit on your own — present changes and let the user decide"* | commit sau **mỗi** step TDD, "frequent commits" | **Chia hai giai đoạn** (§11.9 #3): commit **nháp** theo step TDD thì agent tự làm trong phiên; commit **thật** lên PR vẫn phải bạn duyệt |
| Lập kế hoạch | `plan-feature` `[needs approval]` → chỉ đề xuất rồi DỪNG | `brainstorming` → `writing-plans` (chi tiết hơn nhiều, có gate duyệt từng mục) | Dùng `brainstorming`+`writing-plans` cho tính năng mới; `plan-feature` cho việc nhỏ. Cả hai đều dừng chờ bạn nên không mâu thuẫn về bản chất |
| Hồ sơ dự án | `docs/project-profile.md` (đã cache, **không quét lại source**) | `brainstorming` bước 1 "explore project context" | Đọc `docs/project-profile.md` **trước**, đừng quét lại `src/` — tiết kiệm rất nhiều token |
| Chia commit | `commit` skill: tách theo module + Conventional Commit (+ tag Jira ở mặc định của skill) | commit từng step TDD | Gom theo module ở bước cuối (§11.9 #4), Conventional Commit **không** Jira (§11.9 #6) |
| Review diff | `check-diff` (theo convention của stack) | `requesting-code-review` (subagent review) | Chạy được cả hai; `check-diff` bắt vi phạm convention, review subagent bắt lỗi logic |
| Registry module | `update-module-registry` → `docs/module-registry.md` | không có | Giữ của `sr` |
| Impact trước khi sửa | — | — | Giữ của GitNexus (`CLAUDE.md` bắt buộc), **nhưng nhớ bẫy ở `docs/11` mục 12.1**: `impact` bỏ sót `yield call(...)` của saga |

**Thứ tự tôi đề xuất cho một tính năng mới trong repo này:**

```
0. git switch -c feat/<ten>          → không bắt đầu trên main (luật duy nhất giữ lại từ worktree)
1. sr status                         → xác nhận docs/project-profile.md còn dùng được
2. superpowers:brainstorming          → chốt design (đọc project-profile thay vì quét src/)
3. superpowers:writing-plans          → plan có step TDD dùng đúng `yarn test` / `npx jest`
4. gitnexus impact <symbol>           → trước khi sửa, + grep xác minh nếu kết quả LOW
5. superpowers:executing-plans        (hoặc subagent-driven-development nếu bạn yêu cầu rõ)
     ↳ mỗi step: test đỏ → code xanh → COMMIT NHÁP (agent tự làm, không hỏi)
6. superpowers:verification-before-completion  → yarn lint && yarn tsc && yarn test
7. gom nháp theo module               → git reset --soft $(git merge-base HEAD main) rồi commit lại
8. sr emit check-diff                 → soát convention
9. sr emit commit                     → message thật, trình diff, chờ bạn duyệt · KHÔNG push
```

Bước 6 chạy được ngay: cả ba cổng hiện xanh (`lint` 0 error / 30 warning · `tsc` sạch · `test` 24/24).
Trước đó `yarn lint` đỏ vì `.gitnexus/run.cjs` — file do tool sinh, không phải code app — nay đã bỏ qua
trong `eslint.config.js`. Bài học giữ lại: **tool nào sinh file `.js` vào repo cũng sẽ làm đỏ cổng
này**, vì gitignore và eslint-ignore là hai danh sách riêng (`docs/project-profile.md` §7).

---

## 9. Cạm bẫy và khi nào nên tắt

| Vấn đề | Thực tế |
|---|---|
| **Tốn token** | `using-superpowers` được bơm **nguyên văn** vào mỗi session start; các skill khác dài 60–680 dòng và nạp khi được gọi. `subagent-driven-development` một mình đã 503 dòng |
| **Gate cho việc bé** | `brainstorming` tự nhận là bắt buộc cả với "đổi một dòng config" và nói thẳng "This Is Too Simple To Need A Design" là anti-pattern. Sửa typo, bump version, thêm token màu → nên nói rõ "bỏ qua brainstorming, làm luôn" (skill cho phép: *"Only skip skill workflows when your human partner has explicitly told you to"*) |
| **Đòi worktree** | `executing-plans`/SDD muốn workspace tách biệt và **không cho bắt đầu trên `main`** nếu bạn không đồng ý rõ ràng. Bạn đang ở branch `chore/vscode-launch-makefile` nên không vướng |
| **Hook im lặng** | Không tìm thấy bash → thoát exit 0, không báo gì. Xem mục 3 |
| **Xoá code đã viết** | TDD iron law yêu cầu **xoá** code viết trước test. Nếu bạn không muốn thế trong một trường hợp cụ thể, phải nói trước |
| **Tắt tạm / gỡ** | `/plugin` → tắt `superpowers@claude-plugins-official`. Gỡ hẳn thì bỏ khỏi `enabledPlugins` trong `~/.claude/settings.json`. Cả hai đều **không** xoá file trong `docs/superpowers/` |

---

## 10. Checklist

**Bật lần đầu**

```
[ ] restart Claude Code (hoặc /clear)
[ ] /plugin → thấy superpowers@claude-plugins-official đang bật
[ ] nhờ agent gọi superpowers:brainstorming → không còn "Unknown skill"
[ ] thêm `.superpowers/` vào .gitignore
[ ] (tuỳ chọn) khai vị trí spec/plan trong CLAUDE.md nếu không muốn dùng docs/superpowers/
```

**Mỗi tính năng mới**

```
[ ] brainstorming → có spec được commit, BẠN đã duyệt
[ ] writing-plans → plan không còn TBD, mỗi step có lệnh test cụ thể
[ ] chọn executing-plans (mặc định) hay subagent-driven-development (phải yêu cầu rõ)
[ ] mỗi task: test đỏ → code → test xanh
[ ] verification: chạy `yarn lint && yarn tsc && yarn test`, dán output thật
[ ] sr emit check-diff → sr emit commit (không tự commit)
```

**Khi có bug**

```
[ ] systematic-debugging Phase 1 xong mới được đề xuất fix
[ ] hệ nhiều tầng (JS ↔ native, CI, HTTP) → chèn log ở từng biên rồi chạy một lần
[ ] regression test phải qua chu trình đỏ-xanh (revert fix, thấy đỏ, restore)
```

---

## 11. Commit: vì sao phải dày, và làm sao chắc một commit là đúng

> Mục này trả lời hai câu hỏi khác nhau thường bị gộp làm một: *vì sao Superpowers ép commit sau mỗi
> step TDD*, và *khi tách commit theo module thì lấy gì làm bằng chứng là commit đó đúng*.

### 11.1 Bốn lý do commit dày — lý do đầu là lý do đặc thù của agent

**1. Commit là bộ nhớ bền của agent.** `subagent-driven-development` ghi rõ: ký ức hội thoại
**không sống qua compaction**, và ledger + `git log` là bản đồ phục hồi — *"sau compaction phải tin
ledger và `git log` hơn ký ức của chính mình"*. Việc chưa commit là việc **không ai chứng minh được
là đã làm**. Với người thật, mất context là chuyện hiếm; với agent thì nó xảy ra giữa các task. Đây
là lý do Superpowers ép commit dày hơn mức một dev bình thường cần — không phải vì thẩm mỹ history.

**2. Commit xanh là điểm quay lại.** Mỗi step TDD kết thúc ở trạng thái test xanh, nên `git bisect`
chỉ được đúng step gây hỏng. Gộp thành một commit 40 file thì bisect chỉ trả lời "đâu đó trong 40
file này".

**3. Chu trình đỏ-xanh của regression test cần một mốc để revert.** Muốn chứng minh test mới thật sự
bắt được bug thì phải revert fix → thấy đỏ → restore → thấy xanh. Có commit thì đó là một lệnh
`git revert`/`git stash`; không có commit thì phải sửa tay ngược lại, và đó là chỗ dễ làm bẩn code nhất.

**4. Commit nhỏ mới review được.** Tiêu chí của `writing-plans` không phải "nhỏ cho đẹp" mà là:
*chỉ tách ở chỗ một reviewer có thể từ chối task này mà vẫn duyệt task bên cạnh*.

### 11.2 `commit` ≠ `push` ≠ history cuối cùng

Đây là chỗ hoà giải giữa Superpowers và `sr`. Hai luật không chống nhau vì chúng ở **hai giai đoạn**:

```
worktree/branch:  commit nháp dày (mỗi step TDD)  ──gom lại──▶  commit sạch theo module  ──▶  PR
      Superpowers quản giai đoạn này                      sr:commit quản giai đoạn này
```

Cách gom (dùng `reset --soft` vì `git rebase -i` **không chạy được** trong môi trường agent — mọi cờ
tương tác đều bị chặn):

```bash
git reset --soft $(git merge-base HEAD main)     # bỏ commit nháp, file giữ nguyên trong index
git restore --staged .                            # hạ toàn bộ xuống working tree để chọn lại
git add src/features/payment && git commit -m "feat(payment): ..."
git add src/shared/services/http && git commit -m "refactor(http): ..."
```

### 11.3 "Chính xác" là ba câu hỏi khác nhau

| Nghĩa | Kiểm bằng gì |
|---|---|
| **Tự đứng được** — checkout riêng commit đó thì cổng có xanh | chạy cổng **tại đúng commit đó**. Đây là bằng chứng máy móc duy nhất |
| **Đúng phạm vi** — không lẫn file của module khác | `git show --stat`, `git diff --name-only` |
| **Đúng ý định** — có làm đúng điều spec nói | không máy nào kiểm được; đây là việc của review |

Chỉ câu thứ nhất kiểm được tự động. Hai câu sau cần mắt người — nên đừng nhầm "test xanh" với
"commit đúng".

### 11.4 Chia theo module chỉ là gợi ý — tiêu chí thật là "tự đứng được"

`writing-plans` nói: *"Files that change together should live together"*, và gộp bước
setup/config/scaffolding vào chính task cần chúng. Trong repo này có ít nhất 5 chỗ mà tách theo
module sẽ sinh ra commit đỏ:

| Việc | Nếu tách theo module |
|---|---|
| Thêm một biến cấu hình | Phải sửa **cùng lúc** Android `BuildConfig` + iOS xcconfig + `NativeAppEnv` + `env.ts`. Tách thành 4 commit thì 3 commit giữa đều đỏ `tsc` |
| Thêm native module mới | Wrapper ở `shared/native/` mà thiếu mock trong `jest.setup.js` → **mọi** test chết ngay dòng import |
| Thêm chuỗi i18n | `vi.ts` mà chưa có `en.ts` → `TranslationSchema` làm `tsc` đỏ |
| Thêm token màu | `theme/colors.ts` phải có **cả** light và dark |
| Thêm query key mới | Key mà chưa có chỗ `invalidateQueries` tương ứng: commit "xanh" nhưng vô nghĩa về mặt review |

→ Ranh giới module là **heuristic**. Phép thử thật là hai câu: *checkout riêng nó có pass cổng không*
và *reviewer có thể từ chối nó mà vẫn duyệt commit bên cạnh không*.

### 11.5 Quy trình kiểm, rẻ trước đắt sau

```bash
# 1. soát danh sách file — có file lạ không
git show --stat <sha>

# 2. rò rỉ ra ngoài phạm vi module
git diff <sha>^ <sha> --name-only | grep -v '^src/features/payment/'
```

```bash
# 3. bằng chứng thật: chạy cổng tại đúng commit đó, KHÔNG lẫn phần chưa commit
git stash -u
yarn lint && yarn tsc && yarn test
git stash pop
```

`git stash -u` là mấu chốt. Không có nó thì cổng đang xanh **nhờ** file bạn chưa commit, và commit
sẽ đỏ trên máy người khác — đúng cái bẫy `verification-before-completion` gọi tên: *"test chạy một
lần pass" không chứng minh gì*.

Muốn chắc **mọi** commit trên branch đều tự đứng được:

```bash
for sha in $(git rev-list --reverse main..HEAD); do
  git checkout -q "$sha" && yarn tsc || echo "BROKEN: $sha"
done
git checkout -q -
```

`node_modules` không bị tracked nên checkout qua lại không phải cài lại. Chạy `yarn tsc` cho tất cả
(nhanh), còn `yarn test` đầy đủ thì chỉ cho commit đầu mỗi module.

### 11.6 Hai lưới an toàn có sẵn trong repo

- **`__tests__/architecture.test.ts`** — commit vi phạm luật import giữa các tầng thì **test đỏ**,
  không phải warning. Nghĩa là bước 3 ở trên tự động bắt luôn lỗi "chia module sai".
- **`gitnexus detect-changes -s staged`** — map diff sang symbol và luồng bị ảnh hưởng. Nhớ bẫy ở
  `docs/11` mục 12.1: nó bỏ sót `yield call(...)`, nên với code saga phải grep xác minh thêm.

### 11.7 Xung đột cụ thể với `sr`

| Điểm | `sr` yêu cầu | Superpowers yêu cầu | Ai thắng và vì sao |
|---|---|---|---|
| Ai được commit | *"Never commit on your own — present changes and let the user decide"* | commit sau mỗi step TDD, "frequent commits" | **`sr` thắng ở history sẽ lên PR.** Nó là user instruction trong `CLAUDE.md`, và `using-superpowers` tự nhận *"User instructions take precedence over skills"*. Superpowers được commit dày **trong worktree/branch nháp**; commit cuối vẫn phải bạn duyệt |
| Đơn vị commit | tách **theo module** + Conventional Commit + tag Jira | tách **theo step TDD** (test → code → commit) | Hai trục khác nhau, không loại trừ. Nháp theo step → gom theo module ở 11.2 |
| Nội dung message | `ref-<jira>: <type> - <mô tả>` | `feat: add specific feature` (ví dụ trong skill, không có Jira) | **Format của `sr` nhưng bỏ `ref-<jira>:`** — project cá nhân, không dùng Jira (chốt ở 11.9). Còn lại `<type> - <mô tả>`, đúng như history hiện có |
| Thứ tự trước commit | `check-diff` (soát convention của stack) rồi mới `commit` | `verification-before-completion` (chạy cổng, dán output) | **Chạy cả hai**, không trùng việc: `check-diff` bắt vi phạm convention, `verification` bắt "nói xong mà chưa chạy lệnh" |
| Push | `commit` skill: **never pushes** | `finishing-a-development-branch` có nhánh "Push and Create PR" | **`sr` thắng** — mọi lần push phải do bạn quyết |
| Nơi làm việc | không nói gì về worktree | đòi workspace tách biệt, **cấm** bắt đầu trên `main` khi chưa có đồng ý rõ | **Không dùng worktree** (chốt ở 11.9) — làm trên feature branch thường. Giữ phần "cấm bắt đầu trên `main`", vì đó là phần rẻ và đáng giá nhất của luật này. Đánh đổi ở 11.10 |

Một điểm **không** phải xung đột mà là bổ sung: `sr` không có tiêu chí nào để biết một commit đã tách
có tự đứng được hay không. Mục 11.5 lấp chỗ đó.

### 11.8 Trạng thái `sr` — đã xử lý

Hai vấn đề ghi ở bản trước của mục này đã xong (kiểm lại 2026-08-11):

**a) `sr emit` chạy lại được.** Lỗi cũ là con trỏ pack còn trỏ vào đường dẫn đã biến mất. Pack thật
nằm ở `D:\user\toolClientApps\my-plugin-ecosystem`, và `~/.skillrunner/home` đã trỏ đúng vào đó. Ngoài
ra wrapper `sr` trên PATH bị mất (chỉ còn `skillrunner.exe`), dựng lại bằng:

```bash
skillrunner home            # xem manifest đang resolve qua rung nào
skillrunner home --set <dir> # ghi lại con trỏ pack nếu di chuyển pack
skillrunner home --shims    # ghi lại wrapper `sr` cạnh binary
```

Nhớ ba lệnh này: pack nằm ngoài repo nên **mỗi lần bạn di chuyển nó, `sr` sẽ hỏng theo**, và triệu
chứng (`read manifest "skill.json"` với đường dẫn tương đối) không hề gợi ra nguyên nhân.

**b) Profile đã làm mới.** `docs/project-profile.md` được dựng lại trong cùng phiên; §"Trạng thái xác
minh" ở đầu file ghi rõ commit đối chiếu và kết quả cổng chạy thật.

### 11.9 Sáu quyết định đã chốt

| # | Chốt | Kéo theo |
|---|---|---|
| 1 | **Dùng `sr`** — đường dẫn pack đã sửa | Quy trình `sr status → list → emit` trong `CLAUDE.md` có hiệu lực trở lại |
| 2 | **Chạy lại `learn-project`** | Đã xong, xem 11.8b |
| 3 | **Cho phép commit nháp.** Agent tự commit theo step TDD trong phiên. `sr:commit` chỉ dùng ở bước **tổng kết cuối, khi confirm task** | Trong phiên không phải hỏi từng step ⇒ TDD giữ được giá trị. Nhưng history nháp **không phải** history cuối |
| 4 | **Gom theo module trước khi kết thúc task**, chia nhiệm vụ từng module theo quy tắc | Bước gom là lúc áp `sr:commit` (Conventional Commit + `check-diff`) |
| 5 | **Không dùng worktree** — làm trên feature branch thường | Đánh đổi ở 11.10; vẫn giữ luật "không bắt đầu trên `main`" |
| 6 | **Không có Jira** (project cá nhân) | Bỏ phần `ref-<n>:` mà skill `sr:commit` mặc định đòi. Format thật của repo: **`<type> - <mô tả tiếng Việt>`** — đo từ 5 commit gần nhất (`chore - xoá .eslintrc.js legacy…`, `docs - thêm tài liệu 09/10…`). Type dùng bộ Conventional Commits chuẩn, mô tả ở dạng mệnh lệnh, subject ≤ 150 ký tự |

Quy trình hợp nhất sau khi chốt:

```
trong phiên                      │  khi confirm task
─────────────────────────────────┼──────────────────────────────────
test đỏ → code xanh → commit     │  1. gom nháp theo module
  (agent tự làm, message nháp,   │  2. sr emit commit + check-diff
   không cần hỏi)                │  3. chạy cổng tại từng commit
  lặp cho từng step              │  4. trình diff — bạn duyệt
                                 │  5. push: chỉ khi bạn nói
```

### 11.10 Không dùng worktree: được gì, mất gì

Quyết định số 5 là đánh đổi có ý thức, ghi lại để sau này không phải suy luận lại.

**Được:**

- Không nhân bản `node_modules` (RN nặng vài GB) — worktree mới là một lần `yarn install` nữa.
- Không phải cấu hình lại native: `android/local.properties`, Pods, cache Gradle/Metro đều theo thư
  mục. Worktree mới = build lại từ đầu, thường mất nhiều phút trên Windows.
- Đường dẫn ổn định ⇒ VS Code tasks, `.skillrunner/ledger.json`, index `.gitnexus` vẫn đúng chỗ.
- Metro chỉ chạy một instance, không phải nhớ port nào thuộc worktree nào.

**Mất — và lưới an toàn thay thế:**

| Mất | Bù bằng |
|---|---|
| Không thể làm song song hai tính năng | Làm tuần tự; `git stash -u` khi cần nhảy việc |
| Agent commit nháp ngay trên branch chính của tính năng ⇒ bẩn history | Bước gom ở 11.2 (`git reset --soft` + commit lại theo module) là bắt buộc, không phải tuỳ chọn |
| Sai sót của agent chạm thẳng working tree đang dùng | Trước khi để agent chạy: `git status` phải sạch. Có gì dở thì `git reset --hard` về commit nháp gần nhất — đây chính là lý do commit dày có giá trị |
| Không có "vùng cách ly" khi thử nghiệm rủi ro | Với việc thật sự rủi ro (đổi babel, đổi native, nâng RN) thì tạo worktree **ad-hoc** cho riêng lần đó, không biến nó thành luật chung |

Điều **giữ nguyên** từ luật Superpowers: **không bắt đầu làm trên `main`.** Phần này rẻ (một lệnh
`git switch -c`) mà chặn đúng lỗi tệ nhất — nháp của agent nằm lẫn trong branch phát hành.
