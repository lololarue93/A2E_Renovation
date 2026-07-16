from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)

PDF_PATH = OUT / "a2e-exemple-devis-officiel.pdf"
LOGO_PATH = ROOT / "public" / "branding" / "a2e-logo.jpeg"

NAVY = colors.HexColor("#051637")
INK = colors.HexColor("#14233f")
CHAMPAGNE = colors.HexColor("#b9aa8a")
PEARL = colors.HexColor("#faf8f3")
MIST = colors.HexColor("#f3f5f8")


def money(value):
    return f"{value:,.2f} EUR".replace(",", " ").replace(".", ",")


def draw_text(c, text, x, y, size=9, color=INK, font="Helvetica"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)


def draw_right(c, text, x, y, size=9, color=INK, font="Helvetica"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawRightString(x, y, text)


def wrap(c, text, x, y, width, size=9, leading=13, color=INK, font="Helvetica"):
    words = text.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if c.stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            draw_text(c, line, x, y, size, color, font)
            y -= leading
            line = word
    if line:
        draw_text(c, line, x, y, size, color, font)
        y -= leading
    return y


def main():
    c = canvas.Canvas(str(PDF_PATH), pagesize=A4)
    w, h = A4
    margin = 18 * mm

    c.setFillColor(colors.white)
    c.rect(0, 0, w, h, fill=True, stroke=False)

    c.setFillColor(NAVY)
    c.rect(0, h - 34 * mm, w, 34 * mm, fill=True, stroke=False)
    c.setFillColor(CHAMPAGNE)
    c.rect(0, h - 34 * mm, 6 * mm, 34 * mm, fill=True, stroke=False)

    c.drawImage(str(LOGO_PATH), margin, h - 28 * mm, width=48 * mm, height=23 * mm, preserveAspectRatio=True, mask="auto")
    draw_right(c, "DEVIS INDICATIF", w - margin, h - 15 * mm, 18, colors.white, "Helvetica-Bold")
    draw_right(c, "N° A2E-2026-0001", w - margin, h - 23 * mm, 10, colors.white, "Helvetica-Bold")
    draw_right(c, "Exemple non contractuel", w - margin, h - 28 * mm, 8, colors.Color(1, 1, 1, alpha=0.72))

    y = h - 47 * mm
    draw_text(c, "A2E Renovation", margin, y, 11, NAVY, "Helvetica-Bold")
    draw_text(c, "President : Julien CHARRIERE", margin, y - 5 * mm, 8)
    draw_text(c, "Tel. 01 89 40 00 20 - contact@ags-a2e.com", margin, y - 10 * mm, 8)

    box_x = w - margin - 72 * mm
    c.setFillColor(PEARL)
    c.roundRect(box_x, y - 17 * mm, 72 * mm, 24 * mm, 3 * mm, fill=True, stroke=False)
    draw_text(c, "Client", box_x + 5 * mm, y + 1 * mm, 8, CHAMPAGNE, "Helvetica-Bold")
    draw_text(c, "Mme / M. Exemple Client", box_x + 5 * mm, y - 5 * mm, 9, NAVY, "Helvetica-Bold")
    draw_text(c, "93270 Sevran", box_x + 5 * mm, y - 10 * mm, 8)
    draw_text(c, "Projet : fenetres PVC + volets", box_x + 5 * mm, y - 15 * mm, 8)

    y -= 33 * mm
    c.setStrokeColor(colors.HexColor("#dfe3e8"))
    c.line(margin, y, w - margin, y)
    y -= 9 * mm
    draw_text(c, "Date d'emission : 09/07/2026", margin, y, 8)
    draw_text(c, "Validite de l'offre : 30 jours", margin + 55 * mm, y, 8)
    draw_text(c, "Delai indicatif : 2 a 4 jours apres validation metrage", margin + 112 * mm, y, 8)

    y -= 14 * mm
    draw_text(c, "Synthese de l'offre", margin, y, 16, NAVY, "Helvetica-Bold")
    y -= 7 * mm
    y = wrap(
        c,
        "Cette proposition cadre une base de travaux lisible avant visite technique : fourniture des menuiseries, pack de pose, options choisies, protection chantier et reserves de metrage.",
        margin,
        y,
        w - 2 * margin,
        9,
        13,
    )

    y -= 5 * mm
    table_x = margin
    table_w = w - 2 * margin
    row_h = 10 * mm
    headers = [
        ("Designation", table_x + 3 * mm),
        ("Qte", table_x + 105 * mm),
        ("Unite", table_x + 116 * mm),
        ("PU moyen", table_x + 130 * mm),
        ("Total HT", table_x + table_w - 17 * mm),
    ]

    c.setFillColor(NAVY)
    c.roundRect(table_x, y - row_h, table_w, row_h, 2 * mm, fill=True, stroke=False)
    for header, x in headers:
        draw_text(c, header, x, y - 6.5 * mm, 8, colors.white, "Helvetica-Bold")
    y -= row_h

    lines = [
        ("Fenetre PVC double vitrage standard", 6, "unit.", 750),
        ("Pack pose renovation, reglages, etancheite", 6, "unit.", 220),
        ("Option oscillo-battant", 3, "unit.", 140),
        ("Volets roulants motorises", 4, "unit.", 800),
        ("Protection chantier, evacuation emballages", 1, "forfait", 280),
    ]
    subtotal = 0
    for idx, (label, qty, unit, pu) in enumerate(lines):
        c.setFillColor(PEARL if idx % 2 == 0 else colors.white)
        c.rect(table_x, y - row_h, table_w, row_h, fill=True, stroke=False)
        total = qty * pu
        subtotal += total
        draw_text(c, label, table_x + 3 * mm, y - 6.5 * mm, 8)
        draw_right(c, str(qty), table_x + 109 * mm, y - 6.5 * mm, 8)
        draw_text(c, unit, table_x + 116 * mm, y - 6.5 * mm, 8)
        draw_right(c, money(pu), table_x + 144 * mm, y - 6.5 * mm, 8)
        draw_right(c, money(total), table_x + table_w - 3 * mm, y - 6.5 * mm, 8, NAVY, "Helvetica-Bold")
        y -= row_h

    commercial_advantage = 280
    taxable = subtotal - commercial_advantage
    vat = taxable * 0.055
    total_ttc = taxable + vat

    y -= 8 * mm
    totals_x = w - margin - 72 * mm
    c.setFillColor(MIST)
    c.roundRect(totals_x, y - 39 * mm, 72 * mm, 39 * mm, 3 * mm, fill=True, stroke=False)
    draw_text(c, "Total HT avant avantage", totals_x + 5 * mm, y - 7 * mm, 8)
    draw_right(c, money(subtotal), w - margin - 5 * mm, y - 7 * mm, 8, NAVY, "Helvetica-Bold")
    draw_text(c, "Avantage planning*", totals_x + 5 * mm, y - 16 * mm, 8, CHAMPAGNE, "Helvetica-Bold")
    draw_right(c, f"- {money(commercial_advantage)}", w - margin - 5 * mm, y - 16 * mm, 8, CHAMPAGNE, "Helvetica-Bold")
    draw_text(c, "TVA indicative 5,5 %", totals_x + 5 * mm, y - 25 * mm, 8)
    draw_right(c, money(vat), w - margin - 5 * mm, y - 25 * mm, 8)
    draw_text(c, "Total TTC indicatif", totals_x + 5 * mm, y - 34 * mm, 10, NAVY, "Helvetica-Bold")
    draw_right(c, money(total_ttc), w - margin - 5 * mm, y - 34 * mm, 10, NAVY, "Helvetica-Bold")

    draw_text(c, "Fourchette indicative recommandee : 8 900 a 12 800 EUR TTC", margin, y - 8 * mm, 10, NAVY, "Helvetica-Bold")
    y -= 49 * mm

    c.setFillColor(PEARL)
    c.roundRect(margin, y - 34 * mm, table_w, 34 * mm, 3 * mm, fill=True, stroke=False)
    draw_text(c, "Message commercial", margin + 5 * mm, y - 8 * mm, 9, CHAMPAGNE, "Helvetica-Bold")
    wrap(
        c,
        "A2E maintient une proposition lisible et qualitative : le prix privilegie une pose propre, des reglages soignes et un suivi chantier clair plutot qu'une remise artificielle. *L'avantage planning correspond aux frais de protection et evacuation offerts si le metrage est valide sous 15 jours.",
        margin + 5 * mm,
        y - 15 * mm,
        table_w - 10 * mm,
        8,
        11,
    )

    c.setStrokeColor(CHAMPAGNE)
    c.line(margin, 23 * mm, w - margin, 23 * mm)
    draw_text(c, "A2E Renovation - document exemple genere pour validation du style de devis", margin, 15 * mm, 7, colors.HexColor("#6b7280"))
    draw_right(c, "Page 1/2", w - margin, 15 * mm, 7, colors.HexColor("#6b7280"))

    c.showPage()

    c.setFillColor(colors.white)
    c.rect(0, 0, w, h, fill=True, stroke=False)
    c.setFillColor(NAVY)
    c.rect(0, h - 22 * mm, w, 22 * mm, fill=True, stroke=False)
    c.setFillColor(CHAMPAGNE)
    c.rect(0, h - 22 * mm, 6 * mm, 22 * mm, fill=True, stroke=False)
    c.drawImage(str(LOGO_PATH), margin, h - 18 * mm, width=34 * mm, height=14 * mm, preserveAspectRatio=True, mask="auto")
    draw_right(c, "CONDITIONS DE VALIDATION", w - margin, h - 12 * mm, 14, colors.white, "Helvetica-Bold")

    y = h - 40 * mm
    draw_text(c, "Conditions et reserves", margin, y, 16, NAVY, "Helvetica-Bold")
    y -= 10 * mm
    notes = [
        "Devis definitif sous reserve de visite technique, metrage, disponibilite fournisseur et validation administrative.",
        "Les aides de l'Etat ne sont pas integrees automatiquement car les dispositifs changent regulierement.",
        "Certifications et qualifications RGE / Qualibat a confirmer selon justificatifs de l'entreprise.",
        "Toute modification de gamme, dimensions, acces chantier ou support existant peut modifier la proposition.",
        "Le planning est reserve apres validation du devis definitif, acompte eventuel et confirmation fournisseur."
    ]
    for note in notes:
        y = wrap(c, f"- {note}", margin, y, table_w, 9, 14)

    y -= 8 * mm
    c.setFillColor(PEARL)
    c.roundRect(margin, y - 38 * mm, table_w, 38 * mm, 3 * mm, fill=True, stroke=False)
    draw_text(c, "Bon pour accord", margin + 5 * mm, y - 9 * mm, 11, NAVY, "Helvetica-Bold")
    draw_text(c, "Date :", margin + 5 * mm, y - 20 * mm, 9)
    draw_text(c, "Nom et signature client :", margin + 55 * mm, y - 20 * mm, 9)
    draw_text(c, "Mention manuscrite : bon pour accord", margin + 5 * mm, y - 31 * mm, 8, colors.HexColor("#6b7280"))

    c.setStrokeColor(CHAMPAGNE)
    c.line(margin, 23 * mm, w - margin, 23 * mm)
    draw_text(c, "A2E Renovation - exemple non contractuel", margin, 15 * mm, 7, colors.HexColor("#6b7280"))
    draw_right(c, "Page 2/2", w - margin, 15 * mm, 7, colors.HexColor("#6b7280"))

    c.save()
    print(PDF_PATH)


if __name__ == "__main__":
    main()
