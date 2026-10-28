
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "data" / "raw" / "cea_ev_charging_report.pdf"

if not PDF_PATH.exists():
    raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

reader = PdfReader(str(PDF_PATH))

print("Number of pages:", len(reader.pages))

for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    print(f"\n{'=' * 20} PAGE {i + 1} {'=' * 20}")
    print(text[:5000] if text.strip() else "[No extractable text]")
