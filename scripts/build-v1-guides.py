"""Build the two V1 handbooks from versioned Markdown and real UI captures.

Requires reportlab and pypdf. Outputs output/pdf, then copies final PDFs to
docs/v1/downloads for GitHub. No credentials or network are read by this script.
"""
from pathlib import Path
import re
import html
import shutil
from urllib.parse import urljoin

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    NextPageTemplate, Table, TableStyle, Image, KeepTogether, Preformatted, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs" / "v1"
OUT = ROOT / "output" / "pdf"
ARCHIVE = DOCS / "downloads"
OUT.mkdir(parents=True, exist_ok=True)
ARCHIVE.mkdir(parents=True, exist_ok=True)
W, H = A4
M = 47
BODY_W = W - 2 * M
NAVY = colors.HexColor("#142E32")
SAGE = colors.HexColor("#61766A")
GOLD = colors.HexColor("#B89D76")
CREAM = colors.HexColor("#F4F3EC")
INK = colors.HexColor("#2C3E3F")
MUTED = colors.HexColor("#61716F")

def register_fonts():
    import reportlab
    bundled = Path(reportlab.__file__).parent / "fonts"
    candidates = [
        (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/seguisb.ttf"), Path("C:/Windows/Fonts/consola.ttf")),
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")),
        (bundled / "Vera.ttf", bundled / "VeraBd.ttf", bundled / "Vera.ttf"),
    ]
    regular, bold, mono = next(row for row in candidates if all(p.exists() for p in row))
    for name, path in [("A2E", regular), ("A2EB", bold), ("A2EMono", mono)]:
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily("A2E", normal="A2E", bold="A2EB", italic="A2E", boldItalic="A2EB")

register_fonts()
STYLES = {
    "body": ParagraphStyle("Body", fontName="A2E", fontSize=10, leading=15, textColor=INK, spaceAfter=8, splitLongWords=True),
    "h2": ParagraphStyle("Chapter", fontName="A2EB", fontSize=21, leading=26, textColor=NAVY, spaceAfter=17, keepWithNext=True),
    "h3": ParagraphStyle("Section", fontName="A2EB", fontSize=12.5, leading=17, textColor=NAVY, spaceBefore=13, spaceAfter=8, keepWithNext=True),
    "h4": ParagraphStyle("Subsection", fontName="A2EB", fontSize=10.5, leading=15, textColor=SAGE, spaceBefore=9, spaceAfter=6, keepWithNext=True),
    "caption": ParagraphStyle("Caption", fontName="A2E", fontSize=8.3, leading=11.5, textColor=MUTED, spaceAfter=14),
    "table": ParagraphStyle("TableCell", fontName="A2E", fontSize=8.6, leading=12, textColor=INK, splitLongWords=True),
    "table_head": ParagraphStyle("TableHead", fontName="A2EB", fontSize=8.6, leading=12, textColor=NAVY, splitLongWords=True),
    "note": ParagraphStyle("Note", fontName="A2E", fontSize=9.5, leading=14.5, textColor=NAVY, backColor=CREAM, borderPadding=10, spaceBefore=5, spaceAfter=14),
    "toc": ParagraphStyle("Contents", fontName="A2E", fontSize=10.5, leading=16, textColor=NAVY, spaceBefore=9, leftIndent=0, firstLineIndent=0, rightIndent=24),
    "cover_title": ParagraphStyle("CoverTitle", fontName="A2EB", fontSize=33, leading=40, textColor=colors.white, spaceAfter=23),
    "cover_sub": ParagraphStyle("CoverSubtitle", fontName="A2E", fontSize=13, leading=21, textColor=colors.HexColor("#D8E0D9"), spaceAfter=16),
}

def inline(value, source):
    # Protect literal inline code from Markdown interpretation and HTML injection.
    codes = []
    def code(match):
        codes.append('<font name="A2EMono" size="8.3">' + html.escape(match.group(1)) + '</font>')
        return f"ZZCODE{len(codes)-1}ZZ"
    value = re.sub(r"`([^`]+)`", code, value)
    value = html.escape(value.replace("\u2011", "-").replace("\u2014", " - ").replace("\u2013", "-"))
    def link(match):
        label, target = match.groups()
        target = html.unescape(target)
        if not target.startswith(("https://", "http://", "mailto:", "#")):
            relative = (source.parent / target).resolve().relative_to(ROOT).as_posix()
            target = "https://github.com/lololarue93/A2E_Renovation/blob/main/" + relative
        return f'<link href="{html.escape(target, quote=True)}" color="#476A5C"><u>{label}</u></link>'
    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", value)
    for index, fragment in enumerate(codes):
        value = value.replace(f"ZZCODE{index}ZZ", fragment)
    return value

class Handbook(BaseDocTemplate):
    def __init__(self, target, label, **kw):
        self.label = label
        self.chapter_seen = False
        super().__init__(str(target), pagesize=A4, leftMargin=M, rightMargin=M,
                         topMargin=66, bottomMargin=49, title=f"A2E V1 - {label}",
                         author="A2E Rénovation", subject="Manuel V1 - édition du 19 octobre 2026", **kw)
        frame = Frame(M, 49, BODY_W, H-115, id="body", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="Cover", frames=[frame], onPage=self.cover),
            PageTemplate(id="Body", frames=[frame], onPage=self.chrome),
        ])

    def beforeDocument(self):
        self.chapter_seen = False

    def cover(self, c, doc):
        c.saveState()
        c.setFillColor(NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#1F3C3E")); c.rect(W-144, 0, 144, H, fill=1, stroke=0)
        c.setStrokeColor(GOLD); c.setLineWidth(.8); c.line(M, H-151, W-M, H-151)
        logo = ROOT / "public/branding/a2e-logo.jpeg"
        if logo.exists(): c.drawImage(str(logo), M, H-112, width=75, height=43, preserveAspectRatio=True, mask="auto")
        c.setFillColor(GOLD); c.setFont("A2EB", 10); c.drawRightString(W-M, H-88, "DOCUMENTATION  /  V1.0")
        c.setFillColor(colors.HexColor("#D8E0D9")); c.setFont("A2E", 9)
        c.drawString(M, 78, "Penser. Transformer. Habiter.")
        c.drawRightString(W-M, 78, "ÉDITION DU 19 OCTOBRE 2026")
        c.setFillColor(GOLD); c.rect(M, 55, 34, 3, fill=1, stroke=0)
        c.restoreState()

    def chrome(self, c, doc):
        c.saveState()
        c.setFillColor(SAGE); c.rect(0, 0, 4, H, fill=1, stroke=0)
        c.setFont("A2EB", 9); c.setFillColor(NAVY); c.drawString(M, H-34, "A2E RÉNOVATION")
        c.setFont("A2E", 8); c.setFillColor(MUTED); c.drawRightString(W-M, H-34, self.label.upper())
        c.setStrokeColor(colors.HexColor("#D9DFD8")); c.setLineWidth(.5); c.line(M, 37, W-M, 37)
        c.setFont("A2E", 8); c.drawString(M, 23, "V1.0  -  Mode d’emploi et exploitation")
        c.drawRightString(W-M, 23, str(doc.page))
        c.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "Chapter":
            text = flowable.getPlainText()
            key = "chapter-" + str(self.seq.nextf("chapter"))
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0, closed=False)
            self.notify("TOCEntry", (0, text, self.page, key))

def table(rows, source):
    columns = len(rows[0])
    widths = [BODY_W/columns] * columns
    if columns == 2: widths = [BODY_W*.36, BODY_W*.64]
    if columns == 3: widths = [BODY_W*.25, BODY_W*.36, BODY_W*.39]
    cells = [[Paragraph(inline(cell.strip(), source), STYLES["table_head" if row_index == 0 else "table"])
              for cell in row[:columns]] for row_index, row in enumerate(rows)]
    t = Table(cells, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), CREAM), ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LINEBELOW", (0,0), (-1,0), .9, SAGE),
        ("LINEBELOW", (0,1), (-1,-1), .35, colors.HexColor("#D9DFD8")),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))
    return [t, Spacer(1, 13)]

def markdown_story(source):
    lines = source.read_text(encoding="utf-8-sig").splitlines()
    if source.name == "deploiement-et-email.md":
        first_chapter = next(i for i, line in enumerate(lines) if line.startswith("## 1."))
        lines = lines[first_chapter:]
    story, index = [], 0
    while index < len(lines):
        raw = lines[index]; line = raw.strip()
        if not line: index += 1; continue
        if line.startswith("```"):
            code = []; index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code.append(lines[index]); index += 1
            longest = max([len(row) for row in code] or [1])
            font_size = min(8.1, BODY_W/(max(longest,1)*.64))
            style = ParagraphStyle("Code", fontName="A2EMono", fontSize=max(font_size,5.5), leading=max(font_size,5.5)*1.45,
                                   textColor=NAVY, backColor=CREAM, borderPadding=9, spaceBefore=5, spaceAfter=15)
            story.append(Preformatted("\n".join(code), style))
            index += 1; continue
        image = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", line)
        if image:
            image_path = source.parent / image.group(2)
            if not image_path.exists(): raise FileNotFoundError(image_path)
            image_size = ImageReader(str(image_path)).getSize()
            scale = min(BODY_W/image_size[0], 275/image_size[1])
            figure = Image(str(image_path), width=image_size[0]*scale, height=image_size[1]*scale)
            figure.hAlign = "CENTER"
            story.append(KeepTogether([Spacer(1,4),figure,Spacer(1,7),Paragraph(inline(image.group(1),source), STYLES["caption"])]))
            index += 1; continue
        heading = re.match(r"^(#{1,5})\s+(.+)$", line)
        if heading:
            level, text = len(heading.group(1)), heading.group(2)
            if level == 1 or (level == 2 and text.startswith("Guide d’")) or (level == 2 and text.startswith("Guide d'")):
                index += 1; continue
            if level == 2:
                if story: story.append(PageBreak())
                story.append(Paragraph(inline(text,source),STYLES["h2"]))
            else: story.append(Paragraph(inline(text,source),STYLES["h3" if level == 3 else "h4"]))
            index += 1; continue
        if line.startswith("|") and index+1 < len(lines) and re.match(r"^\s*\|?\s*:?-{3}", lines[index+1]):
            rows = [[cell.strip() for cell in line.strip("|").split("|")]]
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                rows.append([cell.strip() for cell in lines[index].strip().strip("|").split("|")]); index += 1
            story.extend(table(rows,source)); continue
        if re.fullmatch(r"[-*_]{3,}", line):
            story.append(HRFlowable(width="100%",thickness=.5,color=GOLD,spaceBefore=8,spaceAfter=12)); index += 1; continue
        bullet = re.match(r"^(\s*)(?:([-*])|(\d+)\.)\s+(.+)$", raw)
        if bullet:
            indentation = len(bullet.group(1)) // 2
            style = ParagraphStyle("List",parent=STYLES["body"],leftIndent=14+indentation*11,bulletIndent=indentation*11,bulletFontName="A2E",spaceAfter=5)
            text = bullet.group(4)
            text = re.sub(r"^\[ \]\s*", "À vérifier : ", text)
            story.append(Paragraph(inline(text,source),style,bulletText=(bullet.group(3)+"." if bullet.group(3) else "-")))
            index += 1; continue
        if line.startswith("> "):
            story.append(Paragraph(inline(line[2:],source),STYLES["note"])); index += 1; continue
        paragraph = [line]; index += 1
        while index < len(lines) and lines[index].strip() and not re.match(r"^\s*(?:#|```|!\[|\||>|[-*]\s|\d+\.\s)",lines[index]):
            paragraph.append(lines[index].strip()); index += 1
        text = " ".join(paragraph)
        style = STYLES["caption"] if text.startswith("*") and text.endswith("*") else STYLES["body"]
        story.append(Paragraph(inline(text,source),style))
    return story

def make_book(source_name, filename, label, title, subtitle, audience, number):
    source = DOCS / source_name
    story = [Spacer(1, 150), Paragraph(f"{number} / LES GUIDES A2E", ParagraphStyle("CoverKicker",fontName="A2EB",fontSize=10,leading=14,textColor=GOLD,spaceAfter=22)),
             Paragraph(title, STYLES["cover_title"]), Paragraph(subtitle, STYLES["cover_sub"]),
             Spacer(1, 35), Paragraph(audience, STYLES["cover_sub"]),
             NextPageTemplate("Body"), PageBreak(), Paragraph("Votre guide, en un regard.", STYLES["h2"])]
    # The contents heading should not list itself.
    story[-1].style = ParagraphStyle("ContentsTitle",parent=STYLES["h2"])
    story.append(Paragraph("Les procédures illustrent les écrans de la V1. Les données de préparation sont des exemples ; les coordonnées, prix et réglages d’entreprise doivent être validés avant ouverture au public.", STYLES["body"]))
    if source_name == "deploiement-et-email.md":
        intro = source.read_text(encoding="utf-8-sig").split("## 1.",1)[0].splitlines()[1:]
        story.append(Paragraph(inline(" ".join(line.strip() for line in intro if line.strip()),source),STYLES["caption"]))
    toc = TableOfContents(); toc.levelStyles = [STYLES["toc"]]
    story.extend([Spacer(1,15),toc,PageBreak()])
    story.extend(markdown_story(source))
    target = OUT / filename
    Handbook(target,label).multiBuild(story)
    reader = PdfReader(str(target))
    assert len(reader.pages) >= 5
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert "A2E" in text and "V1" in text
    assert "placeholder" not in text.lower()
    assert "\ufffd" not in text, "Invalid Unicode extraction"
    shutil.copyfile(target,ARCHIVE/filename)
    print(f"PASS {filename}: {len(reader.pages)} pages, {target.stat().st_size} bytes")

if __name__ == "__main__":
    make_book("guide-utilisation-administration.md","A2E-V1-Utilisation-et-administration.pdf",
              "Utilisation et administration", "Utiliser.<br/>Piloter.<br/>Faire avancer.",
              "Le guide complet du site et de l’espace de gestion.",
              "Parcours client - CRM - Catalogue - Cotations<br/>Réalisations - Avis - Notifications - KPI", "01")
    make_book("deploiement-et-email.md","A2E-V1-Deploiement-et-email.pdf",
              "Déploiement et email", "Déployer.<br/>Configurer.<br/>Conserver.",
              "Installer la V1, protéger les données et raccorder les emails.",
              "Portainer Git - NAS et VPS - Prérequis<br/>SMTP - Sauvegarde - Restauration - Dépannage", "02")
