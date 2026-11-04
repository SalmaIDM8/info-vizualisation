# Data Feature Engineering Steps - Hafid El Jaghaoui

## Scope

The processing script is: `scripts/02_data_filtering_hafid.py`

It enriches the cleaned dataset provided by Salma (`01_data_cleaning.py`) by calculating new feature columns required for the D3.js interactive histogram without removing any existing attributes.

## Input and Output

| **Purpose** | **Path** |
| --- | --- |
| Cleaned input | `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv` |
| Enriched output | `data_processed_hafid/hafid_histogram_data.csv` |
| Processing script | `scripts/02_data_filtering_hafid.py` |

Run from project root:

```bash
python scripts/02_data_filtering_hafid.py
```

## Processing Logic & Added Columns

### 1. Dataset Preservation

The script keeps all initial columns from Salma's cleaned dataset to preserve complete transaction context.

### 2. Added Calculated Columns (Feature Engineering)

- `amount_category`: Bins `amount_usd` into 4 categories (`< $50`, `$50 - $150`, `$150 - $500`, `> $500`) for D3.js grouping.
- `amount_to_mean_ratio`: Ratio comparing transaction amount against average normal transaction value.
- `is_high_risk_amount`: Boolean flag (`True`/`False`) indicating if the transaction amount exceeds average fraud threshold.

### 3. Baseline Statistics

Computes fraud rates by foreign transaction flag and mean amounts for visual annotations in D3.js.
