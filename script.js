const sampleData = [
  ["Jan", 12],
  ["Feb", 20],
  ["Mar", 16],
  ["Apr", 24],
  ["May", 22],
  ["Jun", 30],
  ["Jul", 26],
  ["Aug", 34],
  ["Sep", 39],
  ["Oct", 31],
  ["Nov", 36],
  ["Dec", 45],
];

const dataRows = document.querySelector("#dataRows");
const addRowButton = document.querySelector("#addRowButton");
const xColumnHead = document.querySelector("#xColumnHead");
const graphModeInput = document.querySelector("#graphMode");
const chartTitleInput = document.querySelector("#chartTitle");
const xLabelInput = document.querySelector("#xLabel");
const yLabelInput = document.querySelector("#yLabel");
const lineWidthInput = document.querySelector("#lineWidth");
const linePatternInput = document.querySelector("#linePattern");
const pointSizeInput = document.querySelector("#pointSize");
const plotButton = document.querySelector("#plotButton");
const printButton = document.querySelector("#printButton");
const saveCsvButton = document.querySelector("#saveCsvButton");
const loadCsvButton = document.querySelector("#loadCsvButton");
const csvFileInput = document.querySelector("#csvFileInput");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");
const message = document.querySelector("#message");
const chart = document.querySelector("#chart");

const colors = {
  up: "#168b52",
  down: "#c73535",
  flat: "#5f6f89",
};

let chartState = null;

function getMode() {
  return graphModeInput.value;
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function dateToInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayInputValue() {
  return dateToInputValue(new Date());
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return todayInputValue();
  date.setDate(date.getDate() + days);
  return dateToInputValue(date);
}

function formatDateLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function nextTimeRowValues() {
  const rows = [...dataRows.querySelectorAll(".data-row")];
  const previousRow = rows.at(-1);
  const previousDate = previousRow?.querySelector(".x-value").value || todayInputValue();
  const previousY = previousRow?.querySelector(".y-value").value || "";
  return [rows.length ? addDays(previousDate, 1) : todayInputValue(), previousY, ""];
}

function createDataRow(x = "", y = "", note = "") {
  const row = document.createElement("div");
  row.className = "data-row";

  const xInput = document.createElement("input");
  xInput.type = getMode() === "time" ? "date" : "text";
  xInput.className = "x-value";
  xInput.value = x;
  xInput.setAttribute("aria-label", getMode() === "time" ? "Date value" : "X value");

  const yInput = document.createElement("input");
  yInput.type = "number";
  yInput.className = "y-value";
  yInput.value = y;
  yInput.step = "any";
  yInput.setAttribute("aria-label", "Y value");

  const noteInput = document.createElement("input");
  noteInput.type = "text";
  noteInput.className = "note-value";
  noteInput.value = note;
  noteInput.setAttribute("aria-label", "Point text");

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-row";
  removeButton.textContent = "x";
  removeButton.setAttribute("aria-label", "Remove row");

  row.append(xInput, yInput, noteInput, removeButton);
  return row;
}

function setRows(rows) {
  dataRows.innerHTML = "";
  rows.forEach(([x, y, note]) => dataRows.appendChild(createDataRow(x, y, note)));
}

function updateModeHeader(mode) {
  graphModeInput.value = mode;
  xColumnHead.textContent = mode === "time" ? "Date" : "X";
}

function getRawRows() {
  return [...dataRows.querySelectorAll(".data-row")].map((row) => ({
    x: row.querySelector(".x-value").value.trim(),
    y: row.querySelector(".y-value").value.trim(),
    note: row.querySelector(".note-value").value.trim(),
  }));
}

function addEmptyRows(count) {
  for (let index = 0; index < count; index += 1) {
    const [x, y, note] = getMode() === "time" ? nextTimeRowValues() : ["", "", ""];
    dataRows.appendChild(createDataRow(x, y, note));
  }
}

function readTimeValuesByDate() {
  const valuesByDate = new Map();

  dataRows.querySelectorAll(".data-row").forEach((row) => {
    const dateValue = row.querySelector(".x-value").value;
    const yValue = row.querySelector(".y-value").value;
    const noteValue = row.querySelector(".note-value").value;
    if (dateValue) valuesByDate.set(dateValue, { y: yValue, note: noteValue });
  });

  return valuesByDate;
}

function collectPoints() {
  let runningY = 0;

  return [...dataRows.querySelectorAll(".data-row")]
    .map((row, index) => {
      const xInput = row.querySelector(".x-value");
      const rawX = xInput.value.trim();
      const x = getMode() === "time" ? formatDateLabel(rawX) : rawX || String(index + 1);
      const yRaw = row.querySelector(".y-value").value.trim();
      const note = row.querySelector(".note-value").value.trim();
      const yChange = Number(yRaw);

      if (!yRaw || (getMode() === "time" && !rawX) || !Number.isFinite(yChange)) return null;

      runningY += yChange;
      return { x, y: runningY, yChange, note };
    })
    .filter(Boolean);
}

function buildTimeRows(baseY = "") {
  const start = todayInputValue();
  return [[start, baseY, ""]];
}

function buildTimeRowsUntilToday(startDate, fallbackY = "", valuesByDate = new Map()) {
  const today = todayInputValue();
  const rows = [];

  if (!startDate || startDate > today) {
    const value = valuesByDate.get(startDate);
    return [[startDate || today, value?.y ?? fallbackY, value?.note ?? ""]];
  }

  for (let date = startDate; date <= today; date = addDays(date, 1)) {
    const value = valuesByDate.get(date);
    rows.push([date, value?.y ?? fallbackY, value?.note ?? ""]);
  }

  return rows;
}

function syncTimeRowsFromFirstDate() {
  if (getMode() !== "time") return;

  const firstRow = dataRows.querySelector(".data-row");
  const firstDate = firstRow?.querySelector(".x-value").value;
  if (!firstDate) return;

  const valuesByDate = readTimeValuesByDate();
  const fallbackY = firstRow.querySelector(".y-value").value;
  setRows(buildTimeRowsUntilToday(firstDate, fallbackY, valuesByDate));
  plot();
}

function fillBlankTimeYValues(value) {
  dataRows.querySelectorAll(".data-row:not(:first-child) .y-value").forEach((input) => {
    if (!input.value.trim()) input.value = value;
  });
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((csvRow) => csvRow.some((value) => value.trim()));
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replaceAll(" ", "_");
}

function exportCsv() {
  const rows = getRawRows().filter((row) => row.x || row.y || row.note);

  if (!rows.length) {
    setMessage("Add at least one row before saving CSV.", true);
    return;
  }

  const header = ["graph_mode", "chart_title", "x_axis_label", "y_axis_label", "x", "y", "text"];
  const csvRows = [
    header,
    ...rows.map((row) => [
      getMode(),
      chartTitleInput.value.trim(),
      xLabelInput.value.trim(),
      yLabelInput.value.trim(),
      row.x,
      row.y,
      row.note,
    ]),
  ];
  const csv = csvRows.map((csvRow) => csvRow.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const datePart = todayInputValue();

  link.href = url;
  link.download = `graph-data-${datePart}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setMessage(`${rows.length} rows saved as CSV.`);
}

function importCsv(text) {
  const rows = parseCsv(text);

  if (!rows.length) {
    setMessage("The selected CSV file is empty.", true);
    return;
  }

  const headers = rows[0].map(normalizeHeader);
  const knownHeaders = new Set(["graph_mode", "mode", "chart_title", "title", "x_axis_label", "x_axis", "y_axis_label", "y_axis", "x", "date", "y", "text", "note"]);
  const hasHeader = headers.some((header) => knownHeaders.has(header));
  const dataRowsToRead = hasHeader ? rows.slice(1) : rows;
  const headerIndex = (names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const xIndex = hasHeader ? headerIndex(["x", "date"]) : 0;
  const yIndex = hasHeader ? headerIndex(["y"]) : 1;
  const noteIndex = hasHeader ? headerIndex(["text", "note"]) : 2;
  const modeIndex = hasHeader ? headerIndex(["graph_mode", "mode"]) : -1;
  const titleIndex = hasHeader ? headerIndex(["chart_title", "title"]) : -1;
  const xLabelIndex = hasHeader ? headerIndex(["x_axis_label", "x_axis"]) : -1;
  const yLabelIndex = hasHeader ? headerIndex(["y_axis_label", "y_axis"]) : -1;

  if (xIndex === undefined || yIndex === undefined) {
    setMessage("CSV must include X and Y columns.", true);
    return;
  }

  const importedRows = dataRowsToRead
    .map((row) => [
      row[xIndex]?.trim() ?? "",
      row[yIndex]?.trim() ?? "",
      noteIndex >= 0 ? row[noteIndex]?.trim() ?? "" : "",
    ])
    .filter(([x, y, note]) => x || y || note);

  if (!importedRows.length) {
    setMessage("No usable rows were found in the CSV.", true);
    return;
  }

  const firstDataRow = dataRowsToRead.find((row) => row.some((value) => value.trim())) ?? [];
  const importedMode = modeIndex >= 0 ? normalizeHeader(firstDataRow[modeIndex] ?? "") : "";
  const inferredMode = /^\d{4}-\d{2}-\d{2}$/.test(importedRows[0][0]) ? "time" : "normal";
  const mode = importedMode === "time" || importedMode === "normal" ? importedMode : inferredMode;

  updateModeHeader(mode);
  if (titleIndex >= 0 && firstDataRow[titleIndex]) chartTitleInput.value = firstDataRow[titleIndex];
  if (xLabelIndex >= 0 && firstDataRow[xLabelIndex]) xLabelInput.value = firstDataRow[xLabelIndex];
  if (yLabelIndex >= 0 && firstDataRow[yLabelIndex]) yLabelInput.value = firstDataRow[yLabelIndex];

  setRows(importedRows);
  plot();
  setMessage(`${importedRows.length} rows loaded from CSV.`);
}

function setGraphMode(mode) {
  updateModeHeader(mode);

  if (mode === "time") {
    const existingPoints = collectPoints();
    const baseY = existingPoints[0]?.y ?? "";
    chartTitleInput.value = "Time Trend";
    xLabelInput.value = "Date";
    setRows(buildTimeRows(baseY));
  } else {
    chartTitleInput.value = "Sales Trend";
    xLabelInput.value = "Month";
    setRows(sampleData);
  }

  plot();
}

function niceTicks(min, max, count = 5) {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.2);
    min -= pad;
    max += pad;
  }

  const range = niceNumber(max - min, false);
  const spacing = niceNumber(range / (count - 1), true);
  const niceMin = Math.floor(min / spacing) * spacing;
  const niceMax = Math.ceil(max / spacing) * spacing;
  const ticks = [];

  for (let value = niceMin; value <= niceMax + spacing / 2; value += spacing) {
    ticks.push(Number(value.toFixed(10)));
  }

  return { min: niceMin, max: niceMax, ticks };
}

function niceNumber(range, round) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * 10 ** exponent;
}

function makeSvgElement(name, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function addText(parent, text, x, y, className, anchor = "middle") {
  const element = makeSvgElement("text", {
    x,
    y,
    class: className,
    "text-anchor": anchor,
  });
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function formatTick(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function getLineDash(pattern) {
  if (pattern === "dashed") return "10 8";
  if (pattern === "dotted") return "1 8";
  return "";
}

function getSvgPointer(event) {
  const rect = chart.getBoundingClientRect();
  const viewBox = chart.viewBox.baseVal;

  return {
    x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height,
  };
}

function updateCrosshair(event) {
  if (!chartState?.crosshair) return;

  const point = getSvgPointer(event);
  const { margin, width, height, crosshair } = chartState;
  const minX = margin.left;
  const maxX = width - margin.right;
  const minY = margin.top;
  const maxY = height - margin.bottom;

  if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
    hideCrosshair();
    return;
  }

  const x = point.x;
  const y = point.y;

  crosshair.vertical.setAttribute("x1", x);
  crosshair.vertical.setAttribute("x2", x);
  crosshair.vertical.setAttribute("y1", y);
  crosshair.vertical.setAttribute("y2", maxY);
  crosshair.horizontal.setAttribute("x1", minX);
  crosshair.horizontal.setAttribute("x2", x);
  crosshair.horizontal.setAttribute("y1", y);
  crosshair.horizontal.setAttribute("y2", y);
  crosshair.group.setAttribute("visibility", "visible");
}

function hideCrosshair() {
  chartState?.crosshair?.group.setAttribute("visibility", "hidden");
}

function renderChart(points) {
  chart.innerHTML = "";
  chartState = null;

  const width = Math.max(680, chart.clientWidth || 900);
  const height = Math.max(430, chart.clientHeight || 540);
  const margin = { top: 72, right: 34, bottom: 76, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const values = points.map((point) => point.y);
  const yScale = niceTicks(Math.min(...values), Math.max(...values));
  const xStep = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const lineWidth = Number(lineWidthInput.value);
  const pointRadius = Number(pointSizeInput.value);
  const lineDash = getLineDash(linePatternInput.value);

  chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  chart.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const title = makeSvgElement("title", { id: "chartSvgTitle" });
  title.textContent = chartTitleInput.value.trim() || "Line chart";
  chart.appendChild(title);

  const desc = makeSvgElement("desc", { id: "chartSvgDesc" });
  desc.textContent = "Green line segments rise from left to right. Red line segments fall from left to right.";
  chart.appendChild(desc);

  addText(chart, chartTitleInput.value.trim() || "Line chart", width / 2, 34, "chart-title");

  yScale.ticks.forEach((tick) => {
    const y = margin.top + ((yScale.max - tick) / (yScale.max - yScale.min)) * innerHeight;
    chart.appendChild(makeSvgElement("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: y,
      y2: y,
      class: "grid-line",
    }));
    addText(chart, formatTick(tick), margin.left - 12, y + 4, "tick-label", "end");
  });

  chart.appendChild(makeSvgElement("line", {
    x1: margin.left,
    x2: margin.left,
    y1: margin.top,
    y2: height - margin.bottom,
    class: "axis-line",
  }));

  chart.appendChild(makeSvgElement("line", {
    x1: margin.left,
    x2: width - margin.right,
    y1: height - margin.bottom,
    y2: height - margin.bottom,
    class: "axis-line",
  }));

  const plotted = points.map((point, index) => ({
    ...point,
    px: margin.left + index * xStep,
    py: margin.top + ((yScale.max - point.y) / (yScale.max - yScale.min)) * innerHeight,
  }));

  plotted.forEach((point, index) => {
    if (points.length < 13 || index % Math.ceil(points.length / 12) === 0 || index === points.length - 1) {
      addText(chart, point.x, point.px, height - margin.bottom + 26, "tick-label");
    }
  });

  for (let index = 1; index < plotted.length; index += 1) {
    const previous = plotted[index - 1];
    const current = plotted[index];
    const direction = current.y > previous.y ? "up" : current.y < previous.y ? "down" : "flat";

    chart.appendChild(makeSvgElement("line", {
      x1: previous.px,
      y1: previous.py,
      x2: current.px,
      y2: current.py,
      class: "segment",
      stroke: colors[direction],
      "stroke-width": lineWidth,
      "stroke-dasharray": lineDash,
    }));
  }

  if (pointRadius > 0) {
    plotted.forEach((point, index) => {
      const previous = plotted[index - 1];
      const next = plotted[index + 1];
      const neighbor = next || previous || point;
      const direction = point.y > neighbor.y ? "down" : point.y < neighbor.y ? "up" : "flat";

      chart.appendChild(makeSvgElement("circle", {
        cx: point.px,
        cy: point.py,
        r: pointRadius,
        class: "point",
        stroke: colors[direction],
      }));
    });
  }

  plotted.forEach((point) => {
    if (!point.note) return;

    const anchor = point.px > width - margin.right - 90 ? "end" : "start";
    const xOffset = anchor === "end" ? -10 : 10;
    addText(chart, point.note, point.px + xOffset, point.py - 12, "point-note", anchor);
  });

  const xAxisLabel = xLabelInput.value.trim() || "X axis";
  const yAxisLabel = yLabelInput.value.trim() || "Y axis";
  addText(chart, xAxisLabel, margin.left + innerWidth / 2, height - 22, "axis-label");

  const yText = addText(chart, yAxisLabel, 22, margin.top + innerHeight / 2, "axis-label");
  yText.setAttribute("transform", `rotate(-90 22 ${margin.top + innerHeight / 2})`);

  const crosshairGroup = makeSvgElement("g", { class: "crosshair", visibility: "hidden" });
  const horizontalGuide = makeSvgElement("line", { class: "crosshair-line" });
  const verticalGuide = makeSvgElement("line", { class: "crosshair-line" });
  crosshairGroup.append(horizontalGuide, verticalGuide);
  chart.appendChild(crosshairGroup);

  chart.appendChild(makeSvgElement("rect", {
    x: margin.left,
    y: margin.top,
    width: innerWidth,
    height: innerHeight,
    class: "chart-hitbox",
  }));

  chartState = {
    width,
    height,
    margin,
    plotted,
    crosshair: {
      group: crosshairGroup,
      horizontal: horizontalGuide,
      vertical: verticalGuide,
    },
  };
}

function plot() {
  const points = collectPoints();

  if (points.length < 2) {
    setMessage("Enter at least two valid points.", true);
    chart.innerHTML = "";
    return;
  }

  renderChart(points);
  setMessage(`${points.length} points plotted.`);
}

setRows(sampleData);

plotButton.addEventListener("click", plot);
printButton.addEventListener("click", () => {
  if (collectPoints().length >= 2) plot();
  window.print();
});
saveCsvButton.addEventListener("click", exportCsv);
loadCsvButton.addEventListener("click", () => csvFileInput.click());
csvFileInput.addEventListener("change", async () => {
  const file = csvFileInput.files?.[0];
  if (!file) return;

  try {
    importCsv(await file.text());
  } catch {
    setMessage("Could not read the selected CSV file.", true);
  } finally {
    csvFileInput.value = "";
  }
});
addRowButton.addEventListener("click", () => {
  const [x, y, note] = getMode() === "time" ? nextTimeRowValues() : ["", "", ""];
  dataRows.appendChild(createDataRow(x, y, note));
  dataRows.lastElementChild.querySelector(getMode() === "time" ? ".y-value" : ".x-value").focus();
  if (getMode() === "time" && collectPoints().length >= 2) plot();
});
sampleButton.addEventListener("click", () => {
  if (getMode() === "time") {
    setRows(buildTimeRowsUntilToday(addDays(todayInputValue(), -6), 10));
  } else {
    setRows(sampleData);
  }
  plot();
});
clearButton.addEventListener("click", () => {
  dataRows.innerHTML = "";
  addEmptyRows(2);
  chart.innerHTML = "";
  setMessage("");
});

graphModeInput.addEventListener("change", () => setGraphMode(getMode()));

dataRows.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-row");
  if (!button) return;

  button.closest(".data-row").remove();
  if (!dataRows.children.length) addEmptyRows(1);
  plot();
});

dataRows.addEventListener("input", (event) => {
  const activeRow = event.target.closest(".data-row");
  const firstRow = dataRows.querySelector(".data-row");

  if (getMode() === "time" && activeRow === firstRow && event.target.classList.contains("x-value")) {
    syncTimeRowsFromFirstDate();
    return;
  }

  if (getMode() === "time" && activeRow === firstRow && event.target.classList.contains("y-value")) {
    fillBlankTimeYValues(event.target.value);
  }

  if (collectPoints().length >= 2) plot();
});

[chartTitleInput, xLabelInput, yLabelInput, lineWidthInput, linePatternInput, pointSizeInput].forEach((input) => {
  input.addEventListener("input", plot);
});
chart.addEventListener("mousemove", updateCrosshair);
chart.addEventListener("mouseleave", hideCrosshair);
window.addEventListener("resize", () => {
  if (collectPoints().length >= 2) plot();
});

plot();
