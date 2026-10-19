"""Extract all pages, check content and boundaries, then render all pages for visual QA."""
import argparse
import json
import re
import subprocess
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat
from pypdf import PdfReader
from reportlab.pdfbase.pdfmetrics import stringWidth

parser = argparse.ArgumentParser()
parser.add_argument("--poppler-bin", type=Path, required=True)
parser.add_argument("--output", type=Path, default=Path("docs/preview-tests"))
args = parser.parse_args()
fixtures = json.loads((args.output / "pdf-fixtures.json").read_text(encoding="utf-8"))["fixtures"]
report = []
for fixture in fixtures:
    source = args.output / fixture["filename"]
    reader = PdfReader(source)
    assert len(reader.pages) == fixture["pages"]
    pages = []
    out_of_bounds = []
    for index, page in enumerate(reader.pages):
        def visit(text, cm, tm, font, size):
            if text.strip():
                x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
                y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
                font_name = str(font.get("/BaseFont", "/Helvetica")).lstrip("/") if font else "Helvetica"
                width = max(stringWidth(line, font_name, size) for line in text.splitlines()) * math.hypot(cm[0], cm[1])
                if not (0 <= x <= 595 and x + width <= 595.2 and 20 <= y <= 830):
                    out_of_bounds.append({"page": index + 1, "x": x, "right": x + width, "y": y, "text": text[:100]})
        text = page.extract_text(visitor_text=visit) or ""
        assert len(text.strip()) > 80, f"Empty or almost blank page {source.name}, {index + 1}"
        pages.append(text)
    full_text = "\n".join(pages)
    expected = {f'{fixture["marker"]}{number:03d}' for number in range(1, fixture["rows"] + 1)}
    actual = set(re.findall(re.escape(fixture["marker"]) + r"\d{3}", full_text))
    assert actual == expected, {"file": source.name, "missing_rows": sorted(expected - actual)}
    for phrase in fixture["required"]:
        assert phrase in full_text, f"Missing content {phrase!r} in {source.name}"
    normalized_text = re.sub(r"\s+", " ", full_text).replace("\u00a0", " ").replace("\u202f", " ")
    def money(value):
        result = f"{value:,.2f}".rstrip("0").rstrip(".")
        return result.replace(",", "\x01").replace(".", ",").replace("\x01", " ") + " EUR"
    if "subtotal" in fixture["totals"]:
        labels = {"subtotal": "Avant remise", "discount": "Remise commerciale", "ht": "Total HT", "tax": "TVA indicative", "ttc": "Total TTC"}
        for field, label in labels.items():
            position = normalized_text.rfind(label)
            assert position >= 0
            region = normalized_text[position:position + 230]
            for amount in fixture["totals"][field].values():
                assert money(amount) in region, f"Incorrect {label} amount {amount} in {source.name}"
    else:
        for amount in fixture["totals"].values():
            assert money(amount) in normalized_text, f"Missing estimate total {amount} in {source.name}"
    if "discountedMid" in fixture:
        assert money(fixture["discountedMid"]) in normalized_text, "The public discount must keep cents instead of rounding to 50 EUR"
    if "duration" in fixture:
        assert fixture["duration"] in normalized_text, "The actual eight-lot duration must be complete"
    (args.output / f"{source.stem}.txt").write_text(full_text, encoding="utf-8")
    prefix = args.output / source.stem
    for previous in args.output.glob(source.stem + "-*.png"):
        if re.fullmatch(re.escape(source.stem) + r"-\d+\.png", previous.name):
            assert previous.parent.resolve() == args.output.resolve()
            previous.unlink()
    executable = args.poppler_bin / ("pdftoppm.exe" if (args.poppler_bin / "pdftoppm.exe").exists() else "pdftoppm")
    subprocess.run([str(executable), "-png", "-r", "100", str(source), str(prefix)], check=True)
    previews = sorted((item for item in args.output.glob(source.stem + "-*.png") if re.fullmatch(re.escape(source.stem) + r"-\d+\.png", item.name)), key=lambda item: int(item.stem.rsplit("-", 1)[1]))
    assert len(previews) == len(reader.pages)
    for preview in previews:
        with Image.open(preview).convert("RGB") as image:
            diff = ImageChops.difference(image, Image.new("RGB", image.size, "white"))
            assert sum(ImageStat.Stat(diff).mean) > 1, f"Blank rendering: {preview.name}"
    columns = 3
    cell_width, cell_height = 310, 465
    sheet = Image.new("RGB", (columns * cell_width, ((len(previews) + columns - 1) // columns) * cell_height), "#e8e6e0")
    draw = ImageDraw.Draw(sheet)
    for index, preview in enumerate(previews):
        with Image.open(preview).convert("RGB") as image:
            image.thumbnail((290, 425))
            x, y = (index % columns) * cell_width + 10, (index // columns) * cell_height + 10
            sheet.paste(image, (x, y))
            draw.text((x, y + 432), f"Page {index + 1} / {len(previews)}", fill="black")
    sheet.save(args.output / f"{source.stem}-contact-sheet.png")
    report.append({"file": source.name, "pages": len(reader.pages), "rows_found": len(actual), "out_of_bounds": out_of_bounds, "previews": [item.name for item in previews]})
    print(f"PASS extraction/render: {source.name}, {len(reader.pages)} pages, {len(actual)} rows, {len(out_of_bounds)} text boundary alerts")
(args.output / "pdf-render-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
assert not any(item["out_of_bounds"] for item in report), "Text beyond page boundaries; inspect pdf-render-report.json"
