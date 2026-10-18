#!/usr/bin/env python3
"""Generate Micro app's evidence-based progress dashboard from its readiness checklist."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PRODUCTION_READINESS.md"
OUT = ROOT / "docs" / "progress"
CHECK = re.compile(r"^\s*- \[([ xX])\] (.+?)\s*$")


def collect():
    groups = []
    current = None
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            if current:
                groups.append(current)
            current = {"name": line[3:].strip(), "done": 0, "total": 0, "items": []}
        elif current:
            match = CHECK.match(line)
            if match:
                done = match.group(1).lower() == "x"
                current["total"] += 1
                current["done"] += int(done)
                current["items"].append({"title": match.group(2), "done": done})
    if current:
        groups.append(current)
    for group in groups:
        group["percent"] = round(100 * group["done"] / group["total"], 1) if group["total"] else 0
    product_names = {"Implementación funcional"}
    production_names = {"Preparación para producción (gates)"}
    def summarize(names):
        selected = [g for g in groups if g["name"] in names]
        done = sum(g["done"] for g in selected)
        total = sum(g["total"] for g in selected)
        return {"done": done, "total": total, "percent": round(100 * done / total, 1) if total else 0}
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "docs/PRODUCTION_READINESS.md",
        "implementation": summarize(product_names),
        "production_readiness": summarize(production_names),
        "groups": groups,
        "production_blockers": [item["title"] for group in groups for item in group["items"]
                                if not item["done"] and group["name"] == "Preparación para producción (gates)"],
        "note": "Porcentaje de criterios inventariados con evidencia; no es una certificación ni una garantía de producción."
    }


def svg(data):
    width, panel_w, gap, top, row_h = 1000, 480, 20, 92, 64
    groups = data["groups"]
    height = top + max(1, len(groups)) * row_h + 30
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 {width} {height}">',
           '<title id="title">Micro app project progress</title>',
           '<desc id="desc">Evidence-based completion by checklist group.</desc>',
           f'<rect width="{width}" height="{height}" fill="#0d1117"/>',
           '<style>text{font-family:system-ui,sans-serif;fill:#f0f6fc}.muted{fill:#9da7b3;font-size:12px}.label{font-size:14px}.pct{font-size:16px;font-weight:650}</style>',
           '<text x="24" y="34" font-size="24" font-weight="700">Micro app · progreso verificable</text>',
           f'<text x="24" y="58" class="muted">Implementación: {data["implementation"]["percent"]}% ({data["implementation"]["done"]}/{data["implementation"]["total"]})</text>',
           f'<text x="520" y="58" class="muted">Preparación producción: {data["production_readiness"]["percent"]}% ({data["production_readiness"]["done"]}/{data["production_readiness"]["total"]})</text>']
    for i, group in enumerate(groups):
        y = top + i * row_h
        pct = group["percent"]
        fill = "#238636" if pct >= 80 else "#9e6a03" if pct >= 40 else "#6e7681"
        out += [f'<text x="24" y="{y+15}" class="label">{escape(group["name"])}</text>',
                f'<text x="976" y="{y+15}" text-anchor="end" class="pct">{pct:.1f}% · {group["done"]}/{group["total"]}</text>',
                f'<rect x="24" y="{y+25}" width="952" height="16" rx="3" fill="#21262d"/>',
                f'<rect x="24" y="{y+25}" width="{9.52*pct:.2f}" height="16" rx="3" fill="{fill}"/>']
    out.append('</svg>')
    return "\n".join(out) + "\n"


def main():
    data = collect()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "progress.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (OUT / "progress.svg").write_text(svg(data), encoding="utf-8")
    rows = []
    for group in data["groups"]:
        rows.append(f'<tr><th>{escape(group["name"])}</th><td>{group["done"]}/{group["total"]}</td><td>{group["percent"]:.1f}%</td></tr>')
    html = """<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Micro app — progreso</title>
<style>body{font:16px system-ui,sans-serif;max-width:1000px;margin:auto;padding:1rem;background:#0d1117;color:#f0f6fc}img{width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{padding:.65rem;border-bottom:1px solid #30363d;text-align:left}small{color:#9da7b3}</style></head><body>
<h1>Micro app — progreso y preparación para producción</h1><img src="progress.svg" alt="Gráfica de avance por criterios"><p>Los porcentajes cuentan criterios inventariados con evidencia, no estiman fechas ni garantizan producción.</p><table><thead><tr><th>Área</th><th>Completado</th><th>Porcentaje</th></tr></thead><tbody>""" + "".join(rows) + """</tbody></table><h2>Bloqueos</h2><ul>""" + "".join(f"<li>{escape(item)}</li>" for item in data["production_blockers"]) + """</ul><small>Fuente: docs/PRODUCTION_READINESS.md · Generado en """ + escape(data["generated_at"]) + """</small></body></html>"""
    (OUT / "index.html").write_text(html + "\n", encoding="utf-8")
    print(f'implementation={data["implementation"]["percent"]}% production_readiness={data["production_readiness"]["percent"]}% groups={len(data["groups"])}')


if __name__ == "__main__":
    main()
