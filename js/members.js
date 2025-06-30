// Members management functionality

document.addEventListener("DOMContentLoaded", () => {
  // Check authentication and admin role
  if (!window.Auth.requireAuth() || !window.Auth.requireAdmin()) {
    return
  }

  // Initialize members page
  initMembersPage()
  loadMembers()
  setupEventListeners()

  // Initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
})

function initMembersPage() {
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
  // Add member button
  const addMemberBtn = document.getElementById("addMemberBtn")
  if (addMemberBtn) {
    addMemberBtn.addEventListener("click", showAddMemberModal)
  }

  // Modal controls
  const modalClose = document.getElementById("modalClose")
  const cancelBtn = document.getElementById("cancelBtn")
  const memberModal = document.getElementById("memberModal")

  if (modalClose) {
    modalClose.addEventListener("click", hideMemberModal)
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", hideMemberModal)
  }
  if (memberModal) {
    memberModal.addEventListener("click", (e) => {
      if (e.target === memberModal) {
        hideMemberModal()
      }
    })
  }

  // Form submission
  const memberForm = document.getElementById("memberForm")
  if (memberForm) {
    memberForm.addEventListener("submit", handleMemberSubmit)
  }

  // Search and filters
  const searchInput = document.getElementById("searchInput")
  const roleFilter = document.getElementById("roleFilter")
  const statusFilter = document.getElementById("statusFilter")

  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300))
  }
  if (roleFilter) {
    roleFilter.addEventListener("change", applyFilters)
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters)
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

async function loadMembers() {
  try {
    showLoading()

    // Mock API call
    const members = await getMockMembers()
    displayMembers(members)
  } catch (error) {
    console.error("Error loading members:", error)
    showError("Không thể tải danh sách thành viên")
    showEmptyState()
  } finally {
    hideLoading()
  }
}

async function getMockMembers() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Get members from localStorage or use default data
  const storedMembers = localStorage.getItem("vsm_members")
  if (storedMembers) {
    return JSON.parse(storedMembers)
  }

  // Default members
  const defaultMembers = [
    {
      id: 1,
      name: "Nguyễn Văn Admin",
      email: "admin@vsm.org.vn",
      role: "admin",
      status: "active",
      joinDate: "2024-01-01",
      avatar: "/placeholder.svg?height=40&width=40",
      lastLogin: "2024-01-15T10:30:00Z",
    },
    {
      id: 2,
      name: "Trần Thị Editor",
      email: "editor@vsm.org.vn",
      role: "editor",
      status: "active",
      joinDate: "2024-01-05",
      avatar: "/placeholder.svg?height=40&width=40",
      lastLogin: "2024-01-14T15:20:00Z",
    },
    {
      id: 3,
      name: "Lê Văn Demo",
      email: "demo@vsm.org.vn",
      role: "editor",
      status: "inactive",
      joinDate: "2024-01-10",
      avatar: "/placeholder.svg?height=40&width=40",
      lastLogin: "2024-01-12T09:15:00Z",
    },
  ]

  // Save to localStorage
  localStorage.setItem("vsm_members", JSON.stringify(defaultMembers))
  return defaultMembers
}

function displayMembers(members) {
  const tableBody = document.getElementById("membersTableBody")
  const emptyState = document.getElementById("emptyState")
  const tableContainer = document.querySelector(".table-container")

  if (!tableBody) return

  if (members.length === 0) {
    showEmptyState()
    return
  }

  // Hide empty state and show table
  if (emptyState) emptyState.style.display = "none"
  if (tableContainer) tableContainer.style.display = "block"

  tableBody.innerHTML = members
    .map(
      (member) => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${member.avatar}" alt="${member.name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${member.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            Đăng nhập: ${formatDate(member.lastLogin)}
                        </div>
                    </div>
                </div>
            </td>
            <td>${member.email}</td>
            <td>
                <span class="role-badge ${member.role}" style="padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; ${getRoleStyle(member.role)}">
                    ${getRoleText(member.role)}
                </span>
            </td>
            <td>
                <span class="status-badge ${member.status}" style="padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; ${getStatusStyle(member.status)}">
                    ${getStatusText(member.status)}
                </span>
            </td>
            <td>${formatDate(member.joinDate)}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" 
                            onclick="editMember(${member.id})">
                        <i data-feather="edit-2" style="width: 14px; height: 14px;"></i>
                        Sửa
                    </button>
                    ${
                      member.id !== window.Auth.currentUser.id
                        ? `
                        <button class="btn btn-danger" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" 
                                onclick="deleteMember(${member.id})">
                            <i data-feather="trash-2" style="width: 14px; height: 14px;"></i>
                            Xóa
                        </button>
                    `
                        : ""
                    }
                </div>
            </td>
        </tr>
    `,
    )
    .join("")

  // Re-initialize feather icons for new content
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
}

function getRoleStyle(role) {
  switch (role) {
    case "admin":
      return "background: rgba(52, 152, 219, 0.1); color: #3498db;"
    case "editor":
      return "background: rgba(46, 204, 113, 0.1); color: #2ecc71;"
    default:
      return "background: rgba(149, 165, 166, 0.1); color: #95a5a6;"
  }
}

function getRoleText(role) {
  switch (role) {
    case "admin":
      return "Administrator"
    case "editor":
      return "Cộng tác viên"
    default:
      return "Không xác định"
  }
}

function getStatusStyle(status) {
  switch (status) {
    case "active":
      return "background: rgba(46, 204, 113, 0.1); color: #2ecc71;"
    case "inactive":
      return "background: rgba(231, 76, 60, 0.1); color: #e74c3c;"
    default:
      return "background: rgba(149, 165, 166, 0.1); color: #95a5a6;"
  }
}

function getStatusText(status) {
  switch (status) {
    case "active":
      return "Hoạt động"
    case "inactive":
      return "Tạm khóa"
    default:
      return "Không xác định"
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function showAddMemberModal() {
  const modal = document.getElementById("memberModal")
  const modalTitle = document.getElementById("modalTitle")
  const form = document.getElementById("memberForm")

  if (modalTitle) modalTitle.textContent = "Thêm thành viên mới"
  if (form) form.reset()

  // Clear member ID for new member
  const memberIdInput = document.getElementById("memberId")
  if (memberIdInput) memberIdInput.value = ""

  // Show password field for new member
  const passwordGroup = document.getElementById("memberPassword").closest(".form-group")
  if (passwordGroup) passwordGroup.style.display = "block"

  showModal(modal)
}

function showEditMemberModal(member) {
  const modal = document.getElementById("memberModal")
  const modalTitle = document.getElementById("modalTitle")
  const form = document.getElementById("memberForm")

  if (modalTitle) modalTitle.textContent = "Chỉnh sửa thành viên"

  // Fill form with member data
  document.getElementById("memberId").value = member.id
  document.getElementById("memberName").value = member.name
  document.getElementById("memberEmail").value = member.email
  document.getElementById("memberRole").value = member.role
  document.getElementById("memberStatus").value = member.status

  // Hide password field for editing
  const passwordGroup = document.getElementById("memberPassword").closest(".form-group")
  if (passwordGroup) passwordGroup.style.display = "none"

  showModal(modal)
}

function showModal(modal) {
  if (modal) {
    modal.classList.add("show")
    document.body.style.overflow = "hidden"
  }
}

function hideMemberModal() {
  const modal = document.getElementById("memberModal")
  if (modal) {
    modal.classList.remove("show")
    document.body.style.overflow = ""
  }

  // Clear form errors
  clearFormErrors()
}

async function handleMemberSubmit(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const memberData = {
    id: formData.get("memberId") || null,
    name: formData.get("memberName").trim(),
    email: formData.get("memberEmail").trim(),
    password: formData.get("memberPassword"),
    role: formData.get("memberRole"),
    status: formData.get("memberStatus"),
  }

  // Validate form
  if (!validateMemberForm(memberData)) {
    return
  }

  // Show loading state
  const saveBtn = document.getElementById("saveBtn")
  const originalText = saveBtn.innerHTML
  saveBtn.innerHTML = '<i data-feather="loader"></i> Đang lưu...'
  saveBtn.disabled = true

  try {
    if (memberData.id) {
      await updateMember(memberData)
      showSuccess("Cập nhật thành viên thành công!")
    } else {
      await createMember(memberData)
      showSuccess("Thêm thành viên thành công!")
    }

    hideMemberModal()
    loadMembers()
  } catch (error) {
    console.error("Error saving member:", error)
    showError("Có lỗi xảy ra khi lưu thành viên")
  } finally {
    saveBtn.innerHTML = originalText
    saveBtn.disabled = false

    // Re-initialize feather icons
    if (typeof window.feather !== "undefined") {
      window.feather.replace()
    }
  }
}

function validateMemberForm(data) {
  clearFormErrors()

  let isValid = true

  // Validate name
  if (!data.name) {
    showFieldError("nameError", "Họ và tên là bắt buộc")
    isValid = false
  }

  // Validate email
  if (!data.email) {
    showFieldError("emailError", "Email là bắt buộc")
    isValid = false
  } else if (!isValidEmail(data.email)) {
    showFieldError("emailError", "Email không hợp lệ")
    isValid = false
  }

  // Validate password (only for new members)
  if (!data.id && (!data.password || data.password.length < 6)) {
    showFieldError("passwordError", "Mật khẩu phải có ít nhất 6 ký tự")
    isValid = false
  }

  // Validate role
  if (!data.role) {
    showFieldError("roleError", "Vui lòng chọn vai trò")
    isValid = false
  }

  return isValid
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(fieldId)
  if (errorElement) {
    errorElement.textContent = message
    errorElement.classList.add("show")
  }
}

function clearFormErrors() {
  const errorElements = document.querySelectorAll(".form-error")
  errorElements.forEach((element) => {
    element.classList.remove("show")
    element.textContent = ""
  })
}

async function createMember(memberData) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const members = await getMockMembers()

  // Check if email already exists
  if (members.some((m) => m.email === memberData.email)) {
    throw new Error("Email đã tồn tại")
  }

  const newMember = {
    id: Date.now(),
    name: memberData.name,
    email: memberData.email,
    role: memberData.role,
    status: memberData.status,
    joinDate: new Date().toISOString().split("T")[0],
    avatar: "/placeholder.svg?height=40&width=40",
    lastLogin: new Date().toISOString(),
  }

  members.push(newMember)
  localStorage.setItem("vsm_members", JSON.stringify(members))

  return newMember
}

async function updateMember(memberData) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const members = await getMockMembers()
  const memberIndex = members.findIndex((m) => m.id == memberData.id)

  if (memberIndex === -1) {
    throw new Error("Không tìm thấy thành viên")
  }

  // Check if email already exists (excluding current member)
  if (members.some((m) => m.email === memberData.email && m.id != memberData.id)) {
    throw new Error("Email đã tồn tại")
  }

  // Update member
  members[memberIndex] = {
    ...members[memberIndex],
    name: memberData.name,
    email: memberData.email,
    role: memberData.role,
    status: memberData.status,
  }

  localStorage.setItem("vsm_members", JSON.stringify(members))

  return members[memberIndex]
}

// Global functions for button actions
window.editMember = async (memberId) => {
  try {
    const members = await getMockMembers()
    const member = members.find((m) => m.id === memberId)

    if (member) {
      showEditMemberModal(member)
    } else {
      showError("Không tìm thấy thành viên")
    }
  } catch (error) {
    console.error("Error loading member:", error)
    showError("Có lỗi xảy ra khi tải thông tin thành viên")
  }
}

window.deleteMember = async (memberId) => {
  if (!confirm("Bạn có chắc chắn muốn xóa thành viên này?")) {
    return
  }

  try {
    const members = await getMockMembers()
    const filteredMembers = members.filter((m) => m.id !== memberId)

    localStorage.setItem("vsm_members", JSON.stringify(filteredMembers))

    showSuccess("Xóa thành viên thành công!")
    loadMembers()
  } catch (error) {
    console.error("Error deleting member:", error)
    showError("Có lỗi xảy ra khi xóa thành viên")
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase()
  applyFilters()
}

async function applyFilters() {
  try {
    const members = await getMockMembers()
    const searchQuery = document.getElementById("searchInput").value.toLowerCase()
    const roleFilter = document.getElementById("roleFilter").value
    const statusFilter = document.getElementById("statusFilter").value

    let filteredMembers = members

    // Apply search filter
    if (searchQuery) {
      filteredMembers = filteredMembers.filter(
        (member) => member.name.toLowerCase().includes(searchQuery) || member.email.toLowerCase().includes(searchQuery),
      )
    }

    // Apply role filter
    if (roleFilter) {
      filteredMembers = filteredMembers.filter((member) => member.role === roleFilter)
    }

    // Apply status filter
    if (statusFilter) {
      filteredMembers = filteredMembers.filter((member) => member.status === statusFilter)
    }

    displayMembers(filteredMembers)
  } catch (error) {
    console.error("Error applying filters:", error)
  }
}

function showLoading() {
  const loading = document.getElementById("loading")
  const tableContainer = document.querySelector(".table-container")
  const emptyState = document.getElementById("emptyState")

  if (loading) loading.style.display = "flex"
  if (tableContainer) tableContainer.style.display = "none"
  if (emptyState) emptyState.style.display = "none"
}

function hideLoading() {
  const loading = document.getElementById("loading")
  if (loading) loading.style.display = "none"
}

function showEmptyState() {
  const loading = document.getElementById("loading")
  const tableContainer = document.querySelector(".table-container")
  const emptyState = document.getElementById("emptyState")

  if (loading) loading.style.display = "none"
  if (tableContainer) tableContainer.style.display = "none"
  if (emptyState) emptyState.style.display = "flex"
}

function showSuccess(message) {
  showMessage(message, "success")
}

function showError(message) {
  showMessage(message, "error")
}

function showMessage(message, type) {
  // Remove existing messages
  const existing = document.querySelectorAll(".toast-message")
  existing.forEach((msg) => msg.remove())

  const messageDiv = document.createElement("div")
  messageDiv.className = `toast-message ${type}`

  const colors = {
    error: { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
    success: { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    info: { bg: "#d1ecf1", color: "#0c5460", border: "#bee5eb" },
  }

  const style = colors[type] || colors.info
  messageDiv.style.cssText = `
    background: ${style.bg};
    color: ${style.color};
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 15px;
    border: 1px solid ${style.border};
    font-size: 14px;
    font-weight: 500;
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
    min-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
  `
  messageDiv.textContent = message

  document.body.appendChild(messageDiv)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.style.animation = "slideOut 0.3s ease-in"
      setTimeout(() => messageDiv.remove(), 300)
    }
  }, 5000)
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Add CSS animations
const style = document.createElement("style")
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)
