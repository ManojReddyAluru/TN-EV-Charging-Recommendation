
from pathlib import Path
import re
import pandas as pd
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "data" / "raw" / "cea_reports"
OUT_DIR = ROOT / "data" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

def find_month(text, filename):
    # Prefer the report's printed month and year.
    candidates = [text[:5000], filename]

    for source in candidates:
        match = re.search(
            r"\b(January|February|March|April|May|June|July|"
            r"August|September|October|November|December|"
            r"Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
            r"[\s\-/]+(20\d{2})\b",
            source,
            re.IGNORECASE,
        )
        if match:
            month = MONTHS[match.group(1).lower()]
            year = int(match.group(2))
            return f"{year}-{month:02d}"

        # Support filenames such as cea_ev_charging_report_2025-01.pdf
        match = re.search(r"\b(20\d{2})[-_](0[1-9]|1[0-2])\b", source)
        if match:
            return f"{match.group(1)}-{match.group(2)}"

    return None

def parse_number(token):
    token = token.strip().replace(",", "")
    if token == "-":
        return None
    try:
        return float(token)
    except ValueError:
        return None

def extract_tamil_nadu(text):
    # Normalize whitespace because PDF table rows can wrap across lines.
    text = re.sub(r"\s+", " ", text)

    # Newer CEA report layout:
    # State, four monthly values, then four financial-year cumulative values.
    pattern = re.compile(
        r"\bTamil\s+Nadu\b\s+"
        r"(-|[\d,]+(?:\.\d+)?)\s+"
        r"(-|[\d,]+(?:\.\d+)?)\s+"
        r"(-|[\d,]+(?:\.\d+)?)\s+"
        r"(-|[\d,]+(?:\.\d+)?)\s+"
        r"(-|[\d,]+(?:\.\d+)?)\s+"
        r"(-|[\d,]+(?:\.\d+)?)\s+"
        r"(-|[\d,]+(?:\.\d+)?)\s+"
        r"(-|[\d,]+(?:\.\d+)?)\b",
        re.IGNORECASE,
    )

    match = pattern.search(text)
    if not match:
        return None

    values = [parse_number(v) for v in match.groups()]

    return {
        "monthly_regular_pcs_mu": values[0],
        "monthly_heavy_duty_pcs_mu": values[1],
        "monthly_other_ev_stations_mu": values[2],
        "monthly_total_mu": values[3],
        "fy_regular_pcs_mu": values[4],
        "fy_heavy_duty_pcs_mu": values[5],
        "fy_other_ev_stations_mu": values[6],
        "fy_total_mu": values[7],
    }

pdf_files = sorted(PDF_DIR.glob("*.pdf"))

if not pdf_files:
    raise FileNotFoundError(
        f"No PDFs found in {PDF_DIR}\n"
        "Place all downloaded CEA reports in this folder."
    )

records = []
review = []

print("PDF reports found:", len(pdf_files))

for pdf_path in pdf_files:
    print("Reading:", pdf_path.name)

    try:
        reader = PdfReader(str(pdf_path))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)

        report_month = find_month(text, pdf_path.name)
        values = extract_tamil_nadu(text)

        if not report_month:
            review.append({
                "file": pdf_path.name,
                "reason": "Could not identify report month",
            })
            continue

        if not values:
            review.append({
                "file": pdf_path.name,
                "reason": "Tamil Nadu row not found in expected table format",
            })
            continue

        records.append({
            "report_month": report_month,
            "source_file": pdf_path.name,
            **values,
        })

    except Exception as exc:
        review.append({
            "file": pdf_path.name,
            "reason": str(exc),
        })

df = pd.DataFrame(records)

if not df.empty:
    df = df.sort_values("report_month")

    # Reports must be unique by reporting month.
    duplicates = df[df.duplicated("report_month", keep=False)]
    if not duplicates.empty:
        duplicates.to_csv(
            OUT_DIR / "cea_duplicate_months_review.csv",
            index=False,
        )
        print("\nWARNING: Duplicate reporting months found.")
        print(duplicates[["report_month", "source_file"]].to_string(index=False))

    df.to_csv(
        OUT_DIR / "tn_cea_monthly_consumption.csv",
        index=False,
    )

    print("\n===== EXTRACTED MONTHLY DATA =====")
    print(df[[
        "report_month",
        "monthly_regular_pcs_mu",
        "monthly_heavy_duty_pcs_mu",
        "monthly_other_ev_stations_mu",
        "monthly_total_mu",
    ]].to_string(index=False))

    print("\nSuccessful extractions:", len(df))
    print("Unique report months:", df["report_month"].nunique())
else:
    print("\nNo reports were successfully extracted.")

if review:
    review_df = pd.DataFrame(review)
    review_df.to_csv(
        OUT_DIR / "cea_reports_needing_review.csv",
        index=False,
    )
    print("\nReports needing review:", len(review))
    print(review_df.to_string(index=False))

print("\nOutput folder:", OUT_DIR)
