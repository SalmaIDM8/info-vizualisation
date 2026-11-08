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

Install dependencies (`pandas` for the data scripts, `matplotlib` for the Python chart):

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

The script will generate **two** processed datasets:
1. `data_processed_hafid/hafid_enriched_full.csv` (Full dataset with new features)
2. `data_processed_hafid/hafid_histogram_data.csv` (Lightweight dataset optimized for D3.js)

## Step 3: Generate the Python Histogram (Hafid)

Step 0 must be done first, and the shared team table `data_team/credit_card_fraud_2026_TEAM_v1.csv` must be in the project (it is committed in the repository). With the virtual environment active, run from the project root:

```bash
python scripts/03_histogram_preview.py
```

What happens:
1. The chart is saved as an image: `data_processed_hafid/hafid_histogram_preview.png`.
2. A window opens to display the chart. Close the window to end the script.

If no window can open (remote machine, WSL without display), the PNG is still saved: open it directly.

## Step 4: Launch the D3.js Interactive Histogram (Hafid)

The shared team table `data_team/credit_card_fraud_2026_TEAM_v1.csv` must be in the project (the page loads it by default). The "Léger" option reads `data_processed_hafid/hafid_histogram_data.csv`, which needs step 2.

**1. Start a local web server from the project root** (the virtual environment is not required for this step, it only uses Python's built-in server):

```bash
python -m http.server 8000
```

On Mac/Linux, use `python3 -m http.server 8000` if `python` is not found.

**2. Open the page in your browser:**

```text
http://localhost:8000/histogram_d3/
```

**3. Stop the server** with `Ctrl + C` in the terminal when you are done.

Notes:
- Do **not** double-click `histogram_d3/index.html`: browsers block reading local CSV files this way, and the page will show an error message. If you do open it that way, use the "Ou charger un CSV" button and select `data_team/credit_card_fraud_2026_TEAM_v1.csv` manually.
- An internet connection is needed: the D3.js library is loaded from a CDN (`cdnjs.cloudflare.com`).
- If port 8000 is already used, pick another one (e.g. `python -m http.server 8080`) and change the port in the URL.

## Troubleshooting

| **Problem** | **Cause / Fix** |
| --- | --- |
| `ModuleNotFoundError: No module named 'matplotlib'` | The virtual environment is not active, or dependencies are not installed. Activate `venv` and run `pip install -r requirements.txt`. |
| `ERROR: Cannot find ... credit_card_fraud_2026_TEAM_v1.csv` | The team table is missing from `data_team/`. Get it from the repository (it is committed on the team branch), or rebuild it with the team script after steps 1 and 2. |
| D3 page shows "Impossible de lire le CSV" | The page was opened by double-click, or the server was not started from the project root. Restart `python -m http.server 8000` from the root and use the `localhost` URL. |
| D3 page is blank | No internet connection (D3.js cannot be loaded from the CDN). |
| "Lieu" and "Canal" filters are greyed out | The "Léger" dataset is selected: it does not contain `is_foreign_transaction` and `channel`. Select "Table d’équipe". |