# Data Feature Engineering Steps - Hafid El Jaghaoui

## Scope

The processing script is: `scripts/02_data_filtering_hafid.py`

It enriches the cleaned dataset provided by Salma (`01_data_cleaning.py`) by calculating new feature columns required for the D3.js interactive histogram. Based on the team's requirements, it now generates **two distinct outputs**: a fully enriched dataset (for general use) and a filtered, lightweight dataset (specifically for D3.js).

## Input and Output

| **Purpose** | **Path** |
| --- | --- |
| Cleaned input (Salma) | `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv` |
| Full Enriched output | `data_processed_hafid/hafid_enriched_full.csv` |
| Filtered lightweight output | `data_processed_hafid/hafid_histogram_data.csv` |
| Processing script | `scripts/02_data_filtering_hafid.py` |

Run from project root:

```bash
python scripts/02_data_filtering_hafid.py
```

## Processing Logic & Exported Columns

### 1. Calculated Columns (Feature Engineering)
- `amount_category`: Binned amount (`< $50`, `$50 - $150`, `$150 - $500`, `> $500`) for D3.js grouping.
- `amount_to_mean_ratio`: Ratio comparing transaction amount against average normal transaction value.
- `is_high_risk_amount`: Boolean flag (`True`/`False`) indicating if the amount exceeds average fraud threshold.

### 2. Dual Export System
- **File 2 (Full Enriched):** Keeps all initial 22 columns from Salma + the 3 new calculated columns. Useful for further analysis by the team.
- **File 3 (Filtered):** To keep the dataset lightweight and optimized for D3.js rendering, unused attributes are filtered out. The final `hafid_histogram_data.csv` retains only 5 required columns (`amount_usd`, `is_fraud`, `amount_category`, `amount_to_mean_ratio`, `is_high_risk_amount`).

### 3. Baseline Statistics
Computes fraud rates by foreign transaction flag and mean amounts for visual annotations in D3.js.