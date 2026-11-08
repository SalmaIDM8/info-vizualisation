# Information Visualization - Credit Card Fraud Analysis

## Overview

This project presents an interactive data visualization dashboard for analyzing credit card fraud patterns. By combining exploratory data analysis in Python with interactive web visualizations using D3.js, the project highlights key fraud indicators such as transaction amounts, channels, and foreign transaction locations.

---

## Team & Roles

| **Member** | **Focus / Role** | **Deliverables** |
| --- | --- | --- |
| Salma | Data Cleaning & Preprocessing | Raw dataset cleaning, handling missing values (`01_data_cleaning.py`, `README-salma.md`) |
| Liu Di | Exploratory Analysis & Feature Impact | Fraud rate analysis by attributes, identification of key variables (`channel`, `is_foreign_transaction`) |
| Hafid | Data Pipeline & Feature Engineering | Amount distribution analysis, feature engineering pipeline (`02_data_filtering_hafid.py`), static Python histogram (`03_histogram_preview.py`), D3.js interactive histogram (`histogram_d3/index.html`, `README-hafid.md`) |

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
        +---> data_processed_hafid/hafid_enriched_full.csv (All columns)
        |           |
        |           +---> merged with every member's columns into the team table
        |                       |
        |                       v
        |           data_team/credit_card_fraud_2026_TEAM_v1.csv (20,000 rows, 40 columns)
        |                       |
        |                       +---> [ 03_histogram_preview.py ] ---> data_processed_hafid/hafid_histogram_preview.png
        |                       |                                      (static chart, Python / matplotlib)
        |                       |
        |                       +---> [ histogram_d3/index.html ]  (D3.js interactive histogram, default dataset)
        |
        +---> data_processed_hafid/hafid_histogram_data.csv (Lightweight for Web)
                    |
                    +---> [ histogram_d3/index.html ]  (D3.js, "Light" dataset option)
```

---

## Project Structure

```text
info-vizualisation/
├── data_raw/                        Raw Kaggle CSV
├── data_cleaned/                    Output of 01_data_cleaning.py
├── data_processed_hafid/            Outputs of 02 and 03 (CSV files + generated PNG)
├── data_team/                       Shared team table (every member's columns)
├── scripts/
│   ├── 01_data_cleaning.py          Cleaning (Salma)
│   ├── 02_data_filtering_hafid.py   Feature engineering (Hafid)
│   └── 03_histogram_preview.py      Static Python histogram (Hafid)
├── histogram_d3/
│   └── index.html                   D3.js interactive histogram (Hafid)
├── data_processing_steps_explained/ One README per team member
├── LAUNCH.md                        Step-by-step execution guide
├── README.md
└── requirements.txt                 pandas, matplotlib
```

---

## Visualizations

| **Visualization** | **File** | **What it shows** |
| --- | --- | --- |
| Static histogram (Python) | `scripts/03_histogram_preview.py` | Amount distribution of fraudulent vs. legitimate transactions, in two views (counts and % of each group). Saved as a PNG image. |
| Interactive histogram (D3.js) | `histogram_d3/index.html` | Same distribution in the browser, with an overview, a detail view per amount range, filters, and the ability to switch or load another dataset. |

Both read the shared team table `data_team/credit_card_fraud_2026_TEAM_v1.csv`. Details of both visualizations (features, encodings, required columns) are in `data_processing_steps_explained/README-hafid.md`.

---

## Getting Started

To run the data processing pipeline and the visualizations locally, please refer to the execution guide in `LAUNCH.md`.

### Quick setup

1. Set up and activate a virtual environment (`venv`).
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Execute the data scripts in order by following `LAUNCH.md` (steps 1 and 2 prepare the data). The charts read the shared team table in `data_team/`, which must be present in the project.
4. Generate the Python chart (step 3 of `LAUNCH.md`):

   ```bash
   python scripts/03_histogram_preview.py
   ```

5. Open the D3.js histogram (step 4 of `LAUNCH.md`): start a local server from the project root, then open `http://localhost:8000/histogram_d3/` in your browser.

   ```bash
   python -m http.server 8000
   ```