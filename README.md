# Information Visualization - Credit Card Fraud Analysis

## Overview

This project presents an interactive data visualization dashboard for analyzing credit card fraud patterns. By combining exploratory data analysis in Python with interactive web visualizations using D3.js, the project highlights key fraud indicators such as transaction amounts, channels, and foreign transaction locations.

---

## Team & Roles

| **Member** | **Focus / Role** | **Deliverables** |
| --- | --- | --- |
| Salma | Data Cleaning & Preprocessing | Raw dataset cleaning, handling missing values (`01_data_cleaning.py`, `README-salma.md`) |
| Liu Di | Exploratory Analysis & Feature Impact | Fraud rate analysis by attributes, identification of key variables (`channel`, `is_foreign_transaction`) |
| Hafid | Data Pipeline & Feature Engineering | Amount distribution analysis, feature engineering pipeline (`02_data_filtering_hafid.py`), D3.js interactive histogram (`README-hafid.md`) |

---

## Data Pipeline Architecture

```text
data_raw/credit_card_fraud_2026.csv
        |
        v
[ 01_data_cleaning.py ]
        |
        v
data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv
        |
        v
[ 02_data_filtering_hafid.py ]
        |
        v
data_processed_hafid/hafid_histogram_data.csv
        |
        v
[ D3.js Histogram Visualisation ]
```

---

## Getting Started

To run the data processing pipeline locally, please refer to the execution guide in `LAUNCH.md`.

### Quick setup

1. Set up and activate a virtual environment (`venv`).
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Execute the data scripts in order by following `LAUNCH.md`.
