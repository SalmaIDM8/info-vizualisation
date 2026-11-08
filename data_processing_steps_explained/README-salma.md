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


## Scatter plot instance (Salma)

Each member produces a processed instance with only the columns their
visualization needs. The instances are then joined into one big table.

| Purpose | Path |
|---|---|
| Input | `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv` |
| Processing script | `scripts/04_scatter_salma.py` |
| Output | `data_processed_salma/salma_scatter_data.csv` |

Run it from the project root, after `01_data_cleaning.py`:

```powershell
python scripts\04_scatter_salma.py
```

### Output: `salma_scatter_data.csv`

One row per transaction: 20,000 rows and 13 columns. Like every member's
instance, it is a single CSV. The grouping is stored as columns, so the chart
gets each group's count and fraud rate with one group-by on the right column.

6 of the 22 cleaned columns are kept (reduce the number of attributes), and 7
derived columns hold the grouping.

| Column | Kind | Why it is kept |
|---|---|---|
| `transaction_id` | Original | Join key for the big table |
| `distance_from_home_km` | Original | x axis |
| `amount_usd` | Original | y axis |
| `is_fraud` | Original, 0/1 | Colour |
| `scatter_distance_band` | Derived | Distance as 5 ordered bands: 0-10, 10-25, 25-50, 50-100, 100+ km (reduce the range of values) |
| `scatter_amount_band` | Derived | Amount as 4 ordered bands: <$50, $50-250, $250-1000, $1000+ |
| `scatter_risk_signal_count` | Derived | How many of the 5 risk flags are true (grouping attributes) |
| `scatter_risk_signals` | Derived | Names of those flags, separated by `\|`, empty when none |
| `merchant_category` | Original | Filter |
| `is_foreign_transaction` | Original, 0/1 | Filter |
| `scatter_cell_L3` | Derived | Grid cell on an 8 x 8 grid (spatial grouping) |
| `scatter_cell_L4` | Derived | Grid cell on a 16 x 16 grid |
| `scatter_cell_L5` | Derived | Grid cell on a 32 x 32 grid |

The five flags grouped into `scatter_risk_signal_count` are `used_vpn`,
`ip_country_mismatch`, `billing_shipping_mismatch`,
`is_ai_generated_scam_attempt` and `is_new_merchant`.

### The three kinds of grouping (Cours 2, slides 64 and 65)

- **By category:** `scatter_distance_band` and `scatter_amount_band`. A
  group-by on them gives the fraud rate per band, for example 125 frauds in
  7,264 transactions for 0-10 km.
- **Grouping attributes:** `scatter_risk_signal_count` replaces five flag
  columns. The fraud rate climbs with it: 0.5% with no signal, 2.2% with one,
  10.0% with two and 31.1% with three.
- **Spatial, on nested levels:** the scatter plot's space is cut into square
  cells, in the chart's own axis space: square-root distance (0 to 256 km) and
  log amount ($1 to $10,000). A cell id reads `L<level>_<ix>_<iy>`. Each level
  splits every cell into four, so the parent of `L4_5_2` is `L3_2_1` (half the
  indexes, rounded down). The levels form a tree, navigated by semantic zooming
  (slide 64: "grouping many levels = trees").

| Level | Grid | Cells with data |
|---|---|---|
| 3 | 8 x 8 | 57 |
| 4 | 16 x 16 | 185 |
| 5 | 32 x 32 | 595 |

At level 3 the distance edges are 0, 4, 16, 36, 64, 100, 144, 196 and 256 km,
and the amount edges are $1, $3.16, $10, $31.62 and so on up to $10,000.

Not done on purpose: grouping by algorithm (k-means and the like). The overview
shows a single cloud of points, so a clustering algorithm would cut it
arbitrarily.

### Checks the script runs

The script stops with `CHECK FAILED` if any of these is false:

- 20,000 rows come out, and `transaction_id` is unique and never empty.
- Every distance is at least 0 and every amount is above 0.
- Every transaction falls in a distance band, an amount band and a grid cell.
- Every grid cell sits inside its parent cell at the level above.

The 7 derived columns are joined into the team table by
`scripts/05_build_team_dataset.py` (see `README-team.md`).

## Change log

### v3 - Team conventions

- **Script:** renamed `scripts/02_scatter_salma.py` to `scripts/04_scatter_salma.py`,
  since 02 and 03 are Hafid's and Hiba's.
- **Output:** moved to `data_processed_salma/salma_scatter_data.csv`, like the
  other members' folders, and committed with the other data files.

### v2 - Scatter plot instance

- **Script:** `scripts/02_scatter_salma.py`
- **Input:** `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv`
- **Output:** `data_processed/salma/scatter_transactions_v1.csv`
- **Changes:** kept 8 columns, wrote True/False as 0/1, and added 6 grouping
  columns: two bands, a risk-signal count grouped from five flags with their
  names, and the cell of each transaction on a three-level spatial grid.
- **Rows removed:** none.

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
