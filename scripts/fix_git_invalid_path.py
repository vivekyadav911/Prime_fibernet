#!/usr/bin/env python3
"""Remove Windows-invalid absolute paths from refs/remotes/origin/main."""
from __future__ import annotations

import subprocess
import sys

REF = "refs/remotes/origin/main"


def run(*args: str, input_data: bytes | None = None) -> bytes:
    result = subprocess.run(args, input=input_data, capture_output=True)
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"{' '.join(args)}\n{stderr}")
    return result.stdout


def is_bad_path(path: str) -> bool:
    lowered = path.lower()
    return (
        "vivekyadav" in lowered
        or (len(path) > 1 and path[1] == ":")
        or lowered.startswith('"c:')
    )


def iter_tree_paths(commit: str) -> list[tuple[str, str, str, bool]]:
    raw = run("git", "ls-tree", "-r", "-z", commit)
    rows: list[tuple[str, str, str, bool]] = []
    for item in raw.split(b"\0"):
        if not item or b"\t" not in item:
            continue
        meta, path_bytes = item.split(b"\t", 1)
        mode, obj_type, sha = meta.decode("utf-8").split()
        path = path_bytes.decode("utf-8")
        if obj_type != "blob":
            continue
        rows.append((mode, sha, path, is_bad_path(path)))
    return rows


def list_tree_paths(commit: str) -> list[tuple[str, str, str]]:
    return [(mode, sha, path) for mode, sha, path, bad in iter_tree_paths(commit) if not bad]


def tree_has_bad_paths(commit: str) -> bool:
    return any(bad for _, _, _, bad in iter_tree_paths(commit))


def build_tree(entries: list[tuple[str, str, str]]) -> str:
    files: list[tuple[str, str, str]] = []
    dirs: dict[str, list[tuple[str, str, str]]] = {}

    for mode, sha, path in entries:
        if "/" not in path:
            files.append((mode, sha, path))
            continue
        head, rest = path.split("/", 1)
        dirs.setdefault(head, []).append((mode, sha, rest))

    lines: list[str] = []
    for mode, sha, name in sorted(files, key=lambda item: item[2]):
        lines.append(f"{mode} blob {sha}\t{name}")
    for name, subentries in sorted(dirs.items()):
        sub_sha = build_tree(subentries)
        lines.append(f"040000 tree {sub_sha}\t{name}")

    payload = "\n".join(lines) + ("\n" if lines else "")
    return run("git", "mktree", input_data=payload.encode("utf-8")).decode("utf-8").strip()


def rewrite_commit(old_sha: str, parent_map: dict[str, str]) -> str:
    meta = run("git", "cat-file", "-p", old_sha).decode("utf-8").splitlines()
    parents = [line.split()[1] for line in meta if line.startswith("parent ")]
    new_parents = [parent_map.get(parent, parent) for parent in parents]

    new_tree = build_tree(list_tree_paths(old_sha))
    body = "\n".join(
        line for line in meta if not line.startswith(("tree ", "parent "))
    ).rstrip("\n")

    cmd = ["git", "commit-tree", new_tree, *[part for p in new_parents for part in ("-p", p)]]
    new_sha = run(*cmd, input_data=(body + "\n").encode("utf-8")).decode("utf-8").strip()
    parent_map[old_sha] = new_sha
    return new_sha


def main() -> int:
    commits = run("git", "rev-list", REF).decode("utf-8").splitlines()
    commits.reverse()

    parent_map: dict[str, str] = {}
    new_tip = ""

    for commit in commits:
        if tree_has_bad_paths(commit):
            new_tip = rewrite_commit(commit, parent_map)
            print(f"rewrote {commit[:8]} -> {new_tip[:8]}")
        elif commit in parent_map:
            new_tip = parent_map[commit]
        else:
            new_tip = commit

    if not new_tip:
        print("No commits rewritten.")
        return 0

    run("git", "update-ref", REF, new_tip)

    bad_remaining = [path for _, _, path, bad in iter_tree_paths(new_tip) if bad]
    if bad_remaining:
        print("ERROR: invalid paths remain:", bad_remaining, file=sys.stderr)
        return 1

    sample = run("git", "ls-tree", "-r", "-z", new_tip).split(b"\0")[1:6]
    print("Sample paths:", [item.split(b"\t", 1)[1].decode("utf-8") for item in sample if b"\t" in item])
    print(f"Updated {REF} -> {new_tip}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
