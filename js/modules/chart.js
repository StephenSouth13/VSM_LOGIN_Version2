// Chart management module for statistics

class ChartManager {
  constructor(api, toast, feather) {
    this.charts = {}
    this.chartColors = {
      primary: "#27ae60",
      secondary: "#3498db",
      warning: "#f39c12",
      danger: "#e74c3c",
      success: "#2ecc71",
      info: "#9b59b6",
    }
    this.api = api
    this.toast = toast
    this.feather = feather
  }

  async init() {
    await this.loadData()
    this.initializeCharts()
    this.setupEventListeners()
  }

  async loadData() {
    try {
      const [statsResult, postsResult] = await Promise.all([
        this.api.getStatistics(),
        this.api.getPosts({ limit: 100 }),
      ])

      this.statsData = statsResult.success ? statsResult.data : null
      this.postsData = postsResult.success ? postsResult.data : []

      this.updateOverviewStats()
    } catch (error) {
      console.error("Error loading chart data:", error)
      this.toast.error("Không thể tải dữ liệu thống kê")
    }
  }

  updateOverviewStats() {
    if (!this.statsData) return

    const elements = {
      totalPosts: document.getElementById("totalPosts"),
      publishedPosts: document.getElementById("publishedPosts"),
      draftPosts: document.getElementById("draftPosts"),
      activeAuthors: document.getElementById("activeAuthors"),
    }

    Object.entries(elements).forEach(([key, element]) => {
      if (element && this.statsData[key] !== undefined) {
        this.animateNumber(element, this.statsData[key])
      }
    })
  }

  animateNumber(element, targetValue) {
    const startValue = 0
    const duration = 1000
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const currentValue = Math.floor(startValue + (targetValue - startValue) * progress)
      element.textContent = currentValue

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  initializeCharts() {
    this.createPostsChart()
    this.createCategoryChart()
    this.createAuthorsChart()
  }

  createPostsChart() {
    const ctx = document.getElementById("postsChart")
    if (!ctx || !this.statsData) return

    // Destroy existing chart
    if (this.charts.posts) {
      this.charts.posts.destroy()
    }

    const monthlyData = this.statsData.monthlyStats || []

    this.charts.posts = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: monthlyData.map((item) => item.month),
        datasets: [
          {
            label: "Đã xuất bản",
            data: monthlyData.map((item) => item.published || Math.floor(item.posts * 0.7)),
            borderColor: this.chartColors.primary,
            backgroundColor: this.chartColors.primary + "20",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Bản nháp",
            data: monthlyData.map((item) => item.drafts || Math.floor(item.posts * 0.3)),
            borderColor: this.chartColors.warning,
            backgroundColor: this.chartColors.warning + "20",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: this.getGridColor(),
            },
          },
          x: {
            grid: {
              color: this.getGridColor(),
            },
          },
        },
      },
    })
  }

  createCategoryChart() {
    const ctx = document.getElementById("categoryChart")
    if (!ctx || !this.postsData) return

    // Destroy existing chart
    if (this.charts.category) {
      this.charts.category.destroy()
    }

    // Count posts by category
    const categoryCount = {}
    this.postsData.forEach((post) => {
      const category = post.category || "Khác"
      categoryCount[category] = (categoryCount[category] || 0) + 1
    })

    const categoryLabels = {
      news: "Tin tức",
      events: "Sự kiện",
      training: "Huấn luyện",
      community: "Cộng đồng",
    }

    const labels = Object.keys(categoryCount).map((key) => categoryLabels[key] || key)
    const data = Object.values(categoryCount)
    const colors = [
      this.chartColors.primary,
      this.chartColors.secondary,
      this.chartColors.warning,
      this.chartColors.danger,
      this.chartColors.success,
    ]

    this.charts.category = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors.slice(0, data.length),
            borderWidth: 2,
            borderColor: this.getBorderColor(),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
        },
      },
    })
  }

  createAuthorsChart() {
    const ctx = document.getElementById("authorsChart")
    if (!ctx || !this.postsData) return

    // Destroy existing chart
    if (this.charts.authors) {
      this.charts.authors.destroy()
    }

    // Count posts by author
    const authorStats = {}
    this.postsData.forEach((post) => {
      const author = post.authorName || "Unknown"
      if (!authorStats[author]) {
        authorStats[author] = { total: 0, published: 0, drafts: 0 }
      }
      authorStats[author].total++
      if (post.isPublished) {
        authorStats[author].published++
      } else {
        authorStats[author].drafts++
      }
    })

    const authors = Object.keys(authorStats)
    const publishedData = authors.map((author) => authorStats[author].published)
    const draftData = authors.map((author) => authorStats[author].drafts)

    this.charts.authors = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: authors,
        datasets: [
          {
            label: "Đã xuất bản",
            data: publishedData,
            backgroundColor: this.chartColors.primary,
            borderRadius: 4,
          },
          {
            label: "Bản nháp",
            data: draftData,
            backgroundColor: this.chartColors.warning,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            stacked: true,
            grid: {
              color: this.getGridColor(),
            },
          },
          x: {
            stacked: true,
            grid: {
              color: this.getGridColor(),
            },
          },
        },
      },
    })

    // Populate author filter
    this.populateAuthorFilter(authors)
    this.populateAuthorsTable(authorStats)
  }

  populateAuthorFilter(authors) {
    const authorFilter = document.getElementById("authorFilter")
    if (!authorFilter) return

    authorFilter.innerHTML = '<option value="">Tất cả tác giả</option>'
    authors.forEach((author) => {
      const option = document.createElement("option")
      option.value = author
      option.textContent = author
      authorFilter.appendChild(option)
    })
  }

  populateAuthorsTable(authorStats) {
    const tableBody = document.getElementById("authorsStatsTable")
    if (!tableBody) return

    const rows = Object.entries(authorStats)
      .map(([author, stats]) => {
        const publishRate = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0

        return `
        <tr>
          <td>${author}</td>
          <td>${stats.total}</td>
          <td>${stats.published}</td>
          <td>${stats.drafts}</td>
          <td>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${publishRate}%"></div>
              <span class="progress-text">${publishRate}%</span>
            </div>
          </td>
        </tr>
      `
      })
      .join("")

    tableBody.innerHTML = rows
  }

  setupEventListeners() {
    // Time range filter
    const timeRange = document.getElementById("timeRange")
    if (timeRange) {
      timeRange.addEventListener("change", () => this.handleTimeRangeChange())
    }

    // Author filter
    const authorFilter = document.getElementById("authorFilter")
    if (authorFilter) {
      authorFilter.addEventListener("change", () => this.handleAuthorFilterChange())
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshStats")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshData())
    }

    // View all posts button
    const viewAllBtn = document.getElementById("viewAllPosts")
    if (viewAllBtn) {
      viewAllBtn.addEventListener("click", () => {
        window.location.href = "index.html"
      })
    }
  }

  async handleTimeRangeChange() {
    // In a real implementation, this would filter data by time range
    this.toast.info("Đang cập nhật dữ liệu theo khoảng thời gian...")
    await this.refreshData()
  }

  handleAuthorFilterChange() {
    const authorFilter = document.getElementById("authorFilter")
    const selectedAuthor = authorFilter?.value

    if (selectedAuthor) {
      // Filter posts data by author
      const filteredPosts = this.postsData.filter((post) => post.authorName === selectedAuthor)
      // Update charts with filtered data
      this.toast.info(`Hiển thị dữ liệu của ${selectedAuthor}`)
    } else {
      // Show all data
      this.createAuthorsChart()
    }
  }

  async refreshData() {
    const refreshBtn = document.getElementById("refreshStats")
    if (refreshBtn) {
      refreshBtn.disabled = true
      refreshBtn.innerHTML = '<i data-feather="loader"></i> Đang tải...'
    }

    try {
      await this.loadData()
      this.initializeCharts()
      this.toast.success("Đã cập nhật dữ liệu thống kê")
    } catch (error) {
      this.toast.error("Không thể cập nhật dữ liệu")
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false
        refreshBtn.innerHTML = '<i data-feather="refresh-cw"></i> Làm mới'
      }

      // Re-initialize feather icons
      if (typeof this.feather !== "undefined") {
        this.feather.replace()
      }
    }
  }

  getGridColor() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)"
  }

  getBorderColor() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(0, 0, 0, 0.1)"
  }

  destroy() {
    Object.values(this.charts).forEach((chart) => {
      if (chart) chart.destroy()
    })
    this.charts = {}
  }
}

// Make ChartManager globally available
window.ChartManager = ChartManager
