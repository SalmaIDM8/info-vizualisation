# Heatmap Data Processing — Hiba Bacha

## 1. Objective

This part of the project prepares the data required for the **Credit Card Fraud Analysis Heatmap**.

The Heatmap aims to identify combinations of merchant categories and transaction amount ranges associated with higher fraud rates.

The processing script adds new calculated columns to the dataset already processed by Hafid, while preserving all existing rows and columns.

## 2. Input and Output Files

**Input dataset:**

`data_processed_hafid/hafid_histogram_data.csv`

**Python script:**

`scripts/03_heatmap_processing_hiba.py`

**Output dataset:**

`data_processed_hiba/hiba_heatmap_data.csv`

The original dataset is not overwritten.

## 3. Data Processing

The Python script uses Pandas to create eight derived columns.

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

### Amount Range Transformation

The original `amount_usd` attribute is transformed into an ordinal attribute called `amount_range`.

The following intervals are used:

- $0–25
- $25–50
- $50–100
- $100–250
- $250–500
- $500–1000
- $1000+

### Fraud Rate Calculation

Transactions are grouped by `merchant_category` and `amount_range`.

The fraud rate is calculated using:

**fraud_rate = (fraud_count / total_count) × 100**

The calculated group statistics are then added to the corresponding transaction rows.

## 4. Dataset Preservation

The script preserves the original transactions and existing columns.

**Processing results:**

| Property | Before | After |
|---|---:|---:|
| Number of rows | 20,000 | 20,000 |
| Number of columns | 25 | 33 |

A total of **8 new columns** are added without removing any original rows or columns.

## 5. How to Run

From the root directory of the project, install the required dependency:

```bash
python -m pip install pandas
```

Run the processing script:

```bash
python scripts/03_heatmap_processing_hiba.py
```

The processed CSV file will be generated in:

`data_processed_hiba/hiba_heatmap_data.csv`

## 6. Heatmap Visualization

The Heatmap uses the following visual mapping:

| Visual Element | Data Attribute |
|---|---|
| X-axis | `amount_range` |
| Y-axis | `merchant_category` |
| Cell color | `fraud_rate` |
| Payment Channel Filter | `channel` |

The color intensity represents the fraud rate, from lower to higher values.

The visualization provides two levels:

- **Overview:** fraud rates across merchant categories and amount ranges.
- **Detailed View:** individual transactions and statistics for a selected Heatmap cell.

**Important:** The Python script calculates group statistics using the complete input dataset. When a user applies a filter in the D3.js visualization, the group statistics must be recalculated using the filtered transactions.

## 7. Technologies

- Python
- Pandas
- CSV
- D3.js v5 (Heatmap visualization)

## 8. Contribution

**Contributor:** Hiba Bacha

**Branch:** `hiba/heatmap-processing`

**Contribution:** Creation of the Python data-processing script and addition of derived attributes required for the Heatmap visualization.
