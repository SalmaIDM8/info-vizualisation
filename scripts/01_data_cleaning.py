import pandas as pd
import os

script_dir = os.path.dirname(os.path.abspath(__file__))

input_dir = os.path.join(script_dir, '..', 'data_raw')
output_dir = os.path.join(script_dir, '..', 'data_cleaned')

input_dir = os.path.normpath(input_dir)
output_dir = os.path.normpath(output_dir)

# Ensure the output directory exists
os.makedirs(output_dir, exist_ok=True)
raw_file = os.path.join(input_dir, 'credit_card_fraud_2026.csv')

# Check if the raw file exists before trying to read it
if not os.path.exists(raw_file):
    print(f"ERROR: Cannot find {raw_file}. Please ensure you have placed the Kaggle CSV in the 'data_raw' folder.")
    exit()

df = pd.read_csv(raw_file)

#THE 22 ATTRIBUTES CHOSEN
target_columns = [
    'transaction_id', 'amount_usd', 'merchant_category', 'card_type', 'auth_method',
    'channel', 'device_type', 'is_foreign_transaction', 'txn_count_last_24h',
    'distance_from_home_km', 'account_balance_usd', 'is_new_merchant', 'used_vpn',
    'ip_country_mismatch', 'billing_shipping_mismatch', 'cvv_retry_count',
    'velocity_score', 'time_of_day_hour', 'is_ai_generated_scam_attempt',
    'merchant_risk_score', 'prior_disputes', 'is_fraud'
]

available_cols = [c for c in target_columns if c in df.columns]
df_team = df[available_cols].copy()

print("--- DATA DIAGNOSTICS BEFORE CLEANING ---")
print(f"Total rows in dataset: {len(df_team)}")
print(f"Total columns extracted: {len(df_team.columns)}")

missing_data = df_team.isnull().sum()
print("\nMissing values found per column:")
missing_columns = missing_data[missing_data > 0]

if len(missing_columns) == 0:
    print(" -> Great news! There are 0 missing values in these columns.")
else:
    print(missing_columns)

print("-" * 40)

#CLEANING LOGIC
numerical_cols = df_team.select_dtypes(include=['float64', 'int64']).columns
categorical_cols = df_team.select_dtypes(include=['object', 'bool']).columns

# Fill missing numerical values with 0, and categorical with 'Unknown'
df_team[numerical_cols] = df_team[numerical_cols].fillna(0)
df_team[categorical_cols] = df_team[categorical_cols].fillna('Unknown')

output_filename = os.path.join(output_dir, 'credit_card_fraud_2026_CLEANED_v1.csv')
df_team.to_csv(output_filename, index=False)

print(f"\nSUCCESS: Cleaned dataset saved as '{output_filename}'.")
