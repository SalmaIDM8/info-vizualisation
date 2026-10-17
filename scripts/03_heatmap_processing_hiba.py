
from pathlib import Path
import pandas as pd

# Project paths
ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    ROOT / "data_processed_hafid" / "hafid_histogram_data.csv"
)

OUTPUT_DIR = ROOT / "data_processed_hiba"
OUTPUT_FILE = OUTPUT_DIR / "hiba_heatmap_data.csv"


def add_heatmap_columns(df):
    # Keep all existing data
    result = df.copy()
    original_columns = list(result.columns)
    original_rows = len(result)

    required = ["amount_usd", "merchant_category", "is_fraud"]
    missing = [c for c in required if c not in result.columns]

    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Convert values temporarily for calculations
    amount = pd.to_numeric(result["amount_usd"], errors="coerce")

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

    # Create amount ranges used by the Heatmap
    bins = [0, 25, 50, 100, 250, 500, 1000, float("inf")]

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

    # Temporary values used for calculations
    result["_heatmap_amount"] = amount
    result["_heatmap_fraud"] = fraud

    group_columns = ["merchant_category", "amount_range"]

    valid = result.dropna(
        subset=group_columns + ["_heatmap_fraud"]
    )

    stats = (
        valid.groupby(group_columns, observed=True)
        .agg(
            total_count=("_heatmap_fraud", "size"),
            fraud_count=("_heatmap_fraud", "sum"),
            average_amount=("_heatmap_amount", "mean"),
            min_amount=("_heatmap_amount", "min"),
            max_amount=("_heatmap_amount", "max")
        )
        .reset_index()
    )

    stats["fraud_count"] = stats["fraud_count"].astype(int)

    stats["legitimate_count"] = (
        stats["total_count"] - stats["fraud_count"]
    )

    stats["fraud_rate"] = (
        stats["fraud_count"] / stats["total_count"] * 100
    )

    # Add calculated columns without removing original columns
    result = result.merge(
        stats,
        on=group_columns,
        how="left",
        validate="many_to_one",
        sort=False
    )

    # Remove only temporary calculation columns
    result = result.drop(
        columns=["_heatmap_amount", "_heatmap_fraud"]
    )

    # Check that all original rows and columns remain
    assert len(result) == original_rows
    assert all(col in result.columns for col in original_columns)

    return result


def main():
    df = pd.read_csv(INPUT_FILE)

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

    # Avoid silently overwriting columns already created by Hafid
    existing = [c for c in new_columns if c in df.columns]
    if existing:
        raise ValueError(
            f"These columns already exist: {existing}"
        )

    result = add_heatmap_columns(df)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUTPUT_FILE, index=False)

    print("Processing completed successfully!")
    print("Original rows:", len(df))
    print("Processed rows:", len(result))
    print("Original columns:", len(df.columns))
    print("Processed columns:", len(result.columns))
    print("Added columns:", new_columns)
    print("Output:", OUTPUT_FILE)


if __name__ == "__main__":
    main()
