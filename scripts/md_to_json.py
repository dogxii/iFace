#!/usr/bin/env python3
"""
Markdown 题库转 JSON 脚本

Markdown 格式（每道题用 frontmatter 包裹）:

---
id: go-basics-001
module: Go基础
difficulty: 1
tags: [变量, 类型]
source: 高频
---
## 题目
问题内容

## 答案
答案内容（支持代码块）

---
id: go-basics-002
...

用法:
  python3 scripts/md_to_json.py <input.md> <module_key> [--append|--overwrite]
  python3 scripts/md_to_json.py status

示例:
  python3 scripts/md_to_json.py tmp/basics.md go-basics
  python3 scripts/md_to_json.py tmp/basics.md go-basics --overwrite
  python3 scripts/md_to_json.py tmp/network.md network --append
"""

import json
import os
import re
import shutil
import sys
from datetime import datetime

QUESTIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "questions")

# ── module key → relative path under QUESTIONS_DIR ───────────────────────────
# Keys are lowercase aliases; values are paths relative to QUESTIONS_DIR.
MODULE_FILES = {
    # ── Frontend ──────────────────────────────────────────────────────────────
    "js": "frontend/js.json",
    "js-basics": "frontend/js.json",
    "react": "frontend/react.json",
    "css": "frontend/css.json",
    "typescript": "frontend/typescript.json",
    "ts": "frontend/typescript.json",
    "network": "frontend/network.json",
    "net": "frontend/network.json",
    "performance": "frontend/performance.json",
    "perf": "frontend/performance.json",
    "algorithm": "frontend/algorithm.json",
    "algo": "frontend/algorithm.json",
    "code": "frontend/algorithm.json",
    "project": "frontend/project.json",
    "proj": "frontend/project.json",
    # ── Golang ────────────────────────────────────────────────────────────────
    "go-basics": "golang/basics.json",
    "go-concurrency": "golang/concurrency.json",
    "go-memory": "golang/memory.json",
    "go-engineering": "golang/engineering.json",
    "go-web": "golang/web.json",
    # ── AI Agent ─────────────────────────────────────────────────────────────
    "ai-llm": "ai-agent/llm.json",
    "llm": "ai-agent/llm.json",
    "ai-prompt": "ai-agent/prompt.json",
    "agent-prompt": "ai-agent/prompt.json",
    "ai-agent": "ai-agent/agent.json",
    "agent-arch": "ai-agent/agent.json",
    "architecture": "ai-agent/agent.json",
    "ai-rag": "ai-agent/rag.json",
    "rag": "ai-agent/rag.json",
    "ai-tools": "ai-agent/tools.json",
    "tools": "ai-agent/tools.json",
    "tooling": "ai-agent/tools.json",
    "ai-eval": "ai-agent/evaluation.json",
    "evaluation": "ai-agent/evaluation.json",
    "eval": "ai-agent/evaluation.json",
    # Legacy flat-path aliases (kept for backward compat)
    "perf-legacy": "performance.json",
}

# ── Status targets: expected question counts per file ────────────────────────
STATUS_TARGETS = {
    # Frontend
    "frontend/js.json": 65,
    "frontend/react.json": 65,
    "frontend/css.json": 55,
    "frontend/typescript.json": 55,
    "frontend/network.json": 60,
    "frontend/performance.json": 50,
    "frontend/algorithm.json": 50,
    "frontend/project.json": 50,
    # Golang
    "golang/basics.json": 40,
    "golang/concurrency.json": 40,
    "golang/memory.json": 30,
    "golang/engineering.json": 30,
    "golang/web.json": 35,
    # AI Agent
    "ai-agent/llm.json": 40,
    "ai-agent/prompt.json": 40,
    "ai-agent/agent.json": 40,
    "ai-agent/rag.json": 40,
    "ai-agent/tools.json": 40,
    "ai-agent/evaluation.json": 40,
}


def get_path(module_key: str) -> str:
    """
    Resolve a module key or direct relative path to an absolute file path.

    Accepts:
      - A known alias like "go-basics" or "network"
      - A direct relative path like "golang/basics.json"
    """
    key = module_key.lower()
    if key in MODULE_FILES:
        rel = MODULE_FILES[key]
    elif module_key.endswith(".json"):
        # Treat as a direct relative path under QUESTIONS_DIR
        rel = module_key
    else:
        known = sorted(MODULE_FILES.keys())
        raise ValueError(
            f"Unknown module key: '{module_key}'.\n"
            f"Known keys: {known}\n"
            f"Or pass a direct path like 'golang/basics.json'"
        )
    path = os.path.join(QUESTIONS_DIR, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def fix_and_load(path: str) -> list:
    """Load JSON from path, attempting to recover truncated files."""
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read().strip()
    if not raw:
        return []
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Attempt recovery: find last complete object
    last_valid = -1
    for m in re.finditer(r'"source"\s*:\s*"[^"]*"\s*\n\s*\}', raw):
        last_valid = m.end()
    if last_valid == -1:
        return []
    fixed = raw[:last_valid] + "\n]"
    try:
        data = json.loads(fixed)
        print(f"[INFO] Fixed truncated JSON: recovered {len(data)} items")
        return data
    except Exception:
        return []


def backup(path: str):
    """Create a timestamped backup of path if it exists."""
    if os.path.exists(path):
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        bak = path + f".bak_{ts}"
        shutil.copy2(path, bak)
        print(f"[INFO] Backup saved: {os.path.basename(bak)}")


def parse_frontmatter(block: str) -> dict:
    """Parse a YAML-like frontmatter block into a dict."""
    meta = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            if val.startswith("[") and val.endswith("]"):
                inner = val[1:-1]
                items = [
                    x.strip().strip('"').strip("'")
                    for x in inner.split(",")
                    if x.strip()
                ]
                meta[key] = items
            elif re.match(r"^\d+$", val):
                meta[key] = int(val)
            else:
                meta[key] = val.strip('"').strip("'")
    return meta


def parse_md(content: str) -> list:
    """
    Parse a Markdown file containing multiple questions.

    Each question block:
      ---
      id: xxx
      module: xxx
      difficulty: 1|2|3
      tags: [tag1, tag2]
      source: 高频
      ---
      ## 题目
      <question text>

      ## 答案
      <answer text (markdown)>
    """
    questions = []

    pattern = re.compile(
        r"(?:^|\n)---\n(.*?)\n---\n(.*?)(?=\n---\n|\Z)",
        re.DOTALL,
    )

    for match in pattern.finditer(content):
        fm_raw = match.group(1)
        body = match.group(2).strip()

        meta = parse_frontmatter(fm_raw)

        # Extract question and answer sections
        q_match = re.search(r"##\s*题目\s*\n(.*?)(?=\n##\s*答案|\Z)", body, re.DOTALL)
        a_match = re.search(r"##\s*答案\s*\n(.*?)$", body, re.DOTALL)

        question_text = q_match.group(1).strip() if q_match else ""
        answer_text = a_match.group(1).strip() if a_match else ""

        # Fallback: first line = question, rest = answer
        if not question_text and not answer_text:
            lines = body.splitlines()
            question_text = lines[0].lstrip("#").strip() if lines else ""
            answer_text = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""

        if not meta.get("id"):
            preview = question_text[:50] if question_text else fm_raw[:50]
            print(f"[WARN] Skipping entry with no id: {preview!r}")
            continue

        if not meta.get("module"):
            print(f"[WARN] Skipping {meta['id']!r}: missing 'module' field")
            continue

        difficulty = meta.get("difficulty", 1)
        if difficulty not in (1, 2, 3):
            print(
                f"[WARN] {meta['id']}: invalid difficulty {difficulty!r}, defaulting to 1"
            )
            difficulty = 1

        item = {
            "id": meta["id"],
            "module": meta["module"],
            "difficulty": difficulty,
            "question": question_text,
            "answer": answer_text,
            "tags": meta.get("tags", []),
            "source": meta.get("source", ""),
        }
        questions.append(item)

    if not questions:
        print("[WARN] No questions parsed. Check your Markdown format.")

    return questions


def write_to_file(path: str, new_items: list, mode: str = "append") -> list:
    """
    Write new_items to path.

    mode:
      append    — merge with existing, skip duplicate ids
      overwrite — replace everything (backup first)
    """
    if mode == "overwrite":
        backup(path)
        data = new_items
        print(f"[INFO] Overwrite mode: writing {len(data)} items")
    else:
        existing = fix_and_load(path)
        existing_ids = {x["id"] for x in existing}
        added, skipped = [], []
        for item in new_items:
            if item["id"] in existing_ids:
                skipped.append(item["id"])
            else:
                added.append(item)
        if skipped:
            print(f"[INFO] Skipped {len(skipped)} duplicate id(s): {skipped}")
        backup(path)
        data = existing + added
        print(
            f"[INFO] Append mode: {len(added)} new + {len(existing)} existing = {len(data)} total"
        )

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    last_id = data[-1]["id"] if data else "N/A"
    print(f"[OK] {os.path.relpath(path)}: {len(data)} questions (last id: {last_id})")
    return data


def status():
    """Print a status table for all tracked question files."""
    print(f"\n{'文件':<35} {'条数':>5} {'目标':>5} {'最后ID':<25} 状态")
    print("-" * 80)
    for rel, target in sorted(STATUS_TARGETS.items()):
        path = os.path.join(QUESTIONS_DIR, rel)
        data = fix_and_load(path)
        count = len(data)
        last = data[-1]["id"] if data else "—"
        if count >= target:
            done = "✅ 完成"
        elif count == 0:
            done = "⬜ 未创建"
        else:
            done = f"🔶 差 {target - count} 道"
        print(f"{rel:<35} {count:>5} {target:>5} {last:<25} {done}")
    print()


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] == "status":
        status()
        sys.exit(0)

    if len(args) < 2:
        print(__doc__)
        sys.exit(1)

    md_file = args[0]
    module_key = args[1]
    mode = "append"
    if "--overwrite" in args:
        mode = "overwrite"

    if not os.path.exists(md_file):
        print(f"[ERROR] Input file not found: {md_file}")
        sys.exit(1)

    try:
        out_path = get_path(module_key)
    except ValueError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)

    with open(md_file, "r", encoding="utf-8") as f:
        content = f.read()

    items = parse_md(content)
    print(f"[INFO] Parsed {len(items)} question(s) from {md_file}")

    if not items:
        print("[ERROR] No valid questions found — nothing written.")
        sys.exit(1)

    write_to_file(out_path, items, mode=mode)
