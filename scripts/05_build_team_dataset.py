import os
import sys

import numpy as np
import pandas as pd

root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
cleaned_file = os.path.join(root, 'data_cleaned', 'credit_card_fraud_2026_CLEANED_v1.csv')
output_dir = os.path.join(root, 'data_team')
output_file = os.path.join(output_dir, 'credit_card_fraud_2026_TEAM_v1.csv')
columns_file = os.path.join(output_dir, 'team_columns.csv')

MEMBERS = [
    ('Hafid', 'scripts/02_data_filtering_hafid.py',
     ['data_processed_hafid/hafid_enriched_full.csv', 'data_processed_hafid/hafid_histogram_data.csv']),
    ('Hiba', 'scripts/03_heatmap_processing_hiba.py',
     ['data_processed_hiba/hiba_heatmap_derived_columns.csv']),
    ('Salma', 'scripts/04_scatter_salma.py',
     ['data_processed_salma/salma_scatter_data.csv']),
]


def check(condition, message):
    if not condition:
        sys.exit(f"CHECK FAILED: {message}")


def comparable(series):
    text = series.astype(str).str.strip().str.lower()
    if set(text.unique()) <= {'true', 'false', '0', '1'}:
        return text.map({'true': 1, 'false': 0, '1': 1, '0': 0})
    return series


def same_values(a, b):
    a, b = comparable(a), comparable(b)
    if pd.api.types.is_numeric_dtype(a) and pd.api.types.is_numeric_dtype(b):
        return bool(np.isclose(a.astype(float), b.astype(float), equal_nan=True).all())
    return bool((a.astype(str).to_numpy() == b.astype(str).to_numpy()).all())


def read_member_file(name, script, candidates):
    for relative in candidates:
        path = os.path.join(root, relative)
        if os.path.exists(path) and 'transaction_id' in pd.read_csv(path, nrows=0).columns:
            return relative, pd.read_csv(path)
    sys.exit(f"ERROR: no file with transaction_id for {name}. Run {script} first "
             f"(looked for: {', '.join(candidates)}).")


if not os.path.exists(cleaned_file):
    sys.exit(f"ERROR: Cannot find {cleaned_file}. Run scripts/01_data_cleaning.py first.")

team = pd.read_csv(cleaned_file)
check(team['transaction_id'].is_unique, "transaction_id is not unique in the cleaned file")
ids = team['transaction_id']
owners = [{'column': column, 'owner': 'Shared (cleaned)', 'source': 'data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv'}
          for column in team.columns]
print(f"Cleaned base: {len(team)} rows, {len(team.columns)} columns")

for name, script, candidates in MEMBERS:
    relative, member = read_member_file(name, script, candidates)
    check(len(member) == len(team), f"{relative} has {len(member)} rows, expected {len(team)}")
    check(member['transaction_id'].is_unique, f"{relative}: transaction_id is not unique")
    check(set(member['transaction_id']) == set(ids), f"{relative} does not cover the same transactions")
    member = member.set_index('transaction_id').loc[ids].reset_index()

    shared = [column for column in member.columns if column in team.columns and column != 'transaction_id']
    for column in shared:
        check(same_values(team[column], member[column]), f"{relative}: column '{column}' differs from the team table")

    new_columns = [column for column in member.columns if column not in team.columns]
    team = team.merge(member[['transaction_id'] + new_columns], on='transaction_id', how='left', validate='one_to_one')
    owners += [{'column': column, 'owner': name, 'source': relative} for column in new_columns]
    print(f"{name}: {relative} -> {len(new_columns)} new columns, {len(shared)} shared columns checked")

check(len(team) == len(ids), "rows were lost or duplicated during the join")
check(team.columns.is_unique, "two columns have the same name")

os.makedirs(output_dir, exist_ok=True)
team.to_csv(output_file, index=False, lineterminator='\n')
pd.DataFrame(owners).to_csv(columns_file, index=False, lineterminator='\n')

print(f"\nTeam table: {len(team)} rows, {len(team.columns)} columns")
for owner, count in pd.DataFrame(owners)['owner'].value_counts(sort=False).items():
    print(f"  {owner}: {count} columns")
print(f"\nSUCCESS: saved '{output_file}' and the column list '{columns_file}'.")
