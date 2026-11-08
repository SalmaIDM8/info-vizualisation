function getAmountRange(amount) {

    if (amount < 25) return "$0-25";
    if (amount < 50) return "$25-50";
    if (amount < 100) return "$50-100";
    if (amount < 250) return "$100-250";
    if (amount < 500) return "$250-500";
    if (amount < 1000) return "$500-1000";

    return "$1000+";
}


var amountRanges = [
    "$0-25",
    "$25-50",
    "$50-100",
    "$100-250",
    "$250-500",
    "$500-1000",
    "$1000+"
];


var margin = {
    top: 50,
    right: 40,
    bottom: 100,
    left: 170
};


var width = 1000 - margin.left - margin.right;
var height = 650 - margin.top - margin.bottom;


var svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr(
        "transform",
        "translate(" + margin.left + "," + margin.top + ")"
    );


var tooltip = d3.select("#tooltip");

var originalData;
var currentData;
var selectedCell;
var currentMaxFraudRate = 1;


function parseFraudFlag(value) {
    var normalized = String(value).trim().toLowerCase();

    if (["1", "true", "yes", "fraud", "fraudulent"].indexOf(normalized) !== -1) {
        return 1;
    }

    if (["0", "false", "no", "legitimate", "legit"].indexOf(normalized) !== -1) {
        return 0;
    }

    return NaN;
}


function normalizeDataset(data) {
    if (!data || data.length === 0) {
        throw new Error("The CSV contains no transaction rows.");
    }

    var columns = data.columns || Object.keys(data[0]);
    var requiredColumns = ["amount_usd", "merchant_category", "is_fraud"];
    var missingColumns = requiredColumns.filter(function(column) {
        return columns.indexOf(column) === -1;
    });

    if (missingColumns.length > 0) {
        throw new Error("Missing required columns: " + missingColumns.join(", "));
    }

    return data.map(function(row, index) {
        var amount = Number(row.amount_usd);
        var fraud = parseFraudFlag(row.is_fraud);

        if (!Number.isFinite(amount) || !Number.isFinite(fraud)) {
            throw new Error("Invalid amount_usd or is_fraud value on CSV row " + (index + 2) + ".");
        }

        if (!row.merchant_category || !row.merchant_category.trim()) {
            throw new Error("Empty merchant_category on CSV row " + (index + 2) + ".");
        }

        row.amount_usd = amount;
        row.is_fraud = fraud;
        row.merchant_category = row.merchant_category.trim();
        row.channel = row.channel ? row.channel.trim() : "Unknown";
        row.amount_range = getAmountRange(amount);
        return row;
    });
}


function populateFilter(selector, values) {
    var filter = d3.select(selector);
    filter.selectAll("option.data-option").remove();

    filter.selectAll("option.data-option")
        .data(values)
        .enter()
        .append("option")
        .attr("class", "data-option")
        .attr("value", function(value) { return value; })
        .text(function(value) { return value; });
}


function loadDataset(data, label) {
    try {
        originalData = normalizeDataset(data);
        selectedCell = null;

        var channels = Array.from(new Set(originalData.map(function(row) { return row.channel; }))).sort();
        var merchants = Array.from(new Set(originalData.map(function(row) { return row.merchant_category; }))).sort();
        var ranges = amountRanges.filter(function(range) {
            return originalData.some(function(row) { return row.amount_range === range; });
        });

        populateFilter("#channelFilter", channels);
        populateFilter("#merchantFilter", merchants);
        populateFilter("#amountFilter", ranges);
        d3.select("#channelFilter").property("value", "All");
        d3.select("#merchantFilter").property("value", "All");
        d3.select("#amountFilter").property("value", "All");
        d3.select("#dataStatus").attr("class", "status-success")
            .text("Loaded " + label + " (" + originalData.length.toLocaleString() + " transactions).");
        applyFilters();
    } catch (error) {
        d3.select("#dataStatus").attr("class", "status-error").text(error.message);
        console.error("Could not load CSV:", error);
    }
}


function applyFilters() {
    var selectedChannel = d3.select("#channelFilter").property("value");
    var selectedMerchant = d3.select("#merchantFilter").property("value");
    var selectedRange = d3.select("#amountFilter").property("value");

    currentData = originalData.filter(function(row) {
        return (selectedChannel === "All" || row.channel === selectedChannel)
            && (selectedMerchant === "All" || row.merchant_category === selectedMerchant)
            && (selectedRange === "All" || row.amount_range === selectedRange);
    });

    selectedCell = null;
    d3.select("#selectionPrompt").style("display", "block");
    d3.select("#selectionDetails").attr("hidden", true);
    hideZoom();
    drawHeatmap(currentData);

    var activeFilters = [];
    if (selectedChannel !== "All") activeFilters.push("channel: " + selectedChannel);
    if (selectedMerchant !== "All") activeFilters.push("category: " + selectedMerchant);
    if (selectedRange !== "All") activeFilters.push("amount: " + selectedRange);
    d3.select("#activeFilter").text(
        (activeFilters.length ? "Filters: " + activeFilters.join(" | ") : "Showing all available transactions")
        + " | " + currentData.length.toLocaleString() + " transactions"
    );
}


d3.selectAll("#channelFilter, #merchantFilter, #amountFilter")
    .on("change", applyFilters);

d3.select("#backButton").on("click", function() {
    hideZoom();
    drawHeatmap(currentData);
});

d3.select("#openDetail").on("click", function() {
    if (selectedCell) zoomCell(selectedCell);
});

d3.select("#datasetFile").on("change", function() {
    var file = this.files && this.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function() {
        try {
            loadDataset(d3.csvParse(reader.result), file.name);
        } catch (error) {
            d3.select("#dataStatus").attr("class", "status-error").text(error.message);
        }
    };
    reader.onerror = function() {
        d3.select("#dataStatus").attr("class", "status-error").text("Could not read the selected CSV file.");
    };
    reader.readAsText(file);
});

d3.csv("/data_team/credit_card_fraud_2026_TEAM_v1.csv")
    .then(function(data) { loadDataset(data, "credit_card_fraud_2026_TEAM_v1.csv"); })
    .catch(function(error) {
        d3.select("#dataStatus").attr("class", "status-error")
            .text("Could not load the default CSV. Check the server and /data_team URL.");
        console.error("Error loading CSV:", error);
    });


function prepareHeatmapData(data) {

    var groupedData = d3.nest()

        .key(function(d) {
            return d.merchant_category;
        })

        .key(function(d) {
            return d.amount_range;
        })

        .rollup(function(values) {

            var total = values.length;


            var frauds = d3.sum(
                values,
                function(d) {
                    return d.is_fraud;
                }
            );


            var fraudRate = 0;


            if (total > 0) {

                fraudRate =
                    (frauds / total) * 100;

            }


            return {

                total: total,

                frauds: frauds,

                fraudRate: fraudRate

            };

        })

        .entries(data);


    var heatmapData = [];


    groupedData.forEach(
        function(merchant) {

            merchant.values.forEach(
                function(range) {

                    heatmapData.push({

                        merchant:
                            merchant.key,

                        range:
                            range.key,

                        total:
                            range.value.total,

                        frauds:
                            range.value.frauds,

                        fraudRate:
                            range.value.fraudRate

                    });

                }
            );

        }
    );


    return {

        groupedData: groupedData,

        heatmapData: heatmapData

    };
}


function drawHeatmap(data) {

    svg.selectAll("*").remove();


    var prepared =
        prepareHeatmapData(data);


    var groupedData =
        prepared.groupedData;


    var heatmapData =
        prepared.heatmapData;


    var merchants =
        groupedData.map(
            function(d) {
                return d.key;
            }
        );


    var x = d3.scaleBand()
        .domain(amountRanges)
        .range([0, width])
        .padding(0.05);


    var y = d3.scaleBand()
        .domain(merchants)
        .range([0, height])
        .padding(0.05);


    currentMaxFraudRate =
        d3.max(
            heatmapData,
            function(d) {
                return d.fraudRate;
            }
        );


    if (
        !currentMaxFraudRate
        ||
        currentMaxFraudRate === 0
    ) {

        currentMaxFraudRate = 1;

    }

    if (heatmapData.length === 0) {
        svg.append("text")
            .attr("class", "empty-state")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .text("No transactions match these filters");
        drawLegend(currentMaxFraudRate);
        return;
    }


    var color =
        d3.scaleSequential()
            .domain([
                0,
                currentMaxFraudRate
            ])
            .interpolator(
                d3.interpolateYlOrRd
            );


    svg.append("g")
        .attr("class", "axis")
        .attr(
            "transform",
            "translate(0,"
            + height
            + ")"
        )
        .call(
            d3.axisBottom(x)
        );


    svg.append("g")
        .attr("class", "axis")
        .call(
            d3.axisLeft(y)
        );


    svg.selectAll(".cell")
        .data(heatmapData)
        .enter()
        .append("rect")

        .attr("class", "cell")

        .attr(
            "x",
            function(d) {
                return x(d.range);
            }
        )

        .attr(
            "y",
            function(d) {
                return y(d.merchant);
            }
        )

        .attr(
            "width",
            x.bandwidth()
        )

        .attr(
            "height",
            y.bandwidth()
        )

        .attr(
            "fill",
            function(d) {

                return color(
                    d.fraudRate
                );

            }
        )


        .on(
            "mouseover",
            function(d) {

                tooltip
                    .style(
                        "display",
                        "block"
                    )

                    .html(

                        "<div class='tooltip-title'>"
                        + d.merchant
                        + "</div>"

                        +

                        "<strong>Amount range:</strong> "
                        + d.range

                        +

                        "<br>"

                        +

                        "<strong>Total transactions:</strong> "
                        + d.total

                        +

                        "<br>"

                        +

                        "<strong>Fraudulent transactions:</strong> "
                        + d.frauds

                        +

                        "<br>"

                        +

                        "<strong>Legitimate transactions:</strong> "
                        + (d.total - d.frauds)

                        +

                        "<br>"

                        +

                        "<strong>Fraud rate:</strong> "
                        + d.fraudRate.toFixed(2)
                        + "%"

                    );

            }
        )


        .on(
            "mousemove",
            function() {

                tooltip

                    .style(
                        "left",
                        (d3.event.pageX + 15)
                        + "px"
                    )

                    .style(
                        "top",
                        (d3.event.pageY + 15)
                        + "px"
                    );

            }
        )


        .on(
            "mouseout",
            function() {

                tooltip.style(
                    "display",
                    "none"
                );

            }
        )


        .on(
            "click",
            function(d) {

                showSelection(d);

            }
        );


    svg.append("text")

        .attr(
            "class",
            "axis-title"
        )

        .attr(
            "x",
            width / 2
        )

        .attr(
            "y",
            height + 70
        )

        .attr(
            "text-anchor",
            "middle"
        )

        .text(
            "Transaction Amount Range (USD)"
        );


    svg.append("text")

        .attr(
            "class",
            "axis-title"
        )

        .attr(
            "transform",
            "rotate(-90)"
        )

        .attr(
            "x",
            -height / 2
        )

        .attr(
            "y",
            -140
        )

        .attr(
            "text-anchor",
            "middle"
        )

        .text(
            "Merchant Category"
        );


    drawLegend(
        currentMaxFraudRate
    );

}


function showSelection(cell) {
    selectedCell = cell;
    var selectedRows = currentData.filter(function(row) {
        return row.merchant_category === cell.merchant
            && row.amount_range === cell.range;
    });
    var fraudCount = d3.sum(selectedRows, function(row) { return row.is_fraud; });
    var amounts = selectedRows.map(function(row) { return row.amount_usd; }).sort(d3.ascending);
    var average = d3.mean(amounts);
    var median = d3.median(amounts);
    var maximum = d3.max(amounts);

    d3.select("#selectionPrompt").style("display", "none");
    d3.select("#selectionDetails").property("hidden", false);
    d3.select("#selectedLabel").text(cell.merchant + " | " + cell.range);
    d3.select("#selectedTotal").text(selectedRows.length.toLocaleString());
    d3.select("#selectedFraud").text(fraudCount.toLocaleString());
    d3.select("#selectedLegitimate").text((selectedRows.length - fraudCount).toLocaleString());
    d3.select("#selectedRate").text((cell.fraudRate || 0).toFixed(2) + "%");
    d3.select("#selectedAverage").text(average === undefined ? "N/A" : "$" + average.toFixed(2));
    d3.select("#selectedMedian").text(median === undefined ? "N/A" : "$" + median.toFixed(2));
    d3.select("#selectedMaximum").text(maximum === undefined ? "N/A" : "$" + maximum.toFixed(2));
    d3.selectAll(".cell").classed("selected", function(item) {
        return item.merchant === cell.merchant && item.range === cell.range;
    });
}


function drawLegend(maxFraudRate) {

    var legend =
        d3.select("#legend");


    legend
        .selectAll("*")
        .remove();


    var legendWidth = 400;

    var legendHeight = 16;


    var canvas =
        legend
            .append("canvas")

            .attr(
                "width",
                legendWidth
            )

            .attr(
                "height",
                legendHeight
            )

            .style(
                "width",
                legendWidth + "px"
            )

            .style(
                "height",
                legendHeight + "px"
            );


    var context =
        canvas
            .node()
            .getContext("2d");


    var color =
        d3.scaleSequential()

            .domain([
                0,
                maxFraudRate
            ])

            .interpolator(
                d3.interpolateYlOrRd
            );


    for (
        var i = 0;
        i < legendWidth;
        i++
    ) {

        var value =
            (
                i /
                (legendWidth - 1)
            )
            *
            maxFraudRate;


        context.fillStyle =
            color(value);


        context.fillRect(
            i,
            0,
            1,
            legendHeight
        );

    }


    d3.select(
        ".legend-labels"
    )

        .html(

            "<span>0%</span>"

            +

            "<span>Low → High</span>"

            +

            "<span>"
            + maxFraudRate.toFixed(2)
            + "%</span>"

        );

}


function zoomCell(selectedCell) {

    tooltip.style(
        "display",
        "none"
    );


    var zoomData =
        currentData.filter(
            function(d) {

                return (

                    d.merchant_category
                    ===
                    selectedCell.merchant

                    &&

                    d.amount_range
                    ===
                    selectedCell.range

                );

            }
        );


    var fraudulentTransactions =
        zoomData.filter(
            function(d) {

                return d.is_fraud === 1;

            }
        );


    var legitimateTransactions =
        zoomData.filter(
            function(d) {

                return d.is_fraud === 0;

            }
        );


    var averageAmount =
        d3.mean(
            zoomData,
            function(d) {

                return d.amount_usd;

            }
        );


    var minAmount =
        d3.min(
            zoomData,
            function(d) {

                return d.amount_usd;

            }
        );


    var maxAmount =
        d3.max(
            zoomData,
            function(d) {

                return d.amount_usd;

            }
        );


    var fraudRate = 0;


    if (zoomData.length > 0) {

        fraudRate =

            (
                fraudulentTransactions.length
                /
                zoomData.length
            )

            * 100;

    }


    d3.select("#zoomInfo")

        .style(
            "display",
            "block"
        )

        .html(

            "<h2>Detailed View</h2>"

            +

            "<p class='zoom-subtitle'>"

            +

            selectedCell.merchant

            +

            " • "

            +

            selectedCell.range

            +

            "</p>"

            +

            "<div class='zoom-stats'>"

            +

            "<div class='stat'>"

            +

            "<span class='stat-value'>"

            +

            zoomData.length

            +

            "</span>"

            +

            "<span class='stat-label'>"

            +

            "Total transactions"

            +

            "</span>"

            +

            "</div>"

            +

            "<div class='stat'>"

            +

            "<span class='stat-value'>"

            +

            fraudulentTransactions.length

            +

            "</span>"

            +

            "<span class='stat-label'>"

            +

            "Fraudulent"

            +

            "</span>"

            +

            "</div>"

            +

            "<div class='stat'>"

            +

            "<span class='stat-value'>"

            +

            legitimateTransactions.length

            +

            "</span>"

            +

            "<span class='stat-label'>"

            +

            "Legitimate"

            +

            "</span>"

            +

            "</div>"

            +

            "<div class='stat'>"

            +

            "<span class='stat-value'>"

            +

            fraudRate.toFixed(2)

            +

            "%"

            +

            "</span>"

            +

            "<span class='stat-label'>"

            +

            "Fraud rate"

            +

            "</span>"

            +

            "</div>"

            +

            "<div class='stat'>"

            +

            "<span class='stat-value'>$"

            +

            averageAmount.toFixed(2)

            +

            "</span>"

            +

            "<span class='stat-label'>"

            +

            "Average amount"

            +

            "</span>"

            +

            "</div>"

            +

            "</div>"

        );


    d3.select("#backButton")

        .style(
            "display",
            "inline-block"
        );


    drawDetailedView(

        zoomData,

        selectedCell,

        minAmount,

        maxAmount

    );

}


function drawDetailedView(
    zoomData,
    selectedCell,
    minAmount,
    maxAmount
) {

    svg
        .selectAll("*")
        .remove();


    var xMin =
        Math.max(
            0,
            minAmount
        );


    var xMax =
        maxAmount;


    if (xMin === xMax) {

        xMin =
            Math.max(
                0,
                xMin - 1
            );

        xMax =
            xMax + 1;

    }


    var x =
        d3.scaleLinear()

            .domain([
                xMin,
                xMax
            ])

            .nice()

            .range([
                0,
                width
            ]);


    var y =
        d3.scaleBand()

            .domain([
                "Legitimate",
                "Fraudulent"
            ])

            .range([
                0,
                height
            ])

            .padding(0.4);


    svg.append("g")

        .attr(
            "class",
            "axis"
        )

        .attr(
            "transform",
            "translate(0,"
            + height
            + ")"
        )

        .call(
            d3.axisBottom(x)
        );


    svg.append("g")

        .attr(
            "class",
            "axis"
        )

        .call(
            d3.axisLeft(y)
        );


    svg.append("text")

        .attr(
            "x",
            width / 2
        )

        .attr(
            "y",
            -20
        )

        .attr(
            "text-anchor",
            "middle"
        )

        .attr(
            "font-size",
            "16px"
        )

        .attr(
            "font-weight",
            "bold"
        )

        .text(

            selectedCell.merchant

            +

            " — "

            +

            selectedCell.range

        );


    svg.selectAll(
        ".transaction-point"
    )

        .data(zoomData)

        .enter()

        .append("circle")

        .attr(
            "class",
            "transaction-point"
        )

        .attr(
            "cx",
            function(d) {

                return x(
                    d.amount_usd
                );

            }
        )

        .attr(
            "cy",
            function(d) {

                if (
                    d.is_fraud === 1
                ) {

                    return (

                        y("Fraudulent")

                        +

                        y.bandwidth() / 2

                    );

                }


                return (

                    y("Legitimate")

                    +

                    y.bandwidth() / 2

                );

            }
        )

        .attr(
            "r",
            6
        )

        .attr(
            "fill",
            function(d) {

                if (
                    d.is_fraud === 1
                ) {

                    return "#d73027";

                }


                return "#4575b4";

            }
        )

        .attr(
            "opacity",
            0.7
        )

        .attr(
            "stroke",
            "white"
        )

        .attr(
            "stroke-width",
            1
        )


        .on(
            "mouseover",
            function(d) {

                tooltip

                    .style(
                        "display",
                        "block"
                    )

                    .html(

                        "<div class='tooltip-title'>"

                        +

                        "Transaction details"

                        +

                        "</div>"

                        +

                        "<strong>Merchant category:</strong> "

                        +

                        d.merchant_category

                        +

                        "<br>"

                        +

                        "<strong>Amount:</strong> $"

                        +

                        d.amount_usd.toFixed(2)

                        +

                        "<br>"

                        +

                        "<strong>Status:</strong> "

                        +

                        (
                            d.is_fraud === 1

                                ? "Fraudulent"

                                : "Legitimate"
                        )

                    );

            }
        )


        .on(
            "mousemove",
            function() {

                tooltip

                    .style(
                        "left",
                        (
                            d3.event.pageX
                            + 15
                        )
                        + "px"
                    )

                    .style(
                        "top",
                        (
                            d3.event.pageY
                            + 15
                        )
                        + "px"
                    );

            }
        )


        .on(
            "mouseout",
            function() {

                tooltip.style(
                    "display",
                    "none"
                );

            }
        );


    svg.append("text")

        .attr(
            "class",
            "axis-title"
        )

        .attr(
            "x",
            width / 2
        )

        .attr(
            "y",
            height + 70
        )

        .attr(
            "text-anchor",
            "middle"
        )

        .text(
            "Transaction Amount (USD)"
        );


    svg.append("text")

        .attr(
            "class",
            "axis-title"
        )

        .attr(
            "transform",
            "rotate(-90)"
        )

        .attr(
            "x",
            -height / 2
        )

        .attr(
            "y",
            -120
        )

        .attr(
            "text-anchor",
            "middle"
        )

        .text(
            "Transaction Status"
        );

}


function hideZoom() {

    d3.select("#zoomInfo")
        .style(
            "display",
            "none"
        );


    d3.select("#backButton")
        .style(
            "display",
            "none"
        );


    tooltip.style(
        "display",
        "none"
    );

}