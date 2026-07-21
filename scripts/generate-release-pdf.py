from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "A2E-recapitulatif-client-2026-07-21.pdf"
regular = "Helvetica"
bold = "Helvetica-Bold"
font = Path(r"C:\Windows\Fonts\segoeui.ttf")
font_bold = Path(r"C:\Windows\Fonts\segoeuib.ttf")
if font.exists() and font_bold.exists():
    pdfmetrics.registerFont(TTFont("A2E", str(font)))
    pdfmetrics.registerFont(TTFont("A2E-Bold", str(font_bold)))
    regular, bold = "A2E", "A2E-Bold"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleA2E", parent=styles["Title"], fontName=bold, fontSize=24, leading=28, textColor="#071A3A", spaceAfter=8))
styles.add(ParagraphStyle(name="SubA2E", parent=styles["Normal"], fontName=regular, fontSize=10, leading=15, textColor="#59616D", spaceAfter=12))
styles.add(ParagraphStyle(name="HeadA2E", parent=styles["Heading2"], fontName=bold, fontSize=14, leading=18, textColor="#071A3A", spaceBefore=10, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyA2E", parent=styles["BodyText"], fontName=regular, fontSize=9.5, leading=14, textColor="#28313D", leftIndent=12, firstLineIndent=-8, spaceAfter=4))
styles.add(ParagraphStyle(name="BoxA2E", parent=styles["BodyText"], fontName=regular, fontSize=10, leading=15, textColor="#071A3A", backColor="#F4F1E8", borderColor="#C8B47A", borderWidth=0.6, borderPadding=9, spaceBefore=7, spaceAfter=7))

sections = {
    "1. Experience du visiteur": ["Page d'accueil allegee avec accroche, expertises et acces direct a la calculette.", "Contenus detailles repartis dans des pages dediees pour eviter une premiere page trop chargee.", "Titres modernises avec une police plus contemporaine et lisible.", "Parcours oriente conversion : estimation, pre-devis et prise de contact.", "Zone d'intervention harmonisee sur toute l'Ile-de-France, notamment 77, 93 et 95."],
    "2. Simulateur et pre-devis": ["Plusieurs postes peuvent etre combines dans un seul dossier : fenetres + ITE, electricite + plomberie, etc.", "Fenetres detaillees par ouvrant : fenetre, porte-fenetre, baie vitree et porte d'entree.", "Prise en compte des dimensions, du PVC ou de l'aluminium, de l'ouverture, de la pose et des volets motorises.", "Les choix et montants sont visibles avant le formulaire et le telechargement du PDF.", "Les montants sont recalcules cote serveur pour fiabiliser le resultat."],
    "3. Prix et catalogue administrable": ["Modification des prix bas, moyens et hauts depuis l'administration.", "Ajout de nouvelles lignes : accessoires, rideaux, equipements ou options de pose.", "Chaque ligne peut recevoir une description, une reference materiel et une TVA indicative.", "Les modifications sont conservees en base apres deconnexion et redemarrage."],
    "4. Realisations, photos et videos": ["Association d'un media a une realisation depuis une liste de projets.", "Modification du titre, de la zone, de la description, du budget, des tags et de la visibilite.", "Compression des images avant envoi pour reduire le temps d'attente.", "Medias conserves dans un volume Docker persistant et recharges sur le site public."],
    "5. Notifications et suivi equipe": ["Plusieurs destinataires peuvent etre ajoutes, un par ligne.", "Choix du canal : Brevo API, OVH SMTP, Gmail SMTP ou autre serveur SMTP.", "Evenements activables : nouveau lead, PDF genere, media publie, securite, Telegram et suivi des visites.", "Le PDF peut etre transmis avec sa piece jointe detaillee.", "Les secrets restent dans Portainer, jamais dans GitHub."],
    "6. Fiabilite et mise en production": ["Requetes invalides ou trop volumineuses refusees proprement.", "En-tetes HTTP de protection ajoutes pour la production.", "Routes administratives rechargees dynamiquement pour eviter les valeurs anciennes.", "Verification TypeScript et build Next.js valides.", "Deploiement compatible Docker, GitHub Container Registry, Portainer et Nginx Proxy Manager."]
}

story = [Paragraph("A2E Renovation", styles["TitleA2E"]), Paragraph("Recapitulatif client - evolutions realisees depuis le 21 juillet 2026", styles["SubA2E"]), Paragraph("Cette version rend le site plus clair, plus rassurant et plus utile pour transformer une visite en demande qualifiee.", styles["BoxA2E"])]
for heading, bullets in sections.items():
    story.append(Paragraph(heading, styles["HeadA2E"]))
    for bullet in bullets:
        story.append(Paragraph(f"• {bullet}", styles["BodyA2E"]))
story.append(Paragraph("Mise en ligne", styles["HeadA2E"]))
for bullet in ["Attendre la fin du build GitHub Actions.", "Mettre a jour la stack A2E dans Portainer avec recuperation de la nouvelle image.", "Verifier que a2e-web repasse healthy.", "Tester un lead, le PDF, la reception email et une realisation publique."]:
    story.append(Paragraph(f"• {bullet}", styles["BodyA2E"]))
story.append(Paragraph("Les montants affiches sont indicatifs. Ils doivent etre confirmes apres metrage, contraintes d'acces et visite technique.", styles["BoxA2E"]))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(regular, 8)
    canvas.setFillColorRGB(0.35, 0.38, 0.43)
    canvas.drawString(18 * mm, 12 * mm, "A2E Renovation - Recapitulatif de livraison")
    canvas.drawRightString(192 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=17 * mm, bottomMargin=20 * mm, title="A2E Renovation - Recapitulatif client")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
