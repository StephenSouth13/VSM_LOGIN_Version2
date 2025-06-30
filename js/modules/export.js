// Export management module for VSM CMS

// Declare variables before using them
const api = window.api // Assuming api is available globally
const toast = window.toast // Assuming toast is available globally
const debounce = window.debounce // Assuming debounce is available globally
const auth = window.auth // Assuming auth is available globally
const StringUtils = window.StringUtils // Assuming StringUtils is available globally
const DateUtils = window.DateUtils // Assuming DateUtils is available globally
const feather = window.feather // Assuming feather is available globally

class ExportManager {
  constructor() {
    this.selectedPosts = new Set()
    this.allPosts = []
    this.filteredPosts = []
    this.currentFilters = {}
    this.exportHistory = JSON.parse(localStorage.getItem("vsm_export_history") || "[]")
    this.scheduledExports = JSON.parse(localStorage.getItem("vsm_scheduled_exports") || "[]")
    this.currentExportId = null
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.renderExportHistory()
    this.renderScheduledExports()
  }

  async loadPosts() {
    const loading = document.getElementById("loading")
    const tableContainer = document.getElementById("tableContainer")

    try {
      if (loading) loading.style.display = "flex"
      if (tableContainer) tableContainer.style.display = "none"

      const result = await api.getPosts({ limit: 1000 }) // Get all posts

      if (result.success) {
        this.allPosts = result.data
        this.filteredPosts = [...this.allPosts]
        this.updateCounts()
      }
    } catch (error) {
      console.error("Error loading posts:", error)
      toast.error("Không thể tải danh sách bài viết")
    } finally {
      if (loading) loading.style.display = "none"
      if (tableContainer) tableContainer.style.display = "block"
    }
  }

  setupEventListeners() {
    // Export controls
    document.getElementById("exportBtn")?.addEventListener("click", () => this.exportData())
    document.getElementById("selectAllBtn")?.addEventListener("click", () => this.toggleSelectAll())

    // Filter controls
    document.getElementById("applyFilters")?.addEventListener("click", () => this.applyFilters())
    document.getElementById("resetFilters")?.addEventListener("click", () => this.resetFilters())

    // Search
    const searchInput = document.getElementById("searchInput")
    if (searchInput) {
      const debouncedSearch = debounce(() => this.handleSearch(), 300)
      searchInput.addEventListener("input", debouncedSearch)
    }

    // Select all checkbox
    document.getElementById("selectAllCheckbox")?.addEventListener("change", (e) => {
      this.handleSelectAllChange(e.target.checked)
    })

    // Date inputs
    const today = new Date().toISOString().split("T")[0]
    const startDate = document.getElementById("startDate")
    const endDate = document.getElementById("endDate")

    if (endDate) endDate.value = today
    if (startDate) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      startDate.value = thirtyDaysAgo.toISOString().split("T")[0]
    }

    // Date range selector
    const dateRange = document.getElementById("dateRange")
    if (dateRange) {
      dateRange.addEventListener("change", (e) => {
        const customDateRange = document.getElementById("customDateRange")
        if (customDateRange) {
          customDateRange.style.display = e.target.value === "custom" ? "block" : "none"
        }
      })
    }

    // Schedule email checkbox
    const scheduleEmail = document.getElementById("scheduleEmail")
    if (scheduleEmail) {
      scheduleEmail.addEventListener("change", (e) => {
        const emailGroup = document.getElementById("emailGroup")
        if (emailGroup) {
          emailGroup.style.display = e.target.checked ? "block" : "none"
        }
      })
    }

    // Cancel export
    const cancelExport = document.getElementById("cancelExport")
    if (cancelExport) {
      cancelExport.addEventListener("click", () => {
        this.cancelCurrentExport()
      })
    }
  }

  renderTable() {
    const tableBody = document.getElementById("postsTableBody")
    const emptyState = document.getElementById("emptyState")
    const tableContainer = document.getElementById("tableContainer")

    if (!tableBody) return

    if (this.filteredPosts.length === 0) {
      if (tableContainer) tableContainer.style.display = "none"
      if (emptyState) emptyState.style.display = "flex"
      return
    }

    if (tableContainer) tableContainer.style.display = "block"
    if (emptyState) emptyState.style.display = "none"

    const rows = this.filteredPosts
      .map((post) => {
        const isSelected = this.selectedPosts.has(post.id)
        const canEdit = auth.canEditPost(post)

        return `
        <tr>
          <td>
            <label class="checkbox">
              <input type="checkbox" 
                     value="${post.id}" 
                     ${isSelected ? "checked" : ""}
                     onchange="exportManager.handlePostSelection(${post.id}, this.checked)">
              <span class="checkmark"></span>
            </label>
          </td>
          <td>
            <div class="post-title-cell">
              <strong>${StringUtils.truncate(post.title, 50)}</strong>
              ${post.shortDescription ? `<br><small class="text-muted">${StringUtils.truncate(post.shortDescription, 80)}</small>` : ""}
            </div>
          </td>
          <td>${post.authorName}</td>
          <td>
            <span class="category-badge category-${post.category}">
              ${this.getCategoryLabel(post.category)}
            </span>
          </td>
          <td>
            <span class="post-status ${post.isPublished ? "status-published" : "status-draft"}">
              ${post.isPublished ? "Đã xuất bản" : "Bản nháp"}
            </span>
          </td>
          <td>${DateUtils.formatDate(post.publishedAt || post.createdAt, "dd/mm/yyyy")}</td>
          <td>
            <div class="table-actions">
              <a href="detail.html?id=${post.id}" class="btn btn-sm btn-secondary" title="Xem chi tiết">
                <i data-feather="eye"></i>
              </a>
              ${
                canEdit
                  ? `
                <a href="edit.html?id=${post.id}" class="btn btn-sm btn-primary" title="Chỉnh sửa">
                  <i data-feather="edit"></i>
                </a>
              `
                  : ""
              }
            </div>
          </td>
        </tr>
      `
      })
      .join("")

    tableBody.innerHTML = rows
    this.updateSelectAllCheckbox()

    // Re-initialize feather icons
    if (typeof feather !== "undefined") {
      feather.replace()
    }
  }

  handlePostSelection(postId, isSelected) {
    if (isSelected) {
      this.selectedPosts.add(postId)
    } else {
      this.selectedPosts.delete(postId)
    }

    this.updateCounts()
    this.updateSelectAllCheckbox()
    this.updateExportButton()
  }

  handleSelectAllChange(isChecked) {
    if (isChecked) {
      this.filteredPosts.forEach((post) => this.selectedPosts.add(post.id))
    } else {
      this.selectedPosts.clear()
    }

    this.renderTable()
    this.updateCounts()
    this.updateExportButton()
  }

  toggleSelectAll() {
    const allSelected = this.filteredPosts.every((post) => this.selectedPosts.has(post.id))
    this.handleSelectAllChange(!allSelected)
  }

  updateSelectAllCheckbox() {
    const checkbox = document.getElementById("selectAllCheckbox")
    if (!checkbox) return

    const selectedInFiltered = this.filteredPosts.filter((post) => this.selectedPosts.has(post.id)).length
    const totalFiltered = this.filteredPosts.length

    if (selectedInFiltered === 0) {
      checkbox.checked = false
      checkbox.indeterminate = false
    } else if (selectedInFiltered === totalFiltered) {
      checkbox.checked = true
      checkbox.indeterminate = false
    } else {
      checkbox.checked = false
      checkbox.indeterminate = true
    }
  }

  updateCounts() {
    const selectedCount = document.getElementById("selectedCount")
    const totalCount = document.getElementById("totalCount")

    if (selectedCount) selectedCount.textContent = this.selectedPosts.size
    if (totalCount) totalCount.textContent = this.filteredPosts.length
  }

  updateExportButton() {
    const exportBtn = document.getElementById("exportBtn")
    if (exportBtn) {
      exportBtn.disabled = this.selectedPosts.size === 0
    }
  }

  applyFilters() {
    const filters = {
      status: document.getElementById("statusFilter")?.value || "",
      category: document.getElementById("categoryFilter")?.value || "",
      startDate: document.getElementById("startDate")?.value || "",
      endDate: document.getElementById("endDate")?.value || "",
      search: document.getElementById("searchInput")?.value.trim() || "",
    }

    this.currentFilters = filters
    this.filteredPosts = this.allPosts.filter((post) => {
      // Status filter
      if (filters.status) {
        const isPublished = filters.status === "published"
        if (post.isPublished !== isPublished) return false
      }

      // Category filter
      if (filters.category && post.category !== filters.category) {
        return false
      }

      // Date range filter
      const postDate = new Date(post.publishedAt || post.createdAt)
      if (filters.startDate) {
        const startDate = new Date(filters.startDate)
        if (postDate < startDate) return false
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999) // End of day
        if (postDate > endDate) return false
      }

      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const searchableText = [post.title, post.shortDescription, post.authorName, post.content]
          .join(" ")
          .toLowerCase()

        if (!searchableText.includes(searchTerm)) return false
      }

      return true
    })

    // Clear selections that are no longer visible
    const visiblePostIds = new Set(this.filteredPosts.map((post) => post.id))
    this.selectedPosts = new Set([...this.selectedPosts].filter((id) => visiblePostIds.has(id)))

    this.renderTable()
    this.updateCounts()
    this.updateExportButton()

    toast.success(`Đã lọc ${this.filteredPosts.length} bài viết`)
  }

  resetFilters() {
    // Reset form values
    document.getElementById("statusFilter").value = ""
    document.getElementById("categoryFilter").value = ""
    document.getElementById("startDate").value = ""
    document.getElementById("endDate").value = ""
    document.getElementById("searchInput").value = ""

    // Reset data
    this.currentFilters = {}
    this.filteredPosts = [...this.allPosts]
    this.selectedPosts.clear()

    this.renderTable()
    this.updateCounts()
    this.updateExportButton()

    toast.info("Đã đặt lại bộ lọc")
  }

  handleSearch() {
    this.applyFilters()
  }

  exportData(type, format) {
    const exportData = this.generateExportData(type, format)
    this.startExport(exportData)
  }

  generateExportData(type, format) {
    const timestamp = new Date().toISOString()
    const exportId = `export_${Date.now()}`

    let data = {}
    let filename = ""
    let estimatedSize = 0

    switch (type) {
      case "posts":
        data = this.getPostsData()
        filename = `posts_${timestamp.split("T")[0]}.${format}`
        estimatedSize = this.estimateSize(data, format)
        break

      case "members":
        data = this.getMembersData()
        filename = `members_${timestamp.split("T")[0]}.${format}`
        estimatedSize = this.estimateSize(data, format)
        break

      case "events":
        data = this.getEventsData()
        filename = `events_${timestamp.split("T")[0]}.${format}`
        estimatedSize = this.estimateSize(data, format)
        break

      case "analytics":
        data = this.getAnalyticsData()
        filename = `analytics_${timestamp.split("T")[0]}.${format}`
        estimatedSize = this.estimateSize(data, format)
        break

      case "media":
        data = this.getMediaData()
        filename = `media_${timestamp.split("T")[0]}.${format}`
        estimatedSize = this.estimateSize(data, format)
        break

      case "full":
        data = this.getFullBackupData()
        filename = `vsm_backup_${timestamp.split("T")[0]}.${format}`
        estimatedSize = this.estimateSize(data, format)
        break
    }

    return {
      id: exportId,
      type,
      format,
      data,
      filename,
      estimatedSize,
      timestamp,
    }
  }

  getPostsData() {
    // Simulate posts data
    return {
      posts: [
        {
          id: 1,
          title: "Giải chạy VSM 2024",
          content: "Nội dung bài viết về giải chạy...",
          author: "Admin",
          created_at: "2024-01-15T10:00:00Z",
          status: "published",
          category: "events",
          tags: ["marathon", "running", "2024"],
        },
        {
          id: 2,
          title: "Hướng dẫn tập luyện",
          content: "Các bài tập cơ bản cho runner...",
          author: "Coach",
          created_at: "2024-01-10T14:30:00Z",
          status: "published",
          category: "training",
          tags: ["training", "tips"],
        },
      ],
      total: 2,
      exported_at: new Date().toISOString(),
    }
  }

  getMembersData() {
    // Simulate members data
    return {
      members: [
        {
          id: 1,
          name: "Nguyễn Văn A",
          email: "nguyenvana@example.com",
          role: "member",
          joined_at: "2024-01-01T00:00:00Z",
          status: "active",
        },
        {
          id: 2,
          name: "Trần Thị B",
          email: "tranthib@example.com",
          role: "admin",
          joined_at: "2023-12-15T00:00:00Z",
          status: "active",
        },
      ],
      total: 2,
      exported_at: new Date().toISOString(),
    }
  }

  getEventsData() {
    // Get events from localStorage
    const events = JSON.parse(localStorage.getItem("vsm_calendar_events") || "[]")
    return {
      events: events,
      total: events.length,
      exported_at: new Date().toISOString(),
    }
  }

  getAnalyticsData() {
    // Simulate analytics data
    return {
      analytics: {
        page_views: {
          total: 15420,
          this_month: 3240,
          last_month: 2890,
        },
        user_engagement: {
          bounce_rate: 0.35,
          avg_session_duration: 245,
          pages_per_session: 2.8,
        },
        popular_content: [
          { title: "Giải chạy VSM 2024", views: 1250 },
          { title: "Hướng dẫn tập luyện", views: 980 },
        ],
      },
      exported_at: new Date().toISOString(),
    }
  }

  getMediaData() {
    // Simulate media data
    return {
      media: [
        {
          id: 1,
          filename: "vsm-hero.jpg",
          size: 245760,
          type: "image/jpeg",
          uploaded_at: "2024-01-15T10:00:00Z",
        },
      ],
      total: 1,
      total_size: 245760,
      exported_at: new Date().toISOString(),
    }
  }

  getFullBackupData() {
    return {
      posts: this.getPostsData().posts,
      members: this.getMembersData().members,
      events: this.getEventsData().events,
      analytics: this.getAnalyticsData().analytics,
      media: this.getMediaData().media,
      settings: {
        site_name: "VSM CMS",
        version: "1.0.0",
      },
      backup_info: {
        created_at: new Date().toISOString(),
        version: "1.0.0",
        type: "full_backup",
      },
    }
  }

  estimateSize(data, format) {
    const jsonSize = JSON.stringify(data).length

    switch (format) {
      case "json":
        return jsonSize
      case "csv":
        return Math.floor(jsonSize * 0.7) // CSV is typically smaller
      case "excel":
        return Math.floor(jsonSize * 1.2) // Excel has overhead
      case "xml":
        return Math.floor(jsonSize * 1.5) // XML is verbose
      case "pdf":
        return Math.floor(jsonSize * 2) // PDF has formatting overhead
      case "zip":
        return Math.floor(jsonSize * 0.3) // Compression
      default:
        return jsonSize
    }
  }

  startExport(exportData) {
    this.currentExportId = exportData.id
    this.showExportProgress(exportData)
    this.simulateExport(exportData)
  }

  showExportProgress(exportData) {
    const modal = document.getElementById("exportProgressModal")
    if (!modal) return

    // Update export details
    document.getElementById("exportType").textContent = this.getTypeDisplayName(exportData.type)
    document.getElementById("exportFormat").textContent = exportData.format.toUpperCase()
    document.getElementById("estimatedSize").textContent = this.formatFileSize(exportData.estimatedSize)

    modal.classList.add("show")
  }

  simulateExport(exportData) {
    const progressText = document.getElementById("progressText")
    const progressFill = document.getElementById("progressFill")
    const progressPercentage = document.getElementById("progressPercentage")

    let progress = 0
    const steps = [
      { progress: 10, text: "Đang chuẩn bị dữ liệu..." },
      { progress: 30, text: "Đang xử lý dữ liệu..." },
      { progress: 60, text: "Đang định dạng..." },
      { progress: 80, text: "Đang nén file..." },
      { progress: 100, text: "Hoàn thành!" },
    ]

    let stepIndex = 0
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        const step = steps[stepIndex]
        progress = step.progress

        if (progressText) progressText.textContent = step.text
        if (progressFill) progressFill.style.width = progress + "%"
        if (progressPercentage) progressPercentage.textContent = progress + "%"

        stepIndex++
      } else {
        clearInterval(interval)
        this.completeExport(exportData)
      }
    }, 1000)
  }

  completeExport(exportData) {
    // Add to export history
    const historyItem = {
      id: exportData.id,
      type: exportData.type,
      format: exportData.format,
      filename: exportData.filename,
      size: exportData.estimatedSize,
      status: "completed",
      created_at: exportData.timestamp,
      download_url: "#", // In real app, this would be the actual download URL
    }

    this.exportHistory.unshift(historyItem)
    this.saveExportHistory()
    this.renderExportHistory()

    // Download the file
    this.downloadFile(exportData)

    // Hide progress modal
    setTimeout(() => {
      const modal = document.getElementById("exportProgressModal")
      if (modal) {
        modal.classList.remove("show")
      }
      this.showNotification("Xuất dữ liệu thành công!")
    }, 1000)
  }

  downloadFile(exportData) {
    let content = ""
    let mimeType = "application/json"

    switch (exportData.format) {
      case "json":
        content = JSON.stringify(exportData.data, null, 2)
        mimeType = "application/json"
        break

      case "csv":
        content = this.convertToCSV(exportData.data)
        mimeType = "text/csv"
        break

      case "xml":
        content = this.convertToXML(exportData.data)
        mimeType = "application/xml"
        break

      default:
        content = JSON.stringify(exportData.data, null, 2)
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = exportData.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  convertToCSV(data) {
    // Simple CSV conversion - in real app, this would be more sophisticated
    if (data.posts) {
      const posts = data.posts
      const headers = ["ID", "Title", "Author", "Created At", "Status", "Category"]
      const rows = posts.map((post) => [
        post.id,
        `"${post.title}"`,
        post.author,
        post.created_at,
        post.status,
        post.category,
      ])

      return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    }

    return JSON.stringify(data, null, 2)
  }

  convertToXML(data) {
    // Simple XML conversion
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n'

    if (data.posts) {
      xml += "  <posts>\n"
      data.posts.forEach((post) => {
        xml += "    <post>\n"
        xml += `      <id>${post.id}</id>\n`
        xml += `      <title><![CDATA[${post.title}]]></title>\n`
        xml += `      <author>${post.author}</author>\n`
        xml += `      <created_at>${post.created_at}</created_at>\n`
        xml += `      <status>${post.status}</status>\n`
        xml += `      <category>${post.category}</category>\n`
        xml += "    </post>\n"
      })
      xml += "  </posts>\n"
    }

    xml += "</export>"
    return xml
  }

  customExport() {
    const selectedTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value)

    if (selectedTypes.length === 0) {
      alert("Vui lòng chọn ít nhất một loại dữ liệu")
      return
    }

    const dateRange = document.getElementById("dateRange").value
    const format = document.getElementById("exportFormat").value
    const compression = document.getElementById("compression").value
    const includeMedia = document.getElementById("includeMedia").checked
    const includeMetadata = document.getElementById("includeMetadata").checked
    const anonymizeData = document.getElementById("anonymizeData").checked

    // Create custom export data
    const customData = {}
    selectedTypes.forEach((type) => {
      switch (type) {
        case "posts":
          customData.posts = this.getPostsData().posts
          break
        case "members":
          customData.members = this.getMembersData().members
          break
        case "events":
          customData.events = this.getEventsData().events
          break
        case "analytics":
          customData.analytics = this.getAnalyticsData().analytics
          break
        case "media":
          if (includeMedia) {
            customData.media = this.getMediaData().media
          }
          break
        case "settings":
          customData.settings = { site_name: "VSM CMS", version: "1.0.0" }
          break
      }
    })

    if (includeMetadata) {
      customData.export_metadata = {
        exported_at: new Date().toISOString(),
        date_range: dateRange,
        types: selectedTypes,
        options: {
          include_media: includeMedia,
          anonymized: anonymizeData,
          compression: compression,
        },
      }
    }

    if (anonymizeData) {
      this.anonymizeData(customData)
    }

    const exportData = {
      id: `custom_export_${Date.now()}`,
      type: "custom",
      format: format,
      data: customData,
      filename: `vsm_custom_export_${new Date().toISOString().split("T")[0]}.${format}`,
      estimatedSize: this.estimateSize(customData, format),
      timestamp: new Date().toISOString(),
    }

    this.startExport(exportData)
  }

  anonymizeData(data) {
    // Simple anonymization - in real app, this would be more sophisticated
    if (data.members) {
      data.members.forEach((member) => {
        member.name = `User ${member.id}`
        member.email = `user${member.id}@example.com`
      })
    }
  }

  previewExport() {
    const selectedTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value)

    if (selectedTypes.length === 0) {
      alert("Vui lòng chọn ít nhất một loại dữ liệu")
      return
    }

    // Generate preview data
    const previewData = {}
    let recordCount = 0

    selectedTypes.forEach((type) => {
      switch (type) {
        case "posts":
          const posts = this.getPostsData().posts.slice(0, 3) // Show first 3
          previewData.posts = posts
          recordCount += posts.length
          break
        case "members":
          const members = this.getMembersData().members.slice(0, 3)
          previewData.members = members
          recordCount += members.length
          break
        // Add other types...
      }
    })

    this.showPreviewModal(previewData, recordCount)
  }

  showPreviewModal(data, recordCount) {
    const modal = document.getElementById("previewModal")
    if (!modal) return

    document.getElementById("previewRecordCount").textContent = recordCount
    document.getElementById("previewSize").textContent = this.formatFileSize(this.estimateSize(data, "json"))
    document.getElementById("previewFormat").textContent = document.getElementById("exportFormat").value.toUpperCase()
    document.getElementById("previewData").textContent = JSON.stringify(data, null, 2)

    modal.classList.add("show")
  }

  hidePreviewModal() {
    const modal = document.getElementById("previewModal")
    if (modal) {
      modal.classList.remove("show")
    }
  }

  proceedWithExport() {
    this.hidePreviewModal()
    this.customExport()
  }

  cancelCurrentExport() {
    if (this.currentExportId) {
      const modal = document.getElementById("exportProgressModal")
      if (modal) {
        modal.classList.remove("show")
      }
      this.showNotification("Đã hủy xuất dữ liệu")
      this.currentExportId = null
    }
  }

  renderExportHistory() {
    const table = document.getElementById("exportHistoryTable")
    if (!table) return

    if (this.exportHistory.length === 0) {
      table.innerHTML = `
        <div class="empty-state">
          <i data-feather="download"></i>
          <h3>Chưa có lịch sử xuất</h3>
          <p>Các lần xuất dữ liệu sẽ được hiển thị tại đây</p>
        </div>
      `
      return
    }

    const html = this.exportHistory
      .map(
        (item) => `
      <div class="table-row">
        <div class="col">${new Date(item.created_at).toLocaleString("vi-VN")}</div>
        <div class="col">${this.getTypeDisplayName(item.type)}</div>
        <div class="col">${item.format.toUpperCase()}</div>
        <div class="col">${this.formatFileSize(item.size)}</div>
        <div class="col">
          <span class="status-badge status-${item.status}">${this.getStatusDisplayName(item.status)}</span>
        </div>
        <div class="col">
          <button class="btn btn-sm btn-secondary" onclick="exportManager.downloadHistoryItem('${item.id}')">
            <i data-feather="download"></i>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="exportManager.deleteHistoryItem('${item.id}')">
            <i data-feather="trash-2"></i>
          </button>
        </div>
      </div>
    `,
      )
      .join("")

    table.innerHTML = html

    // Re-initialize feather icons
    if (typeof window.feather !== "undefined") {
      window.feather.replace()
    }
  }

  renderScheduledExports() {
    const grid = document.getElementById("scheduledExportsGrid")
    if (!grid) return

    if (this.scheduledExports.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i data-feather="clock"></i>
          <h3>Chưa có lịch xuất tự động</h3>
          <p>Tạo lịch trình để xuất dữ liệu định kỳ</p>
        </div>
      `
      return
    }

    const html = this.scheduledExports
      .map(
        (schedule) => `
      <div class="schedule-card">
        <div class="schedule-header">
          <h4>${schedule.name}</h4>
          <div class="schedule-status ${schedule.active ? "active" : "inactive"}">
            ${schedule.active ? "Hoạt động" : "Tạm dừng"}
          </div>
        </div>
        <div class="schedule-details">
          <div class="detail-item">
            <span>Loại:</span>
            <span>${this.getTypeDisplayName(schedule.type)}</span>
          </div>
          <div class="detail-item">
            <span>Định dạng:</span>
            <span>${schedule.format.toUpperCase()}</span>
          </div>
          <div class="detail-item">
            <span>Tần suất:</span>
            <span>${this.getFrequencyDisplayName(schedule.frequency)}</span>
          </div>
          <div class="detail-item">
            <span>Lần chạy tiếp:</span>
            <span>${new Date(schedule.next_run).toLocaleString("vi-VN")}</span>
          </div>
        </div>
        <div class="schedule-actions">
          <button class="btn btn-sm btn-secondary" onclick="exportManager.toggleSchedule('${schedule.id}')">
            ${schedule.active ? "Tạm dừng" : "Kích hoạt"}
          </button>
          <button class="btn btn-sm btn-ghost" onclick="exportManager.editSchedule('${schedule.id}')">
            <i data-feather="edit"></i>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="exportManager.deleteSchedule('${schedule.id}')">
            <i data-feather="trash-2"></i>
          </button>
        </div>
      </div>
    `,
      )
      .join("")

    grid.innerHTML = html

    // Re-initialize feather icons
    if (typeof window.feather !== "undefined") {
      window.feather.replace()
    }
  }

  showScheduleModal() {
    const modal = document.getElementById("scheduleModal")
    if (modal) {
      modal.classList.add("show")
    }
  }

  hideScheduleModal() {
    const modal = document.getElementById("scheduleModal")
    if (modal) {
      modal.classList.remove("show")
    }
  }

  saveSchedule() {
    const name = document.getElementById("scheduleName").value
    const type = document.getElementById("scheduleType").value
    const format = document.getElementById("scheduleFormat").value
    const frequency = document.getElementById("scheduleFrequency").value
    const time = document.getElementById("scheduleTime").value
    const email = document.getElementById("scheduleEmail").checked
    const emailAddress = document.getElementById("scheduleEmailAddress").value

    if (!name || !type || !format || !frequency || !time) {
      alert("Vui lòng điền đầy đủ thông tin")
      return
    }

    const schedule = {
      id: `schedule_${Date.now()}`,
      name,
      type,
      format,
      frequency,
      time,
      email,
      emailAddress: email ? emailAddress : "",
      active: true,
      created_at: new Date().toISOString(),
      next_run: this.calculateNextRun(frequency, time),
    }

    this.scheduledExports.push(schedule)
    this.saveScheduledExports()
    this.renderScheduledExports()
    this.hideScheduleModal()
    this.showNotification("Đã tạo lịch trình xuất dữ liệu")

    // Clear form
    document.getElementById("scheduleForm").reset()
  }

  calculateNextRun(frequency, time) {
    const now = new Date()
    const [hours, minutes] = time.split(":").map(Number)

    const nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)

    // If time has passed today, move to next occurrence
    if (nextRun <= now) {
      switch (frequency) {
        case "daily":
          nextRun.setDate(nextRun.getDate() + 1)
          break
        case "weekly":
          nextRun.setDate(nextRun.getDate() + 7)
          break
        case "monthly":
          nextRun.setMonth(nextRun.getMonth() + 1)
          break
        case "quarterly":
          nextRun.setMonth(nextRun.getMonth() + 3)
          break
      }
    }

    return nextRun.toISOString()
  }

  toggleSchedule(scheduleId) {
    const schedule = this.scheduledExports.find((s) => s.id === scheduleId)
    if (schedule) {
      schedule.active = !schedule.active
      this.saveScheduledExports()
      this.renderScheduledExports()
      this.showNotification(`Lịch trình đã được ${schedule.active ? "kích hoạt" : "tạm dừng"}`)
    }
  }

  deleteSchedule(scheduleId) {
    if (confirm("Bạn có chắc chắn muốn xóa lịch trình này?")) {
      this.scheduledExports = this.scheduledExports.filter((s) => s.id !== scheduleId)
      this.saveScheduledExports()
      this.renderScheduledExports()
      this.showNotification("Đã xóa lịch trình")
    }
  }

  deleteHistoryItem(itemId) {
    if (confirm("Bạn có chắc chắn muốn xóa mục này khỏi lịch sử?")) {
      this.exportHistory = this.exportHistory.filter((item) => item.id !== itemId)
      this.saveExportHistory()
      this.renderExportHistory()
      this.showNotification("Đã xóa khỏi lịch sử")
    }
  }

  downloadHistoryItem(itemId) {
    const item = this.exportHistory.find((h) => h.id === itemId)
    if (item) {
      // In a real app, this would download from the server
      this.showNotification("Đang tải xuống...")
    }
  }

  saveExportHistory() {
    localStorage.setItem("vsm_export_history", JSON.stringify(this.exportHistory))
  }

  saveScheduledExports() {
    localStorage.setItem("vsm_scheduled_exports", JSON.stringify(this.scheduledExports))
  }

  getTypeDisplayName(type) {
    const types = {
      posts: "Bài viết",
      members: "Thành viên",
      events: "Sự kiện",
      analytics: "Thống kê",
      media: "Media",
      settings: "Cài đặt",
      full: "Toàn bộ",
      custom: "Tùy chỉnh",
    }
    return types[type] || type
  }

  getStatusDisplayName(status) {
    const statuses = {
      completed: "Hoàn thành",
      failed: "Thất bại",
      processing: "Đang xử lý",
    }
    return statuses[status] || status
  }

  getFrequencyDisplayName(frequency) {
    const frequencies = {
      daily: "Hàng ngày",
      weekly: "Hàng tuần",
      monthly: "Hàng tháng",
      quarterly: "Hàng quý",
    }
    return frequencies[frequency] || frequency
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  showNotification(message) {
    // Create notification element
    const notification = document.createElement("div")
    notification.className = "notification"
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success-color);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: var(--shadow);
      z-index: 3000;
      animation: slideIn 0.3s ease;
    `

    document.body.appendChild(notification)

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease"
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }
}

// Global functions for onclick handlers
window.exportData = (type, format) => {
  if (window.exportManager) {
    window.exportManager.exportData(type, format)
  }
}

window.customExport = () => {
  if (window.exportManager) {
    window.exportManager.customExport()
  }
}

window.previewExport = () => {
  if (window.exportManager) {
    window.exportManager.previewExport()
  }
}

window.showScheduleModal = () => {
  if (window.exportManager) {
    window.exportManager.showScheduleModal()
  }
}

window.hideScheduleModal = () => {
  if (window.exportManager) {
    window.exportManager.hideScheduleModal()
  }
}

window.saveSchedule = () => {
  if (window.exportManager) {
    window.exportManager.saveSchedule()
  }
}

window.hidePreviewModal = () => {
  if (window.exportManager) {
    window.exportManager.hidePreviewModal()
  }
}

window.proceedWithExport = () => {
  if (window.exportManager) {
    window.exportManager.proceedWithExport()
  }
}

// Initialize export manager
function initExport() {
  window.exportManager = new ExportManager()
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ExportManager, initExport }
}
