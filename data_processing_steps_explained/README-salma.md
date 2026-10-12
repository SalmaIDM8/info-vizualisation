# Data Processing Steps


## Scope

The current processing script is:

[`scripts/01_data_cleaning.py`](../scripts/01_data_cleaning.py)

It prepares the raw transaction data for analysis and visualization. It does not remove outliers.

## Input and output

| Purpose | Path |
|---|---|
| Raw input | `data_raw/credit_card_fraud_2026.csv` |
| Cleaned output | `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv` |
| Processing script | `scripts/01_data_cleaning.py` |

The script builds paths relative to its own location, so it should be run from
the project root with:

```powershell
python scripts\01_data_cleaning.py
```

The output directory is created automatically if it does not already exist.
The raw input file must exist before the script is run.

## Current processing logic

### 1. Load the raw CSV

The script reads the raw CSV with `pandas.read_csv`. The original dataset
contains 26 columns and transaction-level rows.

### 2. Select the analysis columns

The cleaned dataset currently keeps the 22 columns as discussed.

The following four raw columns are intentionally not included in the current
cleaned output, *more will be removed later as discussed in the class*:

- `hours_since_last_txn`
- `card_age_months`
- `customer_age`
- `day_of_week`

### Fill missing values

Missing values are filled according to the inferred pandas data type:

- Numeric columns: missing values become `0`.
- Text and boolean columns: missing values become `"Unknown"`.

No rows are removed during this step. No duplicate removal, range validation,
type conversion, normalization, or outlier treatment is currently performed.
BUT we still keep the script because we HAVE TO

### Export the cleaned CSV

The selected and filled data is written to:

`data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv`


## Change log

### v1 - Current baseline

- **Script:** `scripts/01_data_cleaning.py`
- **Input:** `data_raw/credit_card_fraud_2026.csv`
- **Output:** `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv`
- **Changes:** selected 22 analysis columns from the raw dataset and filled
  missing numeric values with `0` and missing text/boolean values with
  `"Unknown"`.
- **Rows removed:** none.
- **Columns removed:** `hours_since_last_txn`, `card_age_months`,
  `customer_age`, and `day_of_week`.
