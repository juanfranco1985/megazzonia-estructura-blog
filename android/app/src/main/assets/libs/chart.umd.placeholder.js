(function (global) {
  function resizeCanvas(canvas) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(320, canvas.clientWidth || canvas.width || 320);
    const height = Math.max(220, canvas.clientHeight || canvas.height || 220);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return context;
  }

  function drawGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(40, 52, 58, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 48; x < width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, height - 28);
      ctx.stroke();
    }
    for (let y = 24; y < height - 24; y += 24) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 16, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLegend(ctx, labels, colors, startX, startY) {
    ctx.save();
    ctx.font = "12px Segoe UI, Tahoma, sans-serif";
    ctx.fillStyle = "#1d2a30";
    labels.forEach((label, index) => {
      const y = startY + index * 18;
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(startX, y - 10, 10, 10);
      ctx.fillStyle = "#1d2a30";
      ctx.fillText(label, startX + 16, y - 1);
    });
    ctx.restore();
  }

  function drawBarChart(ctx, chart) {
    const { labels, datasets } = chart.data;
    const width = ctx.canvas.clientWidth || 640;
    const height = ctx.canvas.clientHeight || 320;
    const chartArea = {
      left: 48,
      right: width - 24,
      top: 24,
      bottom: height - 52
    };
    const maxValue = Math.max(...datasets.flatMap((dataset) => dataset.data), 1);
    const barGroupWidth = (chartArea.right - chartArea.left) / labels.length;

    drawGrid(ctx, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(35, 47, 54, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, chartArea.top);
    ctx.lineTo(chartArea.left, chartArea.bottom);
    ctx.lineTo(chartArea.right, chartArea.bottom);
    ctx.stroke();
    ctx.restore();

    datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.backgroundColor || ["#5c7f94", "#7d9b84", "#b08a58", "#8a677d"][datasetIndex % 4];
      const barWidth = Math.min(42, barGroupWidth * 0.55);
      labels.forEach((_label, index) => {
        const value = Number(dataset.data[index] || 0);
        const barHeight = ((chartArea.bottom - chartArea.top) * value) / maxValue;
        const x = chartArea.left + index * barGroupWidth + (barGroupWidth - barWidth) / 2;
        const y = chartArea.bottom - barHeight;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.strokeStyle = "rgba(23, 32, 36, 0.3)";
        ctx.strokeRect(x, y, barWidth, barHeight);
      });
    });

    ctx.save();
    ctx.font = "12px Segoe UI, Tahoma, sans-serif";
    ctx.fillStyle = "#1b252a";
    labels.forEach((label, index) => {
      const x = chartArea.left + index * barGroupWidth + barGroupWidth / 2;
      ctx.fillText(String(label), x - ctx.measureText(String(label)).width / 2, chartArea.bottom + 18);
    });
    ctx.restore();
  }

  function drawLineChart(ctx, chart) {
    const { labels, datasets } = chart.data;
    const width = ctx.canvas.clientWidth || 640;
    const height = ctx.canvas.clientHeight || 320;
    const chartArea = {
      left: 48,
      right: width - 24,
      top: 24,
      bottom: height - 52
    };
    const maxValue = Math.max(...datasets.flatMap((dataset) => dataset.data), 1);
    const step = (chartArea.right - chartArea.left) / Math.max(1, labels.length - 1);

    drawGrid(ctx, width, height);

    datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.borderColor || ["#4f6e83", "#6f8f7d", "#b08a58", "#8a677d"][datasetIndex % 4];
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      dataset.data.forEach((value, index) => {
        const numeric = Number(value || 0);
        const x = chartArea.left + index * step;
        const y = chartArea.bottom - ((chartArea.bottom - chartArea.top) * numeric) / maxValue;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.fillStyle = color;
      dataset.data.forEach((value, index) => {
        const numeric = Number(value || 0);
        const x = chartArea.left + index * step;
        const y = chartArea.bottom - ((chartArea.bottom - chartArea.top) * numeric) / maxValue;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    });
  }

  function drawDoughnutChart(ctx, chart) {
    const { labels, datasets } = chart.data;
    const width = ctx.canvas.clientWidth || 640;
    const height = ctx.canvas.clientHeight || 320;
    const centerX = width / 2;
    const centerY = height / 2 - 8;
    const radius = Math.min(width, height) * 0.32;
    const data = datasets[0]?.data || [];
    const total = data.reduce((sum, value) => sum + Number(value || 0), 0) || 1;
    const colors = datasets[0]?.backgroundColor || ["#4f6e83", "#6f8f7d", "#b08a58", "#8a677d", "#7f6b9f"];

    let angle = -Math.PI / 2;
    data.forEach((value, index) => {
      const slice = (Number(value || 0) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.fillStyle = colors[index % colors.length];
      ctx.arc(centerX, centerY, radius, angle, angle + slice);
      ctx.closePath();
      ctx.fill();
      angle += slice;
    });

    ctx.fillStyle = "#dfe6e2";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.58, 0, Math.PI * 2);
    ctx.fill();

    drawLegend(ctx, labels, colors, 18, height - 90);
  }

  function drawPieChart(ctx, chart) {
    drawDoughnutChart(ctx, chart);
  }

  class Chart {
    constructor(ctxOrCanvas, config) {
      this.canvas = ctxOrCanvas instanceof HTMLCanvasElement ? ctxOrCanvas : ctxOrCanvas.canvas;
      this.config = config;
      this.ctx = this.canvas.getContext("2d");
      this.draw();
      this._resizeHandler = () => this.draw();
      window.addEventListener("resize", this._resizeHandler);
    }

    draw() {
      const ctx = resizeCanvas(this.canvas);
      const width = ctx.canvas.clientWidth || 640;
      const height = ctx.canvas.clientHeight || 320;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#dfe5e3";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(70, 87, 93, 0.08)";
      ctx.fillRect(0, 0, width, height);

      const type = String(this.config?.type || "bar").toLowerCase();
      if (type === "bar") {
        drawBarChart(ctx, this.config);
      } else if (type === "line") {
        drawLineChart(ctx, this.config);
      } else if (type === "doughnut") {
        drawDoughnutChart(ctx, this.config);
      } else if (type === "pie") {
        drawPieChart(ctx, this.config);
      } else {
        drawBarChart(ctx, this.config);
      }
    }

    destroy() {
      window.removeEventListener("resize", this._resizeHandler);
      const width = this.canvas.width;
      const height = this.canvas.height;
      this.ctx.clearRect(0, 0, width, height);
    }
  }

  global.Chart = Chart;
})(typeof window !== "undefined" ? window : globalThis);
