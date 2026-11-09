# -*- coding: utf-8 -*-
"""从 Hubexo PDF 抽出各项目 Building elements 里和钢格板相关的行。"""
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

GRATING = re.compile(
    r"钢格板|格栅|grating|grillage|walkway|walkways|\baccess\b|地板|flooring|\bfloor\b|"
    r"平台|platform|楼梯|stairs?|踏步|tread|盖板|\bcover\b|排水沟|trench|"
    r"屋顶走道|roof\s+access|钢结构|\bsteel\b",
    re.I,
)
NOISE = re.compile(r"bathroom|toilet|shower|curtain|soap|urinal|vanity", re.I)


def clean(text: str) -> str:
    return re.sub(r"[\ue000-\uf8ff]", "", text or "")


def main() -> None:
    pdf_dir = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\11944\Desktop\RCC\PDF")
    out: dict[str, str] = {}
    for i in range(1, 11):
        path = pdf_dir / f"{i}.pdf"
        if not path.exists():
            continue
        reader = PdfReader(str(path))
        text = "\n".join((page.extract_text(space_width=450) or "") for page in reader.pages)
        text = clean(text)
        for chunk in re.split(r"(?=First Published:)", text):
            mid = re.search(r"Project ID\s+(\d{5,})", chunk)
            if not mid:
                continue
            pid = mid.group(1)
            match = re.search(
                r"Building elements include:(.*?)(?:Project Roles|Other Information|My Project Pipeline|DO NOT FORWARD)",
                chunk,
                re.S | re.I,
            )
            if not match:
                continue
            items: list[str] = []
            for line in match.group(1).splitlines():
                line = re.sub(r"\s+", " ", line).strip()
                if not line or not GRATING.search(line):
                    continue
                if NOISE.search(line) and not GRATING.search(NOISE.sub(" ", line)):
                    continue
                if line not in items:
                    items.append(line)
            if not items:
                continue
            joined = "\n".join(items)
            if len(joined) >= len(out.get(pid, "")):
                out[pid] = joined
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
