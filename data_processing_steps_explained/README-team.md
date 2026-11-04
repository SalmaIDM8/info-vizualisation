# Team Dataset

One table for the whole team: every transaction once, with the shared cleaned
columns and the columns each member added for their visualization.

| Purpose | Path |
|---|---|
| Team table | `data_team/credit_card_fraud_2026_TEAM_v1.csv` |
| Column list (owner and source of each column) | `data_team/team_columns.csv` |
| Script | `scripts/05_build_team_dataset.py` |

20,000 rows and 40 columns. Load it from any visualization instead of a
member's own file.

## How it is built

The script starts from the cleaned file and adds, for each member, only the
columns that are not in the table yet. Rows are matched on `transaction_id`.

It stops with `CHECK FAILED` if:

- a member's file does not have the same 20,000 transactions;
- `transaction_id` is not unique;
- a cleaned column found in a member's file has different values
  (True/False and 1/0 count as the same value);
- two columns end up with the same name.

## Columns

| Owner | Source file | Columns |
|---|---|---|
| Shared (cleaned) | `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv` | `transaction_id`, `amount_usd`, `merchant_category`, `card_type`, `auth_method`, `channel`, `device_type`, `is_foreign_transaction`, `txn_count_last_24h`, `distance_from_home_km`, `account_balance_usd`, `is_new_merchant`, `used_vpn`, `ip_country_mismatch`, `billing_shipping_mismatch`, `cvv_retry_count`, `velocity_score`, `time_of_day_hour`, `is_ai_generated_scam_attempt`, `merchant_risk_score`, `prior_disputes`, `is_fraud` |
| Hafid (histogram) | `data_processed_hafid/hafid_histogram_data.csv` | `amount_category`, `amount_to_mean_ratio`, `is_high_risk_amount` |
| Hiba (heatmap) | `data_processed_hiba/hiba_heatmap_derived_columns.csv` | `amount_range`, `total_count`, `fraud_count`, `legitimate_count`, `fraud_rate`, `average_amount`, `min_amount`, `max_amount` |
| Salma (scatter plot) | `data_processed_salma/salma_scatter_data.csv` | `scatter_distance_band`, `scatter_amount_band`, `scatter_risk_signal_count`, `scatter_risk_signals`, `scatter_cell_L3`, `scatter_cell_L4`, `scatter_cell_L5` |

Di (line and bar charts) and Mourtada (parallel coordinates) use shared
columns only, so they add none.

- There are three amount bandings with different edges: `amount_category`
  (Hafid), `amount_range` (Hiba) and `scatter_amount_band` (Salma).
- `scatter_risk_signals` is empty when a transaction has no risk signal.

## Adding your columns

1. Write your processed file to `data_processed_<name>/`, with
   `transaction_id` and all 20,000 rows.
2. Add a line for it in `MEMBERS` at the top of
   `scripts/05_build_team_dataset.py`.
3. Run the script and commit the new team table.
