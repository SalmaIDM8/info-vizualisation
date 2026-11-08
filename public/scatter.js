const CSV_URL = "data/credit_card_fraud_2026_CLEANED_v1.csv";
const REQUIRED_COLUMNS = ["distance_from_home_km", "amount_usd", "is_fraud"];

const LEVELS = [
  {k: 1,  name: "Overview",     hint: "Density of all transactions, each fraud as a dot"},
  {k: 3,  name: "Regions",      hint: "Each cell becomes a pie: size and fraud share"},
  {k: 8,  name: "Transactions", hint: "Cells dissolve into individual transactions"},
  {k: 20, name: "Details",      hint: "Transactions gain their amount, merchant and risk signals"}
];
const MAX_ZOOM = 60;
const HEX_RADIUS = 12;
const STRIP_BINS = 14;
const MIN_RATE_SAMPLE = 30;
const MAX_LABELS = 40;

const LENS = {radius: 100, distortion: 0.35, detailThreshold: 1.8, maxLabels: 8};

const RISK_FLAGS = [
  ["used_vpn", "VPN"],
  ["ip_country_mismatch", "IP mismatch"],
  ["billing_shipping_mismatch", "Billing mismatch"],
  ["is_ai_generated_scam_attempt", "AI scam"],
  ["is_new_merchant", "New merchant"]
];
const DISTANCE_BANDS = [[0, 10], [10, 25], [25, 50], [50, 100], [100, Infinity]];
const AMOUNT_BANDS = [[0, 50], [50, 250], [250, 1000], [1000, Infinity]];

const COLORS = {};
let DENSITY_RAMP;

function readTheme() {
  const style = getComputedStyle(document.documentElement);
  const token = name => style.getPropertyValue(`--${name}`).trim();
  Object.assign(COLORS, {surface: token("surface"), legit: token("legit"), fraud: token("fraud"), ink: token("ink"), axis: token("axis")});
  DENSITY_RAMP = d3.interpolateRgbBasis(["ramp-0", "ramp-1", "ramp-2", "ramp-3"].map(token));
}
readTheme();

const formatInt = d3.format(",");
const formatPercent = d3.format(".1%");
const formatRho = d3.format("+.3f");
const formatMoney = d3.format("$,.2f");
const formatKm = d3.format(",.1f");
const formatMoneyTick = d => d >= 1000 ? `$${d3.format(".3~s")(d).replace("k", "K")}` : `$${d3.format(".3~r")(d)}`;

const state = {
  all: [],
  rows: [],
  drawOrder: [],
  bins: [],
  trend: [],
  overallRate: 0,
  transform: d3.zoomIdentity,
  level: -1,
  lensOn: false,
  pointer: null,
  lensHits: [],
  viewTimer: null
};

const svg = d3.select("#chart");
const plotContainer = document.querySelector("#plot");
const lensCanvas = document.querySelector("#lens");
const lensContext = lensCanvas.getContext("2d");
const tooltip = d3.select("#tooltip");

const defs = svg.append("defs");
const clipPlot = defs.append("clipPath").attr("id", "clip-plot").append("rect");
const clipTop = defs.append("clipPath").attr("id", "clip-top").append("rect");
const clipRight = defs.append("clipPath").attr("id", "clip-right").append("rect");
const clipMinimap = defs.append("clipPath").attr("id", "clip-minimap").append("rect");

const plot = svg.append("g");
const gridX = plot.append("g");
const gridY = plot.append("g");
const xAxisGroup = plot.append("g").attr("class", "axis");
const yAxisGroup = plot.append("g").attr("class", "axis");
const xTitle = plot.append("text").attr("class", "axis-title").attr("text-anchor", "middle");
const yTitle = plot.append("text").attr("class", "axis-title").attr("text-anchor", "middle");

const marks = plot.append("g").attr("clip-path", "url(#clip-plot)");
const layers = LEVELS.map(() => marks.append("g").attr("class", "layer"));

const hexZoom = layers[0].append("g");
const hexes = hexZoom.append("g").attr("id", "hexes");
const fraudDots = layers[0].append("g");
const pies = layers[1].append("g");
const dotsLegit = layers[2].append("g");
const dotsFraud = layers[2].append("g");
const txLabels = layers[2].append("g");

const trendCasing = marks.append("path").attr("class", "trend-casing");
const trendLine = marks.append("path").attr("class", "trend");
const hoverRing = marks.append("circle").attr("class", "hover-ring").style("display", "none");
const hoverHex = marks.append("path").attr("class", "hover-hex").style("display", "none");
const capture = plot.append("rect").attr("id", "zoom-capture");

const topStrip = svg.append("g");
const rightStrip = svg.append("g");
const minimap = svg.append("g");
const minimapFrame = minimap.append("rect").attr("class", "minimap-frame");
const minimapHexes = minimap.append("g").attr("clip-path", "url(#clip-minimap)")
  .append("use").attr("href", "#hexes").attr("pointer-events", "none");
const minimapView = minimap.append("rect").attr("class", "minimap-view");

const layout = {};
let x, y, zoomedX, zoomedY;
let hexbin, binTree, fraudTree, dotTree, hexColor, pieRadius;
const zoom = d3.zoom().scaleExtent([1, MAX_ZOOM]).on("zoom", zoomed);
capture.call(zoom);

const isTrue = value => ["1", "true"].includes(String(value).trim().toLowerCase());
const numeric = value => value === "" || value == null ? NaN : +value;

function parseRow(row, index) {
  return {
    key: index,
    id: row.transaction_id || String(index + 1),
    distance: numeric(row.distance_from_home_km),
    amount: numeric(row.amount_usd),
    fraud: isTrue(row.is_fraud),
    merchant: row.merchant_category || "Unknown",
    foreign: isTrue(row.is_foreign_transaction),
    flags: RISK_FLAGS.filter(([column]) => isTrue(row[column])).map(([, label]) => label)
  };
}

function useDataset(rows, name) {
  const missing = REQUIRED_COLUMNS.filter(column => !rows.columns.includes(column));
  if (missing.length) throw new Error(`${name} is missing: ${missing.join(", ")}`);

  const parsed = rows.map(parseRow);
  const valid = parsed.filter(d => Number.isFinite(d.distance) && Number.isFinite(d.amount) && d.distance >= 0 && d.amount > 0);
  if (!valid.length) throw new Error(`${name} has no usable rows`);

  state.all = valid;
  state.overallRate = d3.mean(valid, d => d.fraud ? 1 : 0);
  fillFilter("#filter-merchant", valid, d => d.merchant);
  d3.select("#filter-location").property("value", "all");

  const dropped = parsed.length - valid.length;
  setStatus(`${name}: ${formatInt(valid.length)} transactions` + (dropped ? `, ${formatInt(dropped)} rows without a valid distance or amount left out` : ""));
  state.transform = d3.zoomIdentity;
  render();
}

function fillFilter(selector, rows, accessor) {
  const values = ["all", ...Array.from(new Set(rows.map(accessor))).sort(d3.ascending)];
  d3.select(selector).selectAll("option").data(values).join("option")
    .attr("value", d => d)
    .text(d => d === "all" ? "All" : d);
  d3.select(selector).property("value", "all");
}

function setStatus(message, isError = false) {
  d3.select("#status").classed("error", isError).text(message);
}

function render() {
  measure();
  buildScales();
  applyFilters();
}

function measure() {
  const containerWidth = plotContainer.clientWidth;
  const containerHeight = plotContainer.clientHeight;
  const width = Math.max(280, containerWidth);
  const stripWidth = width < 700 ? 68 : 92;
  const stripHeight = width < 700 ? 56 : 64;
  const gap = 10;
  const margin = {top: 2, right: 4, bottom: 42, left: 60};
  const plotWidth = width - margin.left - margin.right - stripWidth - gap;
  const top = margin.top + stripHeight + gap;
  const plotHeight = Math.max(240, containerHeight - top - margin.bottom);
  Object.assign(layout, {
    width, plotWidth, plotHeight, stripWidth, stripHeight, containerWidth, containerHeight, top,
    left: margin.left,
    rightX: margin.left + plotWidth + gap,
    stripTop: margin.top
  });
  const height = top + plotHeight + margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
  plot.attr("transform", `translate(${layout.left},${layout.top})`);
  clipPlot.attr("width", plotWidth).attr("height", plotHeight);
  clipTop.attr("width", plotWidth).attr("height", stripHeight);
  clipRight.attr("width", stripWidth).attr("height", plotHeight);
  capture.attr("width", plotWidth).attr("height", plotHeight);
  xAxisGroup.attr("transform", `translate(0,${plotHeight})`);
  xTitle.attr("x", plotWidth / 2).attr("y", plotHeight + 36);
  yTitle.attr("transform", "rotate(-90)").attr("x", -plotHeight / 2).attr("y", -46);

  topStrip.attr("transform", `translate(${layout.left},${layout.stripTop})`);
  rightStrip.attr("transform", `translate(${layout.rightX},${layout.top})`);
  minimap.attr("transform", `translate(${layout.rightX},${layout.stripTop})`);
  minimapFrame.attr("width", stripWidth).attr("height", stripHeight);
  clipMinimap.attr("width", stripWidth).attr("height", stripHeight);
  minimapHexes.attr("transform", `scale(${stripWidth / plotWidth},${stripHeight / plotHeight})`);

  const ratio = window.devicePixelRatio || 1;
  lensCanvas.width = plotWidth * ratio;
  lensCanvas.height = plotHeight * ratio;
  lensCanvas.style.width = `${plotWidth}px`;
  lensCanvas.style.height = `${plotHeight}px`;
  lensCanvas.style.left = `${layout.left}px`;
  lensCanvas.style.top = `${layout.top}px`;
  lensContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  zoom.extent([[0, 0], [plotWidth, plotHeight]]).translateExtent([[0, 0], [plotWidth, plotHeight]]);
}

function buildScales() {
  const scaled = d3.select("#axis-mode").property("value") === "scaled";
  const maxDistance = d3.max(state.all, d => d.distance) || 1;
  const maxAmount = d3.max(state.all, d => d.amount) || 1;
  const minAmount = d3.min(state.all, d => d.amount) || 1;

  x = (scaled ? d3.scaleSqrt() : d3.scaleLinear()).domain([0, maxDistance]).nice().range([0, layout.plotWidth]);
  y = (scaled ? d3.scaleLog().domain([minAmount, maxAmount]) : d3.scaleLinear().domain([0, maxAmount]))
    .nice().range([layout.plotHeight, 0]);

  xTitle.text(`Distance from home (km${scaled ? ", square-root scale" : ""})`);
  yTitle.text(`Transaction amount (USD${scaled ? ", log scale" : ""})`);

  d3.selectAll(".strip-marks").remove();

  state.all.forEach(d => {
    d.baseX = x(d.distance);
    d.baseY = y(d.amount);
  });
}

function applyFilters() {
  const merchant = d3.select("#filter-merchant").property("value");
  const location = d3.select("#filter-location").property("value");

  state.rows = state.all.filter(d =>
    (merchant === "all" || d.merchant === merchant) &&
    (location === "all" || d.foreign === (location === "foreign")));
  state.drawOrder = [...state.rows.filter(d => !d.fraud), ...state.rows.filter(d => d.fraud)];

  hexbin = d3.hexbin().x(d => d.baseX).y(d => d.baseY).radius(HEX_RADIUS)
    .extent([[0, 0], [layout.plotWidth, layout.plotHeight]]);
  state.bins = hexbin(state.rows);
  state.bins.forEach(bin => bin.fraud = bin.filter(d => d.fraud).length);

  binTree = d3.quadtree().x(d => d.x).y(d => d.y).addAll(state.bins);
  fraudTree = d3.quadtree().x(d => d.baseX).y(d => d.baseY).addAll(state.rows.filter(d => d.fraud));
  dotTree = d3.quadtree().x(d => d.baseX).y(d => d.baseY).addAll(state.rows);

  state.trend = medianTrend(state.rows);
  drawOverview();
  drawTable("#table-distance", "Distance from home", DISTANCE_BANDS, d => d.distance, (from, to) => to === Infinity ? `${from}+ km` : `${from}–${to} km`);
  drawTable("#table-amount", "Transaction amount", AMOUNT_BANDS, d => d.amount, (from, to) => to === Infinity ? `$${formatInt(from)}+` : `$${formatInt(from)}–${formatInt(to)}`);

  capture.call(zoom.transform, state.transform);
}

function rateWithInterval(fraud, total) {
  if (!total) return {rate: NaN, low: NaN, high: NaN};
  const z = 1.96;
  const rate = fraud / total;
  const denominator = 1 + z * z / total;
  const center = (rate + z * z / (2 * total)) / denominator;
  const spread = z * Math.sqrt(rate * (1 - rate) / total + z * z / (4 * total * total)) / denominator;
  return {rate, low: Math.max(0, center - spread), high: Math.min(1, center + spread)};
}

function ranks(values) {
  const order = d3.range(values.length).sort((a, b) => values[a] - values[b]);
  const result = new Array(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) j++;
    for (let m = i; m <= j; m++) result[order[m]] = (i + j) / 2;
    i = j + 1;
  }
  return result;
}

function spearman(a, b) {
  const rankA = ranks(a), rankB = ranks(b);
  const meanA = d3.mean(rankA), meanB = d3.mean(rankB);
  let covariance = 0, varianceA = 0, varianceB = 0;
  for (let i = 0; i < rankA.length; i++) {
    covariance += (rankA[i] - meanA) * (rankB[i] - meanB);
    varianceA += (rankA[i] - meanA) ** 2;
    varianceB += (rankB[i] - meanB) ** 2;
  }
  return varianceA && varianceB ? covariance / Math.sqrt(varianceA * varianceB) : NaN;
}

function medianTrend(rows) {
  const thresholds = d3.range(1, STRIP_BINS).map(i => x.invert(layout.plotWidth * i / STRIP_BINS));
  return d3.bin().value(d => d.distance).domain(x.domain()).thresholds(thresholds)(rows)
    .filter(bin => bin.length >= MIN_RATE_SAMPLE)
    .map(bin => ({distance: d3.median(bin, d => d.distance), amount: d3.median(bin, d => d.amount)}));
}

function levelAt(k) {
  return d3.bisectRight(LEVELS.map(level => level.k), k) - 1;
}

function zoomed(event) {
  const t = event.transform;
  state.transform = t;
  zoomedX = t.rescaleX(x);
  zoomedY = t.rescaleY(y);

  drawAxes();
  hexZoom.attr("transform", t);
  setLevel(levelAt(t.k));

  if (state.level === 0) moveFraudDots();
  if (state.level === 1) drawPies();
  if (state.level >= 2) drawTransactions();

  const line = d3.line().x(d => zoomedX(d.distance)).y(d => zoomedY(d.amount))(state.trend);
  trendCasing.attr("d", line);
  trendLine.attr("d", line);

  moveStrip(topStrip, zoomedX, "x");
  moveStrip(rightStrip, zoomedY, "y");
  moveMinimap();
  drawLens();
  hideHover();

  clearTimeout(state.viewTimer);
  state.viewTimer = setTimeout(updateViewStatistics, 120);
}

function setLevel(level) {
  if (level === state.level) return;
  state.level = level;
  layers.forEach((layer, i) => layer.classed("active", i === Math.min(level, 2)));
  d3.select("#levels").selectAll("button").attr("aria-pressed", (d, i) => String(i === level));
  d3.selectAll(".key").attr("hidden", function () {
    return this.dataset.levels.split(" ").includes(String(level)) ? null : "";
  });
  if (level < 3) txLabels.selectAll("text").remove();
}

function zoomToLevel(index) {
  capture.transition().duration(750).call(zoom.scaleTo, LEVELS[index].k * 1.05);
}

function niceTicks(scale, count, minGap) {
  const [low, high] = d3.extent(scale.domain());
  const ticks = low === 0 ? [0] : [];
  for (let power = -2; power <= 8; power++) {
    [1, 2, 5].forEach(m => {
      const value = m * 10 ** power;
      const farEnough = !ticks.length || Math.abs(scale(value) - scale(ticks[ticks.length - 1])) >= minGap;
      if (value >= low && value <= high && farEnough) ticks.push(value);
    });
  }
  return ticks.length >= 4 ? ticks : d3.ticks(low, high, count);
}

function drawAxes() {
  const scaled = d3.select("#axis-mode").property("value") === "scaled";
  const xTicks = scaled ? niceTicks(zoomedX, 8, 34) : zoomedX.ticks(8);
  const yTicks = scaled ? niceTicks(zoomedY, 6, 24) : zoomedY.ticks(6);

  xAxisGroup.call(d3.axisBottom(zoomedX).tickValues(xTicks).tickFormat(d3.format(",~r")).tickSizeOuter(0));
  yAxisGroup.call(d3.axisLeft(zoomedY).tickValues(yTicks).tickFormat(formatMoneyTick).tickSizeOuter(0));

  gridX.selectAll("line").data(xTicks).join("line").attr("class", "gridline")
    .attr("x1", d => zoomedX(d)).attr("x2", d => zoomedX(d)).attr("y2", layout.plotHeight);
  gridY.selectAll("line").data(yTicks).join("line").attr("class", "gridline")
    .attr("y1", d => zoomedY(d)).attr("y2", d => zoomedY(d)).attr("x2", layout.plotWidth);
}

function drawOverview() {
  const maxCount = d3.max(state.bins, bin => bin.length) || 1;
  hexColor = d3.scaleSequentialLog(DENSITY_RAMP).domain([1, Math.max(2, maxCount)]);
  pieRadius = d3.scaleSqrt().domain([0, maxCount]).range([0, 1]);
  d3.select("#legend-max").text(formatInt(maxCount));

  hexes.selectAll("path").data(state.bins).join("path")
    .attr("d", bin => `M${bin.x},${bin.y}${hexbin.hexagon(HEX_RADIUS - 0.4)}`)
    .attr("fill", bin => hexColor(bin.length));

  fraudDots.selectAll("circle").data(state.rows.filter(d => d.fraud), d => d.key).join("circle")
    .attr("class", "fraud-dot")
    .attr("r", 3.5);
}

function moveFraudDots() {
  const t = state.transform;
  fraudDots.selectAll("circle").attr("cx", d => t.applyX(d.baseX)).attr("cy", d => t.applyY(d.baseY));
}

const pieLayout = d3.pie().sort(null).value(d => d.value);
const arc = d3.arc().innerRadius(0);

function drawPies() {
  const t = state.transform;
  const cellRadius = HEX_RADIUS * t.k * 0.92;
  const visible = state.bins.filter(bin => isInView(t.applyX(bin.x), t.applyY(bin.y), cellRadius));

  const groups = pies.selectAll("g.pie").data(visible, bin => `${bin.x},${bin.y}`).join(enter => {
    const group = enter.append("g").attr("class", "pie");
    group.selectAll("path")
      .data(bin => pieLayout([
        {cls: "pie-fraud", value: bin.fraud},
        {cls: "pie-legit", value: bin.length - bin.fraud}
      ]))
      .join("path").attr("class", d => d.data.cls);
    group.append("text").attr("class", "pie-count");
    group.append("text").attr("class", "pie-rate");
    return group;
  });

  groups.attr("transform", bin => `translate(${t.applyX(bin.x)},${t.applyY(bin.y)})`);
  groups.each(function (bin) {
    const group = d3.select(this);
    const radius = Math.max(4, cellRadius * pieRadius(bin.length));
    group.selectAll("path").attr("d", arc.outerRadius(radius));
    group.select(".pie-count").attr("y", -1).text(radius >= 17 ? formatInt(bin.length) : "");
    group.select(".pie-rate").attr("y", 11).text(radius >= 17 ? cellRateLabel(bin) : "");
  });
}

function cellRateLabel(bin) {
  return bin.length < MIN_RATE_SAMPLE ? `${bin.fraud} fraud` : formatPercent(bin.fraud / bin.length);
}

function isInView(px, py, padding = 0) {
  return px >= -padding && px <= layout.plotWidth + padding && py >= -padding && py <= layout.plotHeight + padding;
}

function drawTransactions() {
  const t = state.transform;
  const visible = state.rows.filter(d => isInView(t.applyX(d.baseX), t.applyY(d.baseY), 8));
  const radius = Math.min(6, 2.5 + Math.log2(t.k / LEVELS[2].k));

  const draw = (group, rows, r) => group.selectAll("circle").data(rows, d => d.key).join("circle")
    .attr("cx", d => t.applyX(d.baseX))
    .attr("cy", d => t.applyY(d.baseY))
    .attr("r", r);

  draw(dotsLegit, visible.filter(d => !d.fraud), radius).attr("class", "dot-legit");
  draw(dotsFraud, visible.filter(d => d.fraud), radius + 1.25).attr("class", "dot-fraud");

  txLabels.selectAll("text").data(state.level === 3 ? pickLabels(visible, radius) : [], d => d.row.key).join("text")
    .attr("class", d => d.row.fraud ? "tx-label fraud" : "tx-label")
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("text-anchor", d => d.anchor)
    .text(d => d.text);
}

function transactionLabel(d) {
  const risk = d.flags.length ? ` ⚠ ${d.flags.join(", ")}` : "";
  return `${formatMoney(d.amount)} · ${d.merchant}${risk}`;
}

function overlapsAny(box, placed) {
  return placed.some(p => box.left < p.box.right && box.right > p.box.left && box.top < p.box.bottom && box.bottom > p.box.top);
}

function pickLabels(visible, radius) {
  const t = state.transform;
  const placed = [];
  const candidates = [...visible].sort((a, b) => d3.descending(a.fraud, b.fraud) || d3.descending(a.amount, b.amount));

  for (const row of candidates) {
    if (placed.length >= MAX_LABELS) break;
    const text = transactionLabel(row);
    const width = text.length * 5.8;
    const px = t.applyX(row.baseX), py = t.applyY(row.baseY);
    const flip = px + radius + 6 + width > layout.plotWidth;
    const left = flip ? px - radius - 6 - width : px + radius + 6;
    const box = {left, right: left + width, top: py - 8, bottom: py + 8};
    if (box.top < 0 || box.bottom > layout.plotHeight || overlapsAny(box, placed)) continue;
    placed.push({row, box, text, x: flip ? left + width : left, y: py + 4, anchor: flip ? "end" : "start"});
  }
  return placed;
}

function fisheye(px, py, focus) {
  const dx = px - focus[0];
  const dy = py - focus[1];
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance >= LENS.radius) return {x: px, y: py, scale: 1};
  if (distance === 0) return {x: px, y: py, scale: (LENS.distortion + 1) / LENS.distortion};
  const k = (LENS.distortion + 1) * LENS.radius * distance / (LENS.distortion * LENS.radius + distance);
  const scale = k / distance;
  return {x: focus[0] + dx * scale, y: focus[1] + dy * scale, scale};
}

function drawLens() {
  const context = lensContext;
  context.clearRect(0, 0, layout.plotWidth, layout.plotHeight);
  state.lensHits = [];
  if (!state.lensOn || !state.pointer) return;

  const t = state.transform;
  const focus = state.pointer;
  const candidates = [];

  context.save();
  context.beginPath();
  context.arc(focus[0], focus[1], LENS.radius, 0, 2 * Math.PI);
  context.clip();
  context.fillStyle = COLORS.surface;
  context.fillRect(0, 0, layout.plotWidth, layout.plotHeight);

  for (const d of state.drawOrder) {
    const f = fisheye(t.applyX(d.baseX), t.applyY(d.baseY), focus);
    if (f.scale === 1) continue;
    const radius = (d.fraud ? 2 : 1) * Math.sqrt(f.scale);
    context.globalAlpha = d.fraud ? 1 : 0.5;
    context.fillStyle = d.fraud ? COLORS.fraud : COLORS.legit;
    context.beginPath();
    context.arc(f.x, f.y, radius, 0, 2 * Math.PI);
    context.fill();
    state.lensHits.push({d, x: f.x, y: f.y});
    if (d.fraud && f.scale > LENS.detailThreshold) candidates.push({text: formatMoney(d.amount), x: f.x + radius + 3, y: f.y + 4, scale: f.scale});
  }

  const labels = [];
  candidates.sort((a, b) => b.scale - a.scale);
  for (const label of candidates) {
    if (labels.length >= LENS.maxLabels) break;
    const box = {left: label.x, right: label.x + label.text.length * 6.5, top: label.y - 11, bottom: label.y + 3};
    if (!overlapsAny(box, labels)) labels.push({...label, box});
  }

  context.globalAlpha = 1;
  context.font = "600 11px Inter, system-ui, sans-serif";
  context.lineWidth = 3;
  context.strokeStyle = COLORS.surface;
  context.fillStyle = COLORS.ink;
  labels.forEach(label => {
    context.strokeText(label.text, label.x, label.y);
    context.fillText(label.text, label.x, label.y);
  });
  context.restore();

  context.strokeStyle = COLORS.axis;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(focus[0], focus[1], LENS.radius, 0, 2 * Math.PI);
  context.stroke();
}

function stripBins(rows, accessor, scale, pixels) {
  const thresholds = d3.range(1, STRIP_BINS).map(i => scale.invert(pixels * i / STRIP_BINS)).sort(d3.ascending);
  return d3.bin().value(accessor).domain(d3.extent(scale.domain())).thresholds(thresholds)(rows)
    .filter(bin => bin.length)
    .map(bin => {
      const fraud = bin.filter(d => d.fraud).length;
      return {x0: bin.x0, x1: bin.x1, n: bin.length, fraud, ...rateWithInterval(fraud, bin.length)};
    });
}

function drawStrip(group, bins, axis, maxRate) {
  const horizontal = axis === "x";
  const length = horizontal ? layout.plotWidth : layout.plotHeight;
  const depth = horizontal ? layout.stripHeight : layout.stripWidth;
  const padding = horizontal ? [20, 8] : [8, 8];
  const rate = d3.scaleLinear().domain([0, maxRate]).range(horizontal ? [depth - padding[1], padding[0]] : [padding[0], depth - padding[1]]).clamp(true);

  group.selectAll("rect.strip-bg").data([0]).join("rect").attr("class", "strip-bg")
    .attr("width", horizontal ? length : depth)
    .attr("height", horizontal ? depth : length);

  const narrow = layout.plotWidth < 560;
  const titles = horizontal
    ? [narrow ? "Fraud rate along distance" : "Fraud rate along distance, in view · dot = rate, bar = 95% CI, dashed = overall"]
    : ["Fraud rate", "by amount"];
  group.selectAll("text.strip-title").data(titles).join("text").attr("class", "strip-title")
    .attr("x", horizontal ? 6 : 0)
    .attr("y", (d, i) => horizontal ? 14 : length + 27 + i * 13)
    .text(d => d);

  const baseline = rate(state.overallRate);
  group.selectAll("line.strip-baseline").data([0]).join("line").attr("class", "strip-baseline")
    .attr(horizontal ? "x2" : "y2", length)
    .attr(horizontal ? "y1" : "x1", baseline)
    .attr(horizontal ? "y2" : "x2", baseline);

  const ticks = !horizontal ? [0, maxRate] : rate(0) - baseline < 11 ? [state.overallRate, maxRate] : [0, state.overallRate, maxRate];
  group.selectAll("text.strip-label").data(ticks).join("text")
    .attr("class", "strip-label")
    .attr("text-anchor", (d, i) => horizontal || i ? "end" : "start")
    .attr("x", d => horizontal ? -6 : rate(d))
    .attr("y", d => horizontal ? rate(d) + 3.5 : length + 13)
    .text(d => d3.format(".1~%")(d));

  const marksGroup = group.selectAll("g.strip-marks").data([0]).join("g").attr("class", "strip-marks")
    .attr("clip-path", `url(#${horizontal ? "clip-top" : "clip-right"})`);

  marksGroup.selectAll("line.strip-whisker").data(bins).join("line").attr("class", "strip-whisker")
    .attr(horizontal ? "y1" : "x1", d => rate(d.low))
    .attr(horizontal ? "y2" : "x2", d => rate(d.high));
  marksGroup.selectAll("circle.strip-dot").data(bins).join("circle")
    .attr("class", d => d.n < MIN_RATE_SAMPLE ? "strip-dot sparse" : "strip-dot")
    .attr("r", 3)
    .attr(horizontal ? "cy" : "cx", d => rate(d.rate));
}

function moveStrip(group, scale, axis) {
  const position = d => (scale(d.x0) + scale(d.x1)) / 2;
  const coordinates = axis === "x" ? ["x1", "x2", "cx"] : ["y1", "y2", "cy"];
  group.selectAll("line.strip-whisker").attr(coordinates[0], position).attr(coordinates[1], position);
  group.selectAll("circle.strip-dot").attr(coordinates[2], position);
}

function moveMinimap() {
  const t = state.transform;
  const scaleX = layout.stripWidth / layout.plotWidth;
  const scaleY = layout.stripHeight / layout.plotHeight;
  minimapView
    .attr("x", t.invertX(0) * scaleX)
    .attr("y", t.invertY(0) * scaleY)
    .attr("width", layout.stripWidth / t.k)
    .attr("height", layout.stripHeight / t.k);
}

function updateViewStatistics() {
  const t = state.transform;
  const view = state.rows.filter(d => isInView(t.applyX(d.baseX), t.applyY(d.baseY)));
  const fraud = view.filter(d => d.fraud).length;
  const {rate, low, high} = rateWithInterval(fraud, view.length);
  const reliable = view.length >= MIN_RATE_SAMPLE;

  d3.select("#tile-count").text(formatInt(view.length));
  d3.select("#tile-count-sub").text(`transactions of ${formatInt(state.all.length)} · ${formatInt(fraud)} fraud`);
  d3.select("#tile-rate").text(view.length ? formatPercent(rate) : "–");
  d3.select("#tile-rate-sub").text(view.length ? `95% CI ${formatPercent(low)}–${formatPercent(high)}` : "");

  const distances = view.map(d => d.distance);
  const rho = values => reliable ? formatRho(spearman(distances, values)) : "–";
  d3.select("#tile-rho-amount").text(rho(view.map(d => d.amount)));
  d3.select("#tile-rho-fraud").text(rho(view.map(d => d.fraud ? 1 : 0)));

  d3.select("#verdict").text(verdict(view.length, rate, low, high));
  d3.select("#zoom-readout").text(`×${d3.format(".1f")(t.k)}`);

  const distanceBins = stripBins(view, d => d.distance, zoomedX, layout.plotWidth);
  const amountBins = stripBins(view, d => d.amount, zoomedY, layout.plotHeight);
  const reliableBins = [...distanceBins, ...amountBins].filter(d => d.n >= MIN_RATE_SAMPLE);
  const maxRate = Math.min(0.5, Math.max(state.overallRate * 2.5, d3.max(reliableBins, d => d.high) || 0));
  drawStrip(topStrip, distanceBins, "x", maxRate);
  drawStrip(rightStrip, amountBins, "y", maxRate);
  moveStrip(topStrip, zoomedX, "x");
  moveStrip(rightStrip, zoomedY, "y");
}

function verdict(count, rate, low, high) {
  if (count < MIN_RATE_SAMPLE) return `Only ${formatInt(count)} transactions in view: too few to estimate a fraud rate.`;
  const overall = formatPercent(state.overallRate);
  if (low > state.overallRate) return `Fraud is more frequent here than in the full dataset (${overall}).`;
  if (high < state.overallRate) return `Fraud is less frequent here than in the full dataset (${overall}).`;
  return `The fraud rate here cannot be told apart from the full dataset (${overall}).`;
}

function drawTable(selector, title, bands, accessor, label) {
  const rows = bands.map(([from, to]) => {
    const inBand = state.rows.filter(d => accessor(d) >= from && accessor(d) < to);
    const fraud = inBand.filter(d => d.fraud).length;
    const {rate, low, high} = rateWithInterval(fraud, inBand.length);
    return [
      label(from, to),
      formatInt(inBand.length),
      inBand.length ? formatPercent(rate) : "–",
      inBand.length ? `${d3.format(".1f")(low * 100)}–${formatPercent(high)}` : "–"
    ];
  });

  const table = d3.select(selector);
  table.selectAll("caption").data([title]).join("caption").text(d => d);
  table.selectAll("thead").data([0]).join("thead").selectAll("tr").data([0]).join("tr")
    .selectAll("th").data(["Band", "Count", "Fraud", "95% CI"]).join("th").text(d => d);
  table.selectAll("tbody").data([0]).join("tbody").selectAll("tr").data(rows).join("tr")
    .selectAll("td").data(d => d).join("td").text(d => d);
}

function transactionLines(d) {
  return [
    `${formatMoney(d.amount)} at ${formatKm(d.distance)} km`,
    d.fraud ? "Fraud" : "Legitimate",
    d.merchant,
    d.foreign ? "Foreign transaction" : "Domestic transaction",
    d.flags.length ? `⚠ ${d.flags.join(", ")}` : "No risk signal"
  ];
}

function cellLines(bin) {
  const [nearest, farthest] = d3.extent(bin, d => d.distance);
  return [
    `${formatInt(bin.length)} transactions`,
    `${formatInt(bin.fraud)} fraud (${formatPercent(bin.fraud / bin.length)})`,
    `${formatKm(nearest)} to ${formatKm(farthest)} km`,
    `Median amount ${formatMoney(d3.median(bin, d => d.amount))}`
  ];
}

function showTooltip(event, lines) {
  tooltip.selectAll("div").data(lines).join("div").text(d => d);
  const box = tooltip.node().getBoundingClientRect();
  const left = Math.min(event.clientX + 14, window.innerWidth - box.width - 8);
  const top = Math.min(event.clientY + 14, window.innerHeight - box.height - 8);
  tooltip.style("opacity", 1).style("left", `${left}px`).style("top", `${top}px`);
}

function hideHover() {
  tooltip.style("opacity", 0);
  hoverRing.style("display", "none");
  hoverHex.style("display", "none");
}

function showHoverRing(px, py, radius) {
  hoverRing.style("display", null).attr("cx", px).attr("cy", py).attr("r", radius);
}

function onPointerMove(event) {
  state.pointer = d3.pointer(event, capture.node());
  const [px, py] = state.pointer;
  const t = state.transform;
  const baseX = t.invertX(px), baseY = t.invertY(py);
  hideHover();

  if (state.lensOn) {
    drawLens();
    const nearest = d3.least(state.lensHits, hit => (hit.x - px) ** 2 + (hit.y - py) ** 2);
    if (nearest && Math.hypot(nearest.x - px, nearest.y - py) < 14) {
      showHoverRing(nearest.x, nearest.y, 8);
      showTooltip(event, transactionLines(nearest.d));
    }
    return;
  }

  const row = (state.level === 0 ? fraudTree : state.level >= 2 ? dotTree : null)?.find(baseX, baseY, 14 / t.k);
  if (row) {
    showHoverRing(t.applyX(row.baseX), t.applyY(row.baseY), 8);
    showTooltip(event, transactionLines(row));
    return;
  }

  if (state.level < 2) {
    const bin = binTree.find(baseX, baseY, HEX_RADIUS * 1.2);
    if (bin) {
      hoverHex.style("display", null)
        .attr("d", hexbin.hexagon(HEX_RADIUS))
        .attr("transform", `translate(${t.applyX(bin.x)},${t.applyY(bin.y)}) scale(${t.k})`);
      showTooltip(event, cellLines(bin));
    }
  }
}

capture
  .on("pointermove", onPointerMove)
  .on("pointerleave", () => {
    state.pointer = null;
    hideHover();
    drawLens();
  });

const levelButtons = d3.select("#levels").selectAll("button").data(LEVELS).join("button")
  .attr("type", "button")
  .attr("aria-pressed", "false")
  .on("click", (event, d) => zoomToLevel(LEVELS.indexOf(d)));
levelButtons.append("span").attr("class", "level-num").text((d, i) => i + 1);
levelButtons.append("span").attr("class", "level-name").text(d => d.name);
levelButtons.append("span").attr("class", "level-hint").text(d => d.hint);

d3.selectAll("#filter-merchant, #filter-location").on("change", applyFilters);

d3.select("#axis-mode").on("change", () => {
  state.transform = d3.zoomIdentity;
  render();
});

d3.select("#lens-toggle").on("click", function () {
  state.lensOn = !state.lensOn;
  d3.select(this).attr("aria-pressed", String(state.lensOn));
  hideHover();
  drawLens();
});

d3.select("#panel-toggle").on("click", function () {
  const hidden = !d3.select(".workspace").classed("panel-hidden");
  d3.select(".workspace").classed("panel-hidden", hidden);
  d3.select(this).attr("aria-pressed", String(hidden));
});

d3.select("#reset-zoom").on("click", () => {
  capture.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
});

minimapFrame.on("click", event => {
  const [px, py] = d3.pointer(event, minimapFrame.node());
  capture.transition().duration(500).call(zoom.translateTo,
    px * layout.plotWidth / layout.stripWidth,
    py * layout.plotHeight / layout.stripHeight);
});

d3.select("#file-input").on("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    useDataset(d3.csvParse(await file.text()), file.name);
  } catch (error) {
    setStatus(`Could not load this file. ${error.message}. The current dataset is unchanged.`, true);
  }
  event.target.value = "";
});

let resizeTimer;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!state.all.length) return;
    if (plotContainer.clientWidth === layout.containerWidth && plotContainer.clientHeight === layout.containerHeight) return;
    const {plotWidth, plotHeight} = layout;
    const t = state.transform;
    measure();
    state.transform = d3.zoomIdentity
      .translate(t.x * layout.plotWidth / plotWidth, t.y * layout.plotHeight / plotHeight)
      .scale(t.k);
    buildScales();
    applyFilters();
  }, 150);
}
window.addEventListener("resize", onResize);
new ResizeObserver(onResize).observe(plotContainer);

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  readTheme();
  if (state.all.length) applyFilters();
});

d3.csv(CSV_URL)
  .then(rows => useDataset(rows, "credit_card_fraud_2026_CLEANED_v1.csv"))
  .catch(error => {
    console.error("Error loading transaction data:", error);
    setStatus("Could not load the default dataset. Start the page with node server.js, or use Load CSV.", true);
  });
