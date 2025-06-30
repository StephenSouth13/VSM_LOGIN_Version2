// Authentication module for VSM CMS

class AuthManager {
  constructor() {
    this.currentUser = null
    this.isAuthenticated = false
    this.init()
  }

  init() {
    // Check if user is already logged in
    const userData = window.Utils.Storage.get("vsm_user")
    const token = window.Utils.Storage.get("vsm_token")

    if (userData && token) {
      this.currentUser = userData
      this.isAuthenticated = true
      this.updateUI()
    }
  }

  async login(email, password, remember = false) {
    try {
      // Mock API call - replace with actual API endpoint
      const response = await this.mockLogin(email, password)

      if (response.success) {
        this.currentUser = response.user
        this.isAuthenticated = true

        // Store user data
        window.Utils.Storage.set("vsm_user", response.user)
        window.Utils.Storage.set("vsm_token", response.token)

        if (remember) {
          window.Utils.Storage.set("vsm_remember", true)
        }

        this.updateUI()
        return { success: true, user: response.user }
      } else {
        return { success: false, message: response.message }
      }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, message: "Đã xảy ra lỗi khi đăng nhập" }
    }
  }

  async mockLogin(email, password) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock users database - TÀI KHOẢN DEMO
    const users = [
      {
        id: 1,
        email: "admin@vsm.org.vn",
        password: "admin123",
        name: "Nguyễn Văn Admin",
        role: "admin",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 2,
        email: "editor@vsm.org.vn",
        password: "editor123",
        name: "Trần Thị Editor",
        role: "editor",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 3,
        email: "demo@vsm.org.vn",
        password: "demo123",
        name: "Demo User",
        role: "editor",
        avatar: "/placeholder.svg?height=32&width=32",
      },
    ]

    const user = users.find((u) => u.email === email && u.password === password)

    if (user) {
      const { password: _, ...userWithoutPassword } = user
      return {
        success: true,
        user: userWithoutPassword,
        token: "mock_jwt_token_" + Date.now(),
      }
    } else {
      return {
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      }
    }
  }

  logout() {
    this.currentUser = null
    this.isAuthenticated = false

    // Clear stored data
    window.Utils.Storage.remove("vsm_user")
    window.Utils.Storage.remove("vsm_token")
    window.Utils.Storage.remove("vsm_remember")

    // Redirect to login
    window.location.href = "login.html"
  }

  updateUI() {
    if (!this.isAuthenticated) return

    // Update user info in sidebar
    const userName = document.getElementById("userName")
    const userRole = document.getElementById("userRole")
    const userAvatar = document.querySelector(".user-avatar")

    if (userName) userName.textContent = this.currentUser.name
    if (userRole) {
      userRole.textContent = this.currentUser.role === "admin" ? "Administrator" : "Cộng tác viên"
    }
    if (userAvatar) userAvatar.src = this.currentUser.avatar

    // Show/hide admin-only elements
    document.body.setAttribute("data-role", this.currentUser.role)

    // Setup logout button
    const logoutBtn = document.getElementById("logoutBtn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault()
        this.logout()
      })
    }
  }

  requireAuth() {
    if (!this.isAuthenticated) {
      window.location.href = "login.html"
      return false
    }
    return true
  }

  requireAdmin() {
    if (!this.isAuthenticated || this.currentUser.role !== "admin") {
      if (window.Utils && window.Utils.toast) {
        window.Utils.toast.error("Bạn không có quyền truy cập trang này")
      }
      window.location.href = "index.html"
      return false
    }
    return true
  }

  hasPermission(permission) {
    if (!this.isAuthenticated) return false

    const permissions = {
      admin: ["create", "edit", "delete", "publish", "manage_users", "view_stats", "export"],
      editor: ["create", "edit_own", "publish_own"],
    }

    const userPermissions = permissions[this.currentUser.role] || []
    return userPermissions.includes(permission)
  }

  canEditPost(post) {
    if (!this.isAuthenticated) return false
    if (this.currentUser.role === "admin") return true
    return post.authorId === this.currentUser.id
  }

  canDeletePost(post) {
    if (!this.isAuthenticated) return false
    if (this.currentUser.role === "admin") return true
    return false
  }
}

// Create global auth instance
const auth = new AuthManager()

// Export auth
window.Auth = auth
