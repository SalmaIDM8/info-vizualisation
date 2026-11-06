import os
import sys

import numpy as np
import pandas as pd

script_dir = os.path.dirname(os.path.abspath(__file__))
input_file = os.path.normpath(os.path.join(script_dir, '..', 'data_cleaned', 'credit_card_fraud_2026_CLEANED_v1.csv'))
output_dir = os.path.normpath(os.path.join(script_dir, '..', 'data_processed_salma'))
output_file = os.path.join(output_dir, 'salma_scatter_data.csv')

DISTANCE_EDGES = [0, 10, 25, 50, 100, np.inf]
DISTANCE_LABELS = ['0-10 km', '10-25 km', '25-50 km', '50-100 km', '100+ km']
AMOUNT_EDGES = [0, 50, 250, 1000, np.inf]
AMOUNT_LABELS = ['<$50', '$50-250', '$250-1000', '$1000+']

RISK_FLAGS = {
    'used_vpn': 'VPN',
    'ip_country_mismatch': 'IP mismatch',
    'billing_shipping_mismatch': 'Billing mismatch',
    'is_ai_generated_scam_attempt': 'AI scam',
    'is_new_merchant': 'New merchant',
}

GRID_LEVELS = [3, 4, 5]
GRID_DISTANCE_MAX_KM = 256
GRID_AMOUNT_RANGE_USD = (1, 10_000)

def check(condition, message):
    if not condition:
        sys.exit(f"CHECK FAILED: {message}")

def to_01(series):
    values = series.astype(str).str.strip().str.lower().map({'true': 1, 'false': 0, '1': 1, '0': 0})
    check(values.notna().all(), f"{series.name} has values that are not true/false")
    return values.astype(int)

if not os.path.exists(input_file):
    sys.exit(f"ERROR: Cannot find {input_file}. Run scripts/01_data_cleaning.py first.")

os.makedirs(output_dir, exist_ok=True)
df = pd.read_csv(input_file)
print(f"Input: {len(df)} rows, {len(df.columns)} columns")

flags = pd.DataFrame({column: to_01(df[column]) for column in RISK_FLAGS})

transactions = pd.DataFrame({
    'transaction_id': df['transaction_id'],
    'distance_from_home_km': df['distance_from_home_km'],
    'amount_usd': df['amount_usd'],
    'is_fraud': to_01(df['is_fraud']),
    'scatter_distance_band': pd.cut(df['distance_from_home_km'], DISTANCE_EDGES, labels=DISTANCE_LABELS, right=False),
    'scatter_amount_band': pd.cut(df['amount_usd'], AMOUNT_EDGES, labels=AMOUNT_LABELS, right=False),
    'scatter_risk_signal_count': flags.sum(axis=1),
    'scatter_risk_signals': flags.apply(lambda row: '|'.join(label for column, label in RISK_FLAGS.items() if row[column]), axis=1),
    'merchant_category': df['merchant_category'],
    'is_foreign_transaction': to_01(df['is_foreign_transaction']),
})

grid_x = np.sqrt(transactions['distance_from_home_km'] / GRID_DISTANCE_MAX_KM)
log_low, log_high = np.log10(GRID_AMOUNT_RANGE_USD)
grid_y = (np.log10(transactions['amount_usd']) - log_low) / (log_high - log_low)
check(grid_x.between(0, 1).all(), f"a distance is beyond the grid's {GRID_DISTANCE_MAX_KM} km")
check(grid_y.between(0, 1).all(), f"an amount is outside the grid's {GRID_AMOUNT_RANGE_USD} range")

cell_index = {}
for level in GRID_LEVELS:
    cells_per_axis = 2 ** level
    ix = np.minimum((grid_x * cells_per_axis).astype(int), cells_per_axis - 1)
    iy = np.minimum((grid_y * cells_per_axis).astype(int), cells_per_axis - 1)
    cell_index[level] = (ix, iy)
    transactions[f'scatter_cell_L{level}'] = [f"L{level}_{x}_{y}" for x, y in zip(ix, iy)]

check(len(transactions) == len(df), "rows were lost")
check(transactions['transaction_id'].notna().all(), "a transaction_id is empty")
check(transactions['transaction_id'].is_unique, "transaction_id is not unique, the merge would duplicate rows")
check((transactions['distance_from_home_km'] >= 0).all(), "a distance is negative")
check((transactions['amount_usd'] > 0).all(), "an amount is not positive, the log axis cannot show it")
check(transactions['scatter_distance_band'].notna().all(), "a distance falls outside the bands")
check(transactions['scatter_amount_band'].notna().all(), "an amount falls outside the bands")

for level in GRID_LEVELS[1:]:
    ix, iy = cell_index[level]
    parent_x, parent_y = cell_index[level - 1]
    check(((ix // 2) == parent_x).all() and ((iy // 2) == parent_y).all(),
          f"a level {level} cell is not inside its level {level - 1} parent")

transactions.to_csv(output_file, index=False, lineterminator='\n')

print(f"Output: {len(transactions)} rows, {len(transactions.columns)} columns, {int(transactions['is_fraud'].sum())} fraud")
for level in GRID_LEVELS:
    print(f"Grid level {level}: {2 ** level}x{2 ** level} grid, {transactions[f'scatter_cell_L{level}'].nunique()} cells with data")
print(f"\nSUCCESS: all checks passed, file saved as '{output_file}'.")
