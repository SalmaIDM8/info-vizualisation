
from pathlib import Path
import pandas as pd

# ============================================
# 1. FILE PATHS
# ============================================

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    ROOT / "data_processed_hafid" / "hafid_histogram_data.csv"
)

OUTPUT_DIR = ROOT / "data_processed_hiba"

FULL_OUTPUT_FILE = (
    OUTPUT_DIR / "hiba_heatmap_data.csv"
)

HEATMAP_ONLY_FILE = (
    OUTPUT_DIR / "hiba_heatmap_derived_columns.csv"
)


# ============================================
# 2. HEATMAP DATA PROCESSING
# ============================================

def add_heatmap_columns(df):

    # Preserve all original data
    result = df.copy()

    original_rows = len(df)
    original_columns = list(df.columns)

    # Check required columns
    required_columns = [
        "amount_usd",
        "merchant_category",
        "is_fraud"
    ]

    missing_columns = [
        col for col in required_columns
        if col not in result.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    # Prevent overwriting existing columns
    new_columns = [
        "amount_range",
        "total_count",
        "fraud_count",
        "legitimate_count",
        "fraud_rate",
        "average_amount",
        "min_amount",
        "max_amount"
    ]

    existing_columns = [
        col for col in new_columns
        if col in result.columns
    ]

    if existing_columns:
        raise ValueError(
            f"Columns already exist: {existing_columns}"
        )

    # ========================================
    # 3. CONVERT VALUES FOR CALCULATIONS
    # ========================================

    amount = pd.to_numeric(
        result["amount_usd"],
        errors="coerce"
    )

    fraud = (
        result["is_fraud"]
        .astype(str)
        .str.strip()
        .str.lower()
        .map({
            "0": 0,
            "1": 1,
            "0.0": 0,
            "1.0": 1,
            "false": 0,
            "true": 1
        })
    )

    # ========================================
    # 4. CREATE AMOUNT RANGES
    # ========================================

    bins = [
        0,
        25,
        50,
        100,
        250,
        500,
        1000,
        float("inf")
    ]

    labels = [
        "$0-25",
        "$25-50",
        "$50-100",
        "$100-250",
        "$250-500",
        "$500-1000",
        "$1000+"
    ]

    result["amount_range"] = pd.cut(
        amount,
        bins=bins,
        labels=labels,
        right=False,
        include_lowest=True
    )

    # Temporary columns for calculations
    result["_heatmap_amount"] = amount
    result["_heatmap_fraud"] = fraud

    # ========================================
    # 5. CALCULATE HEATMAP STATISTICS
    # ========================================

    group_columns = [
        "merchant_category",
        "amount_range"
    ]

    valid_data = result.dropna(
        subset=group_columns + ["_heatmap_fraud"]
    )

    statistics = (
        valid_data
        .groupby(group_columns, observed=True)
        .agg(
            total_count=("_heatmap_fraud", "size"),
            fraud_count=("_heatmap_fraud", "sum"),
            average_amount=("_heatmap_amount", "mean"),
            min_amount=("_heatmap_amount", "min"),
            max_amount=("_heatmap_amount", "max")
        )
        .reset_index()
    )

    # Fraud count
    statistics["fraud_count"] = (
        statistics["fraud_count"].astype(int)
    )

    # Legitimate transaction count
    statistics["legitimate_count"] = (
        statistics["total_count"]
        - statistics["fraud_count"]
    )

    # Fraud rate percentage
    statistics["fraud_rate"] = (
        statistics["fraud_count"]
        / statistics["total_count"]
        * 100
    )

    # ========================================
    # 6. ADD STATISTICS TO ORIGINAL DATA
    # ========================================

    result = result.merge(
        statistics,
        on=group_columns,
        how="left",
        validate="many_to_one",
        sort=False
    )

    # Remove temporary columns only
    result = result.drop(
        columns=[
            "_heatmap_amount",
            "_heatmap_fraud"
        ]
    )

    # Check that no original data was lost
    assert len(result) == original_rows

    assert all(
        col in result.columns
        for col in original_columns
    )

    return result


# ============================================
# 7. MAIN FUNCTION
# ============================================

def main():

    print("Starting Heatmap data processing...")

    # Read Hafid's processed dataset
    df = pd.read_csv(INPUT_FILE)

    print("Input file:", INPUT_FILE)
    print("Original rows:", len(df))
    print("Original columns:", len(df.columns))

    # Add Heatmap columns
    result = add_heatmap_columns(df)

    # Create output directory
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # ========================================
    # 8. SAVE COMPLETE DATASET
    # ========================================

    result.to_csv(
        FULL_OUTPUT_FILE,
        index=False
    )

    print("\nFull dataset created:")
    print(FULL_OUTPUT_FILE)

    # ========================================
    # 9. SAVE ONLY HIBA'S COLUMNS
    # ========================================

    heatmap_columns = [
        "amount_range",
        "total_count",
        "fraud_count",
        "legitimate_count",
        "fraud_rate",
        "average_amount",
        "min_amount",
        "max_amount"
    ]

    # Keep transaction_id to identify transactions
    if "transaction_id" in result.columns:
        heatmap_columns = [
            "transaction_id"
        ] + heatmap_columns

    heatmap_only = result[
        heatmap_columns
    ].copy()

    heatmap_only.to_csv(
        HEATMAP_ONLY_FILE,
        index=False
    )

    print("\nHeatmap-only dataset created:")
    print(HEATMAP_ONLY_FILE)

    # ========================================
    # 10. FINAL VERIFICATION
    # ========================================

    print("\n===================================")
    print("PROCESSING COMPLETED SUCCESSFULLY!")
    print("===================================")

    print("Original rows:", len(df))
    print("Processed rows:", len(result))

    print("Original columns:", len(df.columns))
    print("Processed columns:", len(result.columns))

    print("\nHeatmap-only columns:")
    print(heatmap_columns)

    print("\nHeatmap-only rows:", len(heatmap_only))

    print("\nBoth CSV files were saved successfully!")


# ============================================
# 11. RUN SCRIPT
# ============================================

if __name__ == "__main__":
    main()
