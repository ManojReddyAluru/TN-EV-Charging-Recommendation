
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "processed" / "tn_cea_monthly_consumption.csv"

# Values are transcribed from the CEA report screenshots
# or the OCR output reviewed during this conversation.
# MU = million units of electricity.
rows = [
    # Month, regular, heavy, other, monthly total,
    # cumulative regular, cumulative heavy, cumulative other,
    # cumulative total, verification source

    ["2025-01", 0.66, 0.94, None, 1.60, 12.08, 0.94, None, 13.02, "Screenshot"],
    ["2025-02", 0.57, 0.73, None, 1.30, 12.65, 1.67, None, 14.32, "Screenshot"],
    ["2025-03", 0.67, 1.19, None, 1.85, 13.31, 2.86, None, 16.17, "Screenshot"],
    ["2025-04", 0.83, 1.23, None, 2.06, 0.83, 1.23, None, 2.06, "Screenshot"],
    ["2025-05", 0.79, 1.31, None, 2.10, 1.62, 2.54, None, 4.16, "Screenshot"],
    ["2025-06", 0.92, 1.29, None, 2.21, 2.54, 3.83, None, 6.36, "Screenshot"],
    ["2025-07", 0.84, 0.89, None, 1.73, 3.38, 4.72, None, 8.10, "OCR"],
    ["2025-08", 1.11, 2.58, None, 3.69, 4.49, 7.30, None, 11.79, "Screenshot"],
    ["2025-09", 1.10, 3.03, None, 4.13, 5.59, 10.33, None, 15.91, "OCR"],
    ["2025-10", 1.18, 2.98, None, 4.16, 6.76, 13.31, None, 20.07, "OCR"],
    ["2025-11", 1.15, 2.63, 0.00, 3.78, 7.91, 15.94, 0.00, 23.85, "OCR"],
    ["2025-12", 1.41, 0.87, 0.00, 2.28, 9.32, 16.80, 0.01, 26.12, "OCR"],
    ["2026-01", 1.51, 1.73, 0.01, 3.25, 10.82, 18.53, 0.02, 29.37, "OCR"],
    ["2026-02", 1.57, 1.43, 0.03, 3.02, 12.39, 19.96, 0.05, 32.40, "OCR"],
    ["2026-03", 1.53, 1.59, 0.04, 3.16, 13.93, 21.55, 0.08, 35.55, "OCR"],
]

columns = [
    "report_month",
    "monthly_regular_pcs_mu",
    "monthly_heavy_duty_pcs_mu",
    "monthly_other_ev_stations_mu",
    "monthly_total_mu",
    "cumulative_regular_pcs_mu",
    "cumulative_heavy_duty_pcs_mu",
    "cumulative_other_ev_stations_mu",
    "cumulative_total_mu",
    "verification_source",
]

df = pd.DataFrame(rows, columns=columns)

# Basic integrity checks
assert len(df) == 15, "Expected 15 monthly records"
assert df["report_month"].is_unique, "Duplicate months found"
assert df["report_month"].is_monotonic_increasing, "Months are not ordered"

expected_months = pd.period_range("2025-01", "2026-03", freq="M").astype(str)
assert df["report_month"].tolist() == expected_months.tolist(), \
    "One or more months are missing"

OUT.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(OUT, index=False, encoding="utf-8-sig", na_rep="")

print("Dataset created:", OUT)
print("Records:", len(df))
print("Months:", df["report_month"].iloc[0], "to", df["report_month"].iloc[-1])
print("\nMonthly consumption totals:")
print(df[["report_month", "monthly_total_mu"]].to_string(index=False))
print("\nMissing values by column:")
print(df.isna().sum().to_string())
print("\nIMPORTANT: Verify OCR-derived values against original reports before analysis.")
