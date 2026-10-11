# Vendored superpowers skills

Các thư mục skill trong `.claude/skills/` (trừ file này và `SUPERPOWERS-LICENSE`) được chép nguyên văn từ
plugin **superpowers** để dùng được trong Claude Code cloud session, nơi plugin chưa được cài.

- Nguồn: <https://github.com/obra/superpowers>, plugin version `7.0.0`, commit
  `bb92a77741419a4ab5f06e711a283343f1ada0c3` (09/10/2026), chép ngày 11/10/2026.
- Giấy phép: MIT, Copyright (c) 2025 Jesse Vincent — xem `SUPERPOWERS-LICENSE`.
- Không sửa nội dung skill. Muốn cập nhật: clone lại repo nguồn, chép đè thư mục `skills/` của nó vào đây, cập
  nhật commit ở trên.

**Tên skill:** plugin gọi là `superpowers:<tên>`; ở đây là project skill `<tên>` (vd `superpowers:brainstorming` →
`brainstorming`). Nội dung skill vẫn ghi `superpowers:<tên>`, hiểu là cùng một skill.

**Hook (chưa nối, chủ dự án tự bật):** `.claude/hooks/superpowers-session-start.sh` chèn nội dung `using-superpowers`
khi bắt đầu phiên, giống hook của plugin. Script chỉ chạy khi `CLAUDE_CODE_REMOTE=true` (cloud session); trên máy local
plugin đã tự chèn nên script im lặng. Không có hook thì skill vẫn gọi được, chỉ là không được nhắc tự động. Để bật,
thêm vào `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/superpowers-session-start.sh\"" }
        ]
      }
    ]
  }
}
```

Lưu ý: trên máy local có cài plugin, các skill hiện hai lần (bản plugin `superpowers:<tên>` và bản project `<tên>`),
cùng nội dung, dùng bản nào cũng được.
