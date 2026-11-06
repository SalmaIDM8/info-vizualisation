# Heatmap Data Processing — Hiba Bacha

## 1. Objective

This part of the project prepares the data required for the **Credit Card Fraud Analysis Heatmap**.

The Heatmap aims to identify combinations of merchant categories and transaction amount ranges associated with higher fraud rates.

The Python processing script extends the dataset previously processed by Hafid by calculating eight additional attributes.

To keep each team member's contribution separate, the script generates two output files:

- A complete enriched dataset containing the original columns and the new Heatmap columns.
- A separate dataset containing only the Heatmap-derived columns and the transaction identifier.

**Hafid's original dataset and processing scripts are not modified.**

## 2. Input and Output Files

### Input Dataset

`data_processed_hafid/hafid_histogram_data.csv`

This dataset contains the transactions previously processed by Hafid.

### Python Script

`scripts/03_heatmap_processing_hiba.py`

This script calculates the attributes required for the Heatmap and exports the results.

### Output Datasets

**1. Complete enriched dataset**

`data_processed_hiba/hiba_heatmap_data.csv`

Contains:

- All 25 original columns.
- The 8 new Heatmap-derived columns.
- 20,000 transaction rows.

**2. Heatmap-only dataset**

`data_processed_hiba/hiba_heatmap_derived_columns.csv`

Contains:

- `transaction_id` (when available in the input dataset).
- The 8 Heatmap-derived columns.
- 20,000 transaction rows.

The `transaction_id` column allows the derived data to be linked back to the original transactions.

Both output files are generated automatically. The original input dataset is preserved.

## 3. Data Processing

The Python script uses **Pandas** to create eight derived attributes.

| New Column | Description |
|---|---|
| `amount_range` | Groups transaction amounts into predefined intervals |
| `total_count` | Total number of transactions for each merchant category and amount range |
| `fraud_count` | Number of fraudulent transactions in each group |
| `legitimate_count` | Number of legitimate transactions in each group |
| `fraud_rate` | Percentage of fraudulent transactions in each group |
| `average_amount` | Average transaction amount in each group |
| `min_amount` | Minimum transaction amount in each group |
| `max_amount` | Maximum transaction amount in each group |

### 3.1 Amount Range Transformation

The original numerical attribute `amount_usd` is transformed into an ordinal categorical attribute called `amount_range`.

The following intervals are used:

- $0–25
- $25–50
- $50–100
- $100–250
- $250–500
- $500–1000
- $1000+

These ranges correspond to the amount intervals used in the Heatmap visualization.

### 3.2 Data Grouping

Transactions are grouped using two attributes:

- `merchant_category`
- `amount_range`

Each group represents a specific merchant category and transaction amount interval.

For each group, the script calculates transaction counts, fraud statistics and amount statistics.

### 3.3 Fraud Rate Calculation

The fraud rate is calculated as:

**fraud_rate = (fraud_count / total_count) × 100**

For example, if a group contains 100 transactions and 15 are fraudulent:

**fraud_rate = (15 / 100) × 100 = 15%**

### 3.4 Amount Statistics

The script also calculates:

- `average_amount`: mean transaction amount within the group.
- `min_amount`: smallest transaction amount within the group.
- `max_amount`: largest transaction amount within the group.

These values support the detailed analysis of transactions associated with a Heatmap cell.

### 3.5 Exporting Derived Attributes

After the calculations, the script produces two CSV files.

The complete CSV preserves the original attributes and adds the calculated statistics to the corresponding transaction rows.

The separate Heatmap CSV contains only the new attributes, along with `transaction_id` when available.

**The group statistics are repeated for transactions belonging to the same merchant category and amount range.** Therefore, the Heatmap-only CSV is a transaction-level table of derived attributes, not a table containing one row per group.

## 4. Dataset Preservation and Processing Results

The script preserves the original dataset structure and does not remove any transaction rows.

### Complete Enriched Dataset

| Property | Before Processing | After Processing |
|---|---:|---:|
| Number of rows | 20,000 | 20,000 |
| Number of columns | 25 | 33 |
| New derived columns | 0 | 8 |

### Heatmap-Only Dataset

| Property | Result |
|---|---|
| Number of rows | 20,000 |
| Number of derived columns | 8 |
| Transaction identifier | `transaction_id`, if available |
| Total columns | 9 when `transaction_id` is present |

The processing script therefore allows the team to use either the complete enriched dataset or the separate Heatmap-derived dataset.

## 5. How to Run

### Step 1 — Install Dependencies

From the root directory of the project, run:

```bash
python -m pip install pandas
```

### Step 2 — Execute the Processing Script

```bash
python scripts/03_heatmap_processing_hiba.py
```

### Step 3 — Check the Generated Files

After successful execution, the following files are available:

```text
data_processed_hiba/
├── hiba_heatmap_data.csv
└── hiba_heatmap_derived_columns.csv
```

The script displays a success message and information about the number of rows and columns.

### Expected Execution Results

```text
PROCESSING COMPLETED SUCCESSFULLY!

Original rows: 20000
Processed rows: 20000

Original columns: 25
Processed columns: 33

Heatmap-only rows: 20000

Both CSV files were saved successfully!
```

## 6. Heatmap Visualization

The Heatmap is implemented using **D3.js v5**.

It represents fraud rates according to merchant categories and transaction amount ranges.

### Visual Mapping

| Visual Element | Data Attribute |
|---|---|
| X-axis | `amount_range` |
| Y-axis | `merchant_category` |
| Cell color | `fraud_rate` |
| Payment Channel Filter | `channel` |

Each Heatmap cell represents a combination of merchant category and amount range.

The cell color encodes the percentage of fraudulent transactions within that group.

### Overview and Detailed View

The visualization supports two levels of analysis.

**Overview**

- Compare fraud rates across merchant categories.
- Identify transaction amount ranges with higher fraud rates.
- Detect combinations associated with potentially higher fraud risk.

**Detailed View**

When a user selects a Heatmap cell, the visualization provides more detailed information about the corresponding transactions, including:

- Total
