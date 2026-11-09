# Credit Card Fraud Visualization

This repository holds the data processing and each member's visualization
work. The finished visualizations are gathered in a separate repository:

- Repository: [MOURTAD/fraud-visualization](https://github.com/MOURTAD/fraud-visualization)
- Live site: [fraud-visualization.vercel.app](https://fraud-visualization.vercel.app)

Each member has a folder under `visualizations/` there (`abdelhafid`, `di`,
`hiba`, `salma`). For example, the scatter plot is at
[fraud-visualization.vercel.app/visualizations/salma/scatter.html](https://fraud-visualization.vercel.app/visualizations/salma/scatter.html).

## Analysis in Line Graph and Bar Chart Dashboard -Liu Di

This project includes an interactive D3.js dashboard in [`bar_line.html`](./bar_line.html) for exploring how credit card fraud rates vary across merchant categories and transaction hours.

## User Tasks

The dashboard helps users:

- Compare fraud rates across merchant categories and quickly spot categories with higher rates.
- Explore how fraud rates change throughout the 24 hours of the day.
- Narrow the analysis by merchant category, payment channel, and card type.
- Hover over chart marks to inspect the fraud rate and the number of fraudulent and total transactions behind it.
- Reset all filters to return to the full dataset.

## Dashboard Features

### Fraud rate by merchant category

A horizontal bar chart shows each category's fraud rate, sorted from highest to lowest. It displays the rate beside each bar and highlights the three highest-rate categories. Hover over a bar to see its fraud count and total transaction count.

### Fraud rate by hour of day

A line chart with a point for each hour shows the hourly fraud rate from `00:00` through `23:00`. Hover over a point to see the rate and the corresponding fraud and total transaction counts. Hours without matching transactions remain visible with a zero rate.

### Interactive filters

The category, channel, and card-type filters apply together to both charts. Filter options are populated from the loaded dataset. Use **Reset filters** to restore the complete view. If the selected filters produce no matching transactions, the dashboard displays a message instead of empty charts.

## Data

The dashboard loads transaction-level data from:

```text
data_processed_hafid/hafid_histogram_data.csv
```

The charts use `merchant_category`, `channel`, `card_type`, `time_of_day_hour`, and `is_fraud`. Fraud rate is calculated as the number of fraudulent transactions divided by the total number of transactions in each category or hour for the currently selected filters.

If the CSV has not been generated yet, run the project's data preparation scripts from the repository root:

```powershell
python scripts\01_data_cleaning.py
python scripts\02_data_filtering_hafid.py
```

## Run the Dashboard

Because the page loads a local CSV file, serve it over HTTP rather than opening `bar_line.html` directly with a `file://` URL.

1. Open a terminal in the repository root.
2. Start a local web server:

   ```powershell
   python -m http.server 8000
   ```

3. Open [http://localhost:8000/bar_line.html](http://localhost:8000/bar_line.html) in a browser.

The page uses D3.js v7 from jsDelivr, so the browser needs internet access to load the D3 library.

## Implementation Notes

- The visualization is implemented in a single HTML file using D3.js v7.
- Filter changes recalculate both charts from the same matching transaction rows.
- The page reports a visible error message if the CSV cannot be loaded; check the browser's developer console and Network panel for the underlying error.
