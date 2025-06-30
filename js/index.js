// Dashboard page functionality

document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!window.Auth.requireAuth()) {
    return
  }

  // Initialize dashboard
  initDashboard()
  loadDashboardData()
  setupEventListeners()

  // Initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
})

function initDashboard() {
  // Setup user info
  if (window.Auth.isAuthenticated) {
    window.Auth.updateUI()
  }

  // Initialize theme
  if (window.Theme) {
    window.Theme.init()
  }
}

function setupEventListeners() {
  // Create post button
  const createPostBtn = document.getElementById("createPostBtn")
  if (createPostBtn) {
    createPostBtn.addEventListener("click", () => {
      window.location.href = "create.html"
    })
  }

  // Search functionality
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("input", window.Utils.debounce(handleSearch, 300))
  }

  // Filter functionality
  const categoryFilter = document.getElementById("categoryFilter")
  const statusFilter = document.getElementById("statusFilter")
  const sortFilter = document.getElementById("sortFilter")

  if (categoryFilter) {
    categoryFilter.addEventListener("change", applyFilters)
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters)
  }
  if (sortFilter) {
    sortFilter.addEventListener("change", applyFilters)
  }

  // Sidebar toggle
  const sidebarToggle = document.getElementById("sidebarToggle")
  const sidebar = document.getElementById("sidebar")
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed")
    })
  }
}

async function loadDashboardData() {
  try {
    showLoading()

    // Load posts and statistics
    const [posts, stats] = await Promise.all([loadPosts(), loadStatistics()])

    displayStatistics(stats)
    displayPosts(posts)
  } catch (error) {
    console.error("Error loading dashboard data:", error)
    showError("Không thể tải dữ liệu dashboard")
  } finally {
    hideLoading()
  }
}

async function loadPosts() {
  // Mock API call - replace with actual API
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Get posts from localStorage or use mock data
  const storedPosts = localStorage.getItem("vsm_posts")
  if (storedPosts) {
    return JSON.parse(storedPosts)
  }

  // Mock posts data
  const mockPosts = [
    {
      id: 1,
      title: "Vietnam Student Marathon 2025 - Chạy vì tương lai",
      description:
        "Sự kiện marathon lớn nhất dành cho sinh viên Việt Nam với hơn 10,000 người tham gia từ khắp cả nước.",
      content: "Nội dung chi tiết về sự kiện...",
      category: "events",
      status: "published",
      author: "Nguyễn Văn Admin",
      authorId: 1,
      thumbnail: "/placeholder.svg?height=200&width=350",
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-15T10:30:00Z",
      publishedAt: "2024-01-15T10:30:00Z",
      views: 1250,
      tags: ["marathon", "sinh viên", "thể thao"],
    },
    {
      id: 2,
      title: "Hướng dẫn tập luyện cho người mới bắt đầu chạy bộ",
      description: "Những bài tập cơ bản và lộ trình tập luyện phù hợp cho người mới bắt đầu.",
      content: "Nội dung hướng dẫn...",
      category: "training",
      status: "published",
      author: "Trần Thị Editor",
      authorId: 2,
      thumbnail: "/placeholder.svg?height=200&width=350",
      createdAt: "2024-01-14T15:20:00Z",
      updatedAt: "2024-01-14T15:20:00Z",
      publishedAt: "2024-01-14T15:20:00Z",
      views: 890,
      tags: ["hướng dẫn", "tập luyện", "người mới"],
    },
    {
      id: 3,
      title: "Cộng đồng VSM - Kết nối đam mê chạy bộ",
      description: "Tham gia cộng đồng VSM để kết nối với những người cùng đam mê chạy bộ.",
      content: "Nội dung về cộng đồng...",
      category: "community",
      status: "draft",
      author: "Nguyễn Văn Admin",
      authorId: 1,
      thumbnail: "/placeholder.svg?height=200&width=350",
      createdAt: "2024-01-13T09:15:00Z",
      updatedAt: "2024-01-13T09:15:00Z",
      publishedAt: null,
      views: 0,
      tags: ["cộng đồng", "kết nối"],
    },
  ]

  // Save to localStorage
  localStorage.setItem("vsm_posts", JSON.stringify(mockPosts))
  return mockPosts
}

async function loadStatistics() {
  // Mock API call
  await new Promise((resolve) => setTimeout(resolve, 500))

  const posts = await loadPosts()

  const total = posts.length
  const published = posts.filter((p) => p.status === "published").length
  const draft = posts.filter((p) => p.status === "draft").length
  const today = posts.filter((p) => window.Utils.Date.isToday(p.createdAt)).length

  return { total, published, draft, today }
}

function displayStatistics(stats) {
  // Update stat cards with animation
  animateCounter(document.querySelector('[data-stat="total"]'), stats.total)
  animateCounter(document.querySelector('[data-stat="published"]'), stats.published)
  animateCounter(document.querySelector('[data-stat="draft"]'), stats.draft)
  animateCounter(document.querySelector('[data-stat="today"]'), stats.today)
}

function animateCounter(element, target) {
  if (!element) return

  const duration = 1000
  const start = 0
  const increment = target / (duration / 16)
  let current = start

  const timer = setInterval(() => {
    current += increment
    if (current >= target) {
      current = target
      clearInterval(timer)
    }
    element.textContent = Math.floor(current)
  }, 16)
}

function displayPosts(posts) {
  const container = document.getElementById("postsContainer")
  const emptyState = document.getElementById("emptyState")

  if (!container) return

  if (posts.length === 0) {
    showEmptyState()
    return
  }

  // Hide empty state
  if (emptyState) emptyState.style.display = "none"

  // Create posts grid
  const postsGrid = document.createElement("div")
  postsGrid.className = "posts-container"
  postsGrid.innerHTML = `
    <div class="posts-grid">
      ${posts
        .map(
          (post) => `
        <div class="post-card" onclick="viewPost(${post.id})">
          <img src="${post.thumbnail}" alt="${post.title}" class="post-thumbnail">
          <div class="post-content">
            <h3 class="post-title">${post.title}</h3>
            <p class="post-description">${post.description}</p>
            <div class="post-meta">
              <span>${window.Utils.Date.format(post.createdAt, "relative")}</span>
              <span class="post-status status-${post.status}">
                ${post.status === "published" ? "Đã xuất bản" : "Bản nháp"}
              </span>
            </div>
            <div class="post-actions" onclick="event.stopPropagation()">
              <button class="btn btn-secondary" onclick="editPost(${post.id})">
                <i data-feather="edit-2"></i>
                Sửa
              </button>
              ${
                window.Auth.canDeletePost(post)
                  ? `
                <button class="btn btn-danger" onclick="deletePost(${post.id})">
                  <i data-feather="trash-2"></i>
                  Xóa
                </button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `

  container.innerHTML = ""
  container.appendChild(postsGrid)

  // Re-initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase()
  applyFilters()
}

async function applyFilters() {
  try {
    const posts = await loadPosts()
    const searchQuery = document.getElementById("searchInput").value.toLowerCase()
    const categoryFilter = document.getElementById("categoryFilter").value
    const statusFilter = document.getElementById("statusFilter").value
    const sortFilter = document.getElementById("sortFilter").value

    let filteredPosts = posts

    // Apply search filter
    if (searchQuery) {
      filteredPosts = filteredPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery) ||
          post.description.toLowerCase().includes(searchQuery) ||
          post.author.toLowerCase().includes(searchQuery),
      )
    }

    // Apply category filter
    if (categoryFilter) {
      filteredPosts = filteredPosts.filter((post) => post.category === categoryFilter)
    }

    // Apply status filter
    if (statusFilter) {
      filteredPosts = filteredPosts.filter((post) => post.status === statusFilter)
    }

    // Apply sorting
    switch (sortFilter) {
      case "newest":
        filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case "oldest":
        filteredPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case "title":
        filteredPosts.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    displayPosts(filteredPosts)
  } catch (error) {
    console.error("Error applying filters:", error)
  }
}

// Global functions for post actions
window.viewPost = (postId) => {
  window.location.href = `detail.html?id=${postId}`
}

window.editPost = (postId) => {
  window.location.href = `edit.html?id=${postId}`
}

window.deletePost = async (postId) => {
  if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
    return
  }

  try {
    const posts = await loadPosts()
    const post = posts.find((p) => p.id === postId)

    if (!post) {
      window.Utils.Toast.error("Không tìm thấy bài viết")
      return
    }

    if (!window.Auth.canDeletePost(post)) {
      window.Utils.Toast.error("Bạn không có quyền xóa bài viết này")
      return
    }

    // Remove post from array
    const updatedPosts = posts.filter((p) => p.id !== postId)
    localStorage.setItem("vsm_posts", JSON.stringify(updatedPosts))

    window.Utils.Toast.success("Xóa bài viết thành công!")

    // Reload dashboard
    loadDashboardData()
  } catch (error) {
    console.error("Error deleting post:", error)
    window.Utils.Toast.error("Có lỗi xảy ra khi xóa bài viết")
  }
}

function showLoading() {
  const loading = document.getElementById("loading")
  const postsContainer = document.getElementById("postsContainer")
  const emptyState = document.getElementById("emptyState")

  if (loading) loading.style.display = "flex"
  if (postsContainer) postsContainer.style.display = "none"
  if (emptyState) emptyState.style.display = "none"
}

function hideLoading() {
  const loading = document.getElementById("loading")
  if (loading) loading.style.display = "none"

  const postsContainer = document.getElementById("postsContainer")
  if (postsContainer) postsContainer.style.display = "block"
}

function showEmptyState() {
  const loading = document.getElementById("loading")
  const postsContainer = document.getElementById("postsContainer")
  const emptyState = document.getElementById("emptyState")

  if (loading) loading.style.display = "none"
  if (postsContainer) postsContainer.style.display = "none"
  if (emptyState) emptyState.style.display = "flex"
}

function showError(message) {
  window.Utils.Toast.error(message)
}
function logout() {
    // Thực hiện các bước cần thiết để đăng xuất, ví dụ xóa token hoặc session
    window.Auth.logout(); // Giả sử bạn có một phương thức logout trong đối tượng Auth

    // Chuyển hướng đến trang login.html
    window.location.href = 'login.html';
}
