# Data Feature Engineering Steps - Hafid El Jaghaoui

## Scope

The processing script is: `scripts/02_data_filtering_hafid.py`

It enriches the cleaned dataset provided by Salma (`01_data_cleaning.py`) by calculating new feature columns required for the D3.js interactive histogram. Based on the team's requirements, it now generates **two distinct outputs**: a fully enriched dataset (for general use) and a filtered, lightweight dataset (specifically for D3.js).

Two visualizations are built on top of these outputs: a static histogram in Python (`scripts/03_histogram_preview.py`) and an interactive histogram in D3.js (`histogram_d3/index.html`). They are described in the second part of this document.

## Input and Output

| **Purpose** | **Path** |
| --- | --- |
| Cleaned input (Salma) | `data_cleaned/credit_card_fraud_2026_CLEANED_v1.csv` |
| Full Enriched output | `data_processed_hafid/hafid_enriched_full.csv` |
| Filtered lightweight output | `data_processed_hafid/hafid_histogram_data.csv` |
| Processing script | `scripts/02_data_filtering_hafid.py` |
| Team table (input of both charts) | `data_team/credit_card_fraud_2026_TEAM_v1.csv` |
| Static chart script | `scripts/03_histogram_preview.py` |
| Static chart output (generated) | `data_processed_hafid/hafid_histogram_preview.png` |
| D3.js interactive page | `histogram_d3/index.html` |

Run from project root:

```bash
python scripts/02_data_filtering_hafid.py
```

## Processing Logic & Exported Columns

### 1. Calculated Columns (Feature Engineering)
- `amount_category`: Binned amount (`< $50`, `$50 - $150`, `$150 - $500`, `> $500`) for D3.js grouping.
- `amount_to_mean_ratio`: Ratio comparing transaction amount against average normal transaction value.
- `is_high_risk_amount`: Boolean flag (`True`/`False`) indicating if the amount exceeds average fraud threshold.

### 2. Dual Export System
- **File 2 (Full Enriched):** Keeps all initial 22 columns from Salma + the 3 new calculated columns. Useful for further analysis by the team.
- **File 3 (Filtered):** To keep the dataset lightweight and optimized for D3.js rendering, unused attributes are filtered out. The final `hafid_histogram_data.csv` retains only 5 required columns (`amount_usd`, `is_fraud`, `amount_category`, `amount_to_mean_ratio`, `is_high_risk_amount`).

### 3. Baseline Statistics
Computes fraud rates by foreign transaction flag and mean amounts for visual annotations in D3.js.

## Visualizations

Both visualizations read the **shared team table** `data_team/credit_card_fraud_2026_TEAM_v1.csv` instead of a personal file. It has 20,000 rows and 40 columns: the 22 cleaned columns, our 3 calculated columns (`amount_category`, `amount_to_mean_ratio`, `is_high_risk_amount`, with the same values as in `hafid_enriched_full.csv`) and the columns added by the other members, which the histogram ignores. Only four columns are used: `amount_usd`, `is_fraud`, `is_foreign_transaction` and `channel`.

Both visualizations answer the same question: **how are transaction amounts distributed, and do fraudulent transactions differ from legitimate ones?** They target the fraud analyst and the data analyst / researcher profiles (spot unusual amounts, compare fraud vs. normal distributions, identify the amount ranges most affected by fraud).

### Key figures (computed on the team table)

| **Indicator** | **Value** |
| --- | --- |
| Transactions / frauds | 20,000 / 339 (1.7 %) |
| Mean amount, legitimate / fraud | 131.58 $ / 181.25 $ |
| Median amount, legitimate / fraud | 57.35 $ / 69.77 $ |
| Fraud rate, national / foreign | 1.42 % / 5.89 % (about x4) |
| Fraud rate by amount category | `< $50`: 1.58 % - `$50 - $150`: 1.54 % - `$150 - $500`: 2.00 % - `> $500`: 2.76 % (27 frauds only) |

Two difficulties drive the design of both charts:
- **Very skewed amounts:** the median is 57.51 $ but the maximum reaches 6,872.69 $. A logarithmic axis lets the whole range be read.
- **Class imbalance:** 339 frauds vs. 19,661 legitimate transactions. In raw counts the fraud bars are almost invisible, so the charts also show the **percentage of each group**, which makes the two shapes comparable.

### 1. Static histogram in Python - `scripts/03_histogram_preview.py`

**How to run** (from the project root, virtual environment active, team table present in `data_team/`):

```bash
pip install -r requirements.txt
python scripts/03_histogram_preview.py
```

**What it does:**
- Reads `data_team/credit_card_fraud_2026_TEAM_v1.csv` (only the columns `amount_usd` and `is_fraud`). If the file is missing, it prints an error message and stops.
- Draws two side-by-side histograms with 40 logarithmic bins from 1 $ to the maximum amount: legitimate transactions in blue, frauds in pink.
  - Left: number of transactions per bin.
  - Right: percentage of each group per bin.
- Adds dashed vertical lines for the mean amount of legitimate transactions and of frauds, and shows both means in the title.
- Saves the image to `data_processed_hafid/hafid_histogram_preview.png` (150 dpi), then opens a window to display it. The image is saved before the window opens, so it exists even if no window can be displayed.

**Dependencies:** `pandas`, `matplotlib` (listed in `requirements.txt`; `numpy` is installed automatically with them).

### 2. Interactive histogram in D3.js - `histogram_d3/index.html`

**How to run** (from the project root, team table present in `data_team/`):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/histogram_d3/` in a browser. A local server is required because browsers block `fetch` on local files when a page is opened by double-click. An internet connection is also required (D3.js v7 is loaded from `cdnjs.cloudflare.com`). See `LAUNCH.md`, step 4, for details and troubleshooting.

**Overview and detail (two visualization levels):**
- **Overview:** histogram of all amounts, with legitimate transactions (blue) and frauds (pink) superimposed. A line above the chart gives the number of displayed transactions, of frauds, and the fraud rate.
- **Detail:** clicking a bar opens its amount range with 20 finer bins, plus the number of transactions and frauds, the fraud rate in the range compared with the overall rate, and the mean and median amounts of legitimate transactions and of frauds. The "Revenir à la vue d’ensemble" button closes the detail view.

**Interactions:**
- Tooltip on hover: amount range, number of legitimate transactions, number of frauds, fraud rate of the bar.
- Filters: **Lieu** (all / foreign / national, from `is_foreign_transaction`) and **Canal** (all / ATM / Contactless / In-App / Online / POS, from `channel`).
- **Échelle:** logarithmic (default, whole range) or linear (0 to 1,000 $; the number of transactions above 1,000 $ that are not drawn is displayed under the chart).
- **Affichage:** percentage of each group (default) or number of transactions.
- **Tranches:** slider from 10 to 80 bins (default 40).

**Changing the dataset:**
- Drop-down list: "Table d’équipe" (`credit_card_fraud_2026_TEAM_v1.csv`, default) or "Léger" (`hafid_histogram_data.csv`). The light file does not contain `channel` and `is_foreign_transaction`, so the **Lieu** and **Canal** filters are disabled automatically when it is selected.
- "Ou charger un CSV": loads any CSV from the computer. It must contain `amount_usd` and `is_fraud` (`0`/`1` or `True`/`False`); `is_foreign_transaction` (`True`/`False`) and `channel` are optional and enable the matching filters.

**Data handling in the page:** CSV values arrive as text, so the page converts `amount_usd` to a number, `is_fraud` to 0/1, and `is_foreign_transaction` to a boolean while loading. Amounts are then grouped into bins with `d3.bin()` and drawn with D3 scales.

**Visual encoding (from data to visual variables):**

| **Data** | **Type** | **Visual variable** |
| --- | --- | --- |
| `amount_usd` | Quantitative | Horizontal position (bins on the X axis) |
| Number (or %) of transactions per bin | Computed | Bar height (Y axis) |
| `is_fraud` | Binary | Color (blue = legitimate, pink = fraud) |
| `is_foreign_transaction`, `channel` | Categorical | Filters (interaction) |

The mark used is the rectangle (bar).