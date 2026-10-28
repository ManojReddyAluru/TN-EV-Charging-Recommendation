
from pathlib import Path
import re
import subprocess
import pandas as pd
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "data" / "raw" / "cea_reports"
OUT_DIR = ROOT / "data" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
OUTPUT = OUT_DIR / "cea_ocr_all_pages_review.csv"

records = []

for pdf_path in sorted(PDF_DIR.glob("*.pdf")):
    match = re.search(r"(20\d{2})[-_](0[1-9]|1[0-2])", pdf_path.name)
    if not match:
        print("Skipping unknown filename:", pdf_path.name)
        continue

    month = f"{match.group(1)}-{match.group(2)}"
    print(f"\nScanning {pdf_path.name}")

    try:
        doc = pymupdf.open(pdf_path)
        found = False

        for page_index in range(len(doc)):
            page = doc[page_index]
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5))
            img_path = OUT_DIR / f"temp_ocr_page_{page_index + 1}.png"
            pix.save(img_path)

            result = subprocess.run(
                [
                    TESSERACT, str(img_path), "stdout",
                    "-l", "eng", "--psm", "6"
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )

            img_path.unlink(missing_ok=True)
            ocr_text = result.stdout or ""

            # Match common OCR variants of Tamil Nadu
            lines = [
                line.strip() for line in ocr_text.splitlines()
                if re.search(r"Tamil\s+Nadu|Tamil\s+Naidu|Tamil\s+Nad[uoy]", line, re.I)
            ]

            if lines:
                found = True
                print(f"  Page {page_index + 1}: {' | '.join(lines)}")
                records.append({
                    "report_month": month,
                    "source_file": pdf_path.name,
                    "pdf_page": page_index + 1,
                    "tamil_nadu_ocr_line": " | ".join(lines),
                    "status": "REVIEW OCR VALUES",
                })

        doc.close()

        if not found:
            print("  No Tamil Nadu row detected on any page.")
            records.append({
                "report_month": month,
                "source_file": pdf_path.name,
                "pdf_page": None,
                "tamil_nadu_ocr_line": "",
                "status": "MANUAL REVIEW REQUIRED",
            })

    except Exception as exc:
        print("  ERROR:", exc)
        records.append({
            "report_month": month,
            "source_file": pdf_path.name,
            "pdf_page": None,
            "tamil_nadu_ocr_line": "",
            "status": f"ERROR: {exc}",
        })

df = pd.DataFrame(records)
df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

print("\nSaved review file:", OUTPUT)
print("\nStatus summary:")
print(df.groupby("status").size().to_string())
