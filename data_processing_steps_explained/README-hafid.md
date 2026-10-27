# Data Feature Engineering Steps - Hafid El Jaghaoui

## Scope

The processing script is: `scripts/02_data_filtering_hafid.py`

It enriches the cleaned dataset provided by Salma (`01_data_cleaning.py`) by calculating new feature columns required for the D3.js interactive histogram, and filters the dataset to keep only the attributes needed for visualization.

## Input and Output

| **Purpose** | **Path** |
| --- | --- |
| Cleaned input | `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv` |
| Filtered & enriched output | `data_processed_hafid/hafid_histogram_data.csv` |
| Processing script | `scripts/02_data_filtering_hafid.py` |

Run from project root:

```bash
python scripts/02_data_filtering_hafid.py
```

## Processing Logic & Exported Columns

### 1. Column Selection & Optimization

To keep the dataset lightweight and optimized for D3.js rendering, unused initial attributes are filtered out. The final dataset retains only 5 required columns:
- `amount_usd`: Transaction amount in USD.
- `is_fraud`: Boolean flag indicating fraud status.
- `amount_category`: Binned amount (`< $50`, `$50 - $150`, `$150 - $500`, `> $500`) for D3.js grouping.
- `amount_to_mean_ratio`: Ratio comparing transaction amount against average normal transaction value.
- `is_high_risk_amount`: Boolean flag (`True`/`False`) indicating if the amount exceeds average fraud threshold.

### 2. Baseline Statistics

Computes fraud rates by foreign transaction flag and mean amounts for visual annotations in D3.js.