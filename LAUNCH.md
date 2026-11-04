# Launch Data Processing

From the project root, first set up and activate your virtual environment.

## Step 0: Setup Virtual Environment

**On Mac/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**

```powershell
python -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Step 1: Clean Raw Data (Salma)

Run the data-cleaning script:

```bash
python scripts/01_data_cleaning.py
```

## Step 2: Enrich Data with Calculated Columns (Hafid)

Run the data enrichment script to calculate histogram features:

```bash
python scripts/02_data_filtering_hafid.py
```

The enriched dataset will be generated at:

`data_processed_hafid/hafid_histogram_data.csv`

## Step 3: Heatmap Columns (Hiba)

```bash
python scripts/03_heatmap_processing_hiba.py
```

Output: `data_processed_hiba/hiba_heatmap_derived_columns.csv`

## Step 4: Scatter Plot Columns (Salma)

```bash
python scripts/04_scatter_salma.py
```

Output: `data_processed_salma/salma_scatter_data.csv`

## Step 5: Build the Team Table

Joins the cleaned data and every member's columns on `transaction_id`:

```bash
python scripts/05_build_team_dataset.py
```

Output: `data_team/credit_card_fraud_2026_TEAM_v1.csv` (20,000 rows, 40
columns) and `data_team/team_columns.csv`, which gives the owner of each
column. See `data_processing_steps_explained/README-team.md`.
