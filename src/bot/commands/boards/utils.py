"""Utilities for board / leaderboard formatting and pagination."""

from __future__ import annotations
from typing import Iterable, Sequence


def chunk(sequence: Sequence, size: int) -> list[Sequence]:
	if size <= 0:
		raise ValueError("size must be > 0")
	return [sequence[i : i + size] for i in range(0, len(sequence), size)]


def paginate_lines(lines: Iterable[str], per_page: int = 15) -> list[str]:
	lines_list = list(lines)
	pages = chunk(lines_list, per_page)
	total = len(pages)
	return [f"Page {idx+1}/{total}\n" + "\n".join(page) for idx, page in enumerate(pages)]


def monospace_table(rows, headers=None) -> str:
	if not rows and not headers:
		return "(no data)"
	rows_list = list(rows)
	cols = len(headers) if headers else len(rows_list[0]) if rows_list else 0
	col_widths = [0] * cols
	if headers:
		for i, h in enumerate(headers):
			col_widths[i] = max(col_widths[i], len(str(h)))
	for r in rows_list:
		for i, cell in enumerate(r):
			col_widths[i] = max(col_widths[i], len(str(cell)))
	def fmt_row(r):
		return " | ".join(str(cell).ljust(col_widths[i]) for i, cell in enumerate(r))
	out = []
	if headers:
		out.append(fmt_row(headers))
		out.append("-+-".join("-" * w for w in col_widths))
	out.extend(fmt_row(r) for r in rows_list)
	return "\n".join(out)


__all__ = ["chunk", "paginate_lines", "monospace_table"]
