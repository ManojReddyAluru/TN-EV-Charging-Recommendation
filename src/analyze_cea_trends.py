
from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt

# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "tn_cea_monthly_consumption.csv"
OUTPUT_DIR = BASE_DIR / "data" / "processed"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load and validate data
df = pd.read_csv(INPUT_FILE)
df["report_month"] = pd.to_datetime(
    df["report_month"], format="%Y-%m"
)
df = df.sort_values("report_month")

if df["report_month"].duplicated().any():
    raise ValueError("Duplicate report months found.")

if df["monthly_total_mu"].isna().any():
    raise ValueError("Monthly consumption totals contain missing values.")

# Calculate summary statistics
peak = df.loc[df["monthly_total_mu"].idxmax()]
lowest = df.loc[df["monthly_total_mu"].idxmin()]

jan_2025 = df.loc[
    df["report_month"] == pd.Timestamp("2025-01-01"),
    "monthly_total_mu"
].iloc[0]

mar_2026 = df.loc[
    df["report_month"] == pd.Timestamp("2026-03-01"),
    "monthly_total_mu"
].iloc[0]

percent_change = ((mar_2026 - jan_2025) / jan_2025) * 100

summary = [
    "CEA EV Charging Consumption Analysis",
    "====================================",
    f"Records analysed: {len(df)}",
    f"Period: {df['report_month'].min():%B %Y} to "
    f"{df['report_month'].max():%B %Y}",
    f"Average monthly consumption: {df['monthly_total_mu'].mean():.2f} MU",
    f"Highest month: {peak['report_month']:%B %Y} "
    f"({peak['monthly_total_mu']:.2f} MU)",
    f"Lowest month: {lowest['report_month']:%B %Y} "
    f"({lowest['monthly_total_mu']:.2f} MU)",
    f"Change from January 2025 to March 2026: {percent_change:.2f}%",
    "",
    "Note: MU means million units (million kWh).",
    "These are state-level consumption figures, not station-level demand."
]

summary_text = "\n".join(summary)

summary_file = OUTPUT_DIR / "cea_monthly_analysis_summary.txt"
summary_file.write_text(summary_text, encoding="utf-8")

# Generate monthly trend chart
plot_df = df.copy()
plot_df["month_label"] = plot_df["report_month"].dt.strftime("%b %Y")

plt.figure(figsize=(12, 6))
plt.plot(
    plot_df["month_label"],
    plot_df["monthly_total_mu"],
    marker="o",
    linewidth=2
)

plt.title("Tamil Nadu EV Charging Electricity Consumption")
plt.xlabel("Report month")
plt.ylabel("Monthly consumption (MU)")
plt.xticks(rotation=45, ha="right")
plt.grid(True, alpha=0.3)
plt.tight_layout()

chart_file = OUTPUT_DIR / "cea_monthly_trend.png"
plt.savefig(chart_file, dpi=200, bbox_inches="tight")
plt.close()

print(summary_text)
print(f"\nChart saved to: {chart_file}")
print(f"Summary saved to: {summary_file}")
