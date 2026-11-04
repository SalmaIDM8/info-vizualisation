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
