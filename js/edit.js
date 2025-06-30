// Edit post page functionality
let editor = null

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication - redirect to login if not authenticated
  if (!window.Auth.requireAuth()) return

  // Get post ID from URL
  const urlParams = new URLSearchParams(window.location.search)
  const postId = urlParams.get("id")

  if (!postId) {
    showError("errorState", "Không tìm thấy ID bài viết")
    return
  }

  // Initialize rich text editor
  // Declare the RichTextEditor variable before using it
  const RichTextEditor = window.RichTextEditor
  editor = new RichTextEditor("editorContainer", {
    autosave: true,
    autosaveInterval: 30000,
  })

  await loadPost(postId)
  initializeForm()
  initializeThumbnailPreview()

  // Initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }

  // Initialize theme
  if (window.Theme) {
    window.Theme.init()
  }

  // Setup user info
  if (window.Auth.isAuthenticated) {
    window.Auth.updateUI()
  }
})

async function loadPost(postId) {
  const loading = document.getElementById("loading")
  const errorState = document.getElementById("errorState")
  const editForm = document.getElementById("editPostForm")

  try {
    if (loading) loading.style.display = "flex"
    if (errorState) errorState.style.display = "none"
    if (editForm) editForm.style.display = "none"

    // Mock API call - replace with actual API
    const result = await mockGetPost(postId)

    if (result.success) {
      const post = result.data

      // Check if user can edit this post
      if (!canEditPost(post)) {
        showError("errorState", "Bạn không có quyền chỉnh sửa bài viết này")
        return
      }

      populateForm(post)

      if (loading) loading.style.display = "none"
      if (editForm) editForm.style.display = "block"
    }
  } catch (error) {
    console.error("Error loading post:", error)
    showError("errorState", "Không thể tải bài viết")
  }
}

function populateForm(post) {
  // Populate form fields
  const fields = {
    title: post.title,
    shortDescription: post.shortDescription || "",
    thumbnail: post.thumbnail || "",
    category: post.category || "",
    tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
    isPublished: post.isPublished,
  }

  Object.entries(fields).forEach(([fieldName, value]) => {
    const field = document.getElementById(fieldName)
    if (field) {
      if (field.type === "checkbox") {
        field.checked = value
      } else {
        field.value = value
      }
    }
  })

  // Set content in rich text editor
  if (editor && post.content) {
    editor.setContent(post.content)
  }

  // Set publish date
  const publishedAtField = document.getElementById("publishedAt")
  if (publishedAtField && post.publishedAt) {
    const date = new Date(post.publishedAt)
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    publishedAtField.value = date.toISOString().slice(0, 16)
  }

  // Update thumbnail preview
  const thumbnailImg = document.getElementById("thumbnailImg")
  if (thumbnailImg && post.thumbnail) {
    thumbnailImg.src = post.thumbnail
  }

  // Update post info
  updatePostInfo(post)
}

function updatePostInfo(post) {
  const authorName = document.getElementById("authorName")
  const createdAt = document.getElementById("createdAt")
  const updatedAt = document.getElementById("updatedAt")

  if (authorName) authorName.textContent = post.authorName || "-"
  if (createdAt) createdAt.textContent = formatDate(post.createdAt)
  if (updatedAt) updatedAt.textContent = formatDate(post.updatedAt)
}

function initializeForm() {
  const editForm = document.getElementById("editPostForm")
  const deleteBtn = document.getElementById("deleteBtn")

  if (editForm) {
    editForm.addEventListener("submit", handleFormSubmit)
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleDelete)
  }
}

function initializeThumbnailPreview() {
  const thumbnailInput = document.getElementById("thumbnail")
  const thumbnailImg = document.getElementById("thumbnailImg")

  if (thumbnailInput && thumbnailImg) {
    thumbnailInput.addEventListener("input", function () {
      const url = this.value.trim()
      if (url && isValidUrl(url)) {
        thumbnailImg.src = url
        thumbnailImg.onerror = function () {
          this.src = "/placeholder.svg?height=200&width=300"
        }
      } else if (!url) {
        thumbnailImg.src = "/placeholder.svg?height=200&width=300"
      }
    })
  }
}

async function handleFormSubmit(e) {
  e.preventDefault()

  const urlParams = new URLSearchParams(window.location.search)
  const postId = urlParams.get("id")

  const formData = getFormData()

  if (!validateForm(formData)) {
    return
  }

  await updatePost(postId, formData)
}

function getFormData() {
  const form = document.getElementById("editPostForm")
  const formData = new FormData(form)

  return {
    title: formData.get("title")?.trim() || "",
    shortDescription: formData.get("shortDescription")?.trim() || "",
    content: editor ? editor.getContent() : "",
    thumbnail: formData.get("thumbnail")?.trim() || "",
    category: formData.get("category") || "",
    tags:
      formData
        .get("tags")
        ?.split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag) || [],
    publishedAt: formData.get("publishedAt") ? new Date(formData.get("publishedAt")) : new Date(),
    isPublished: formData.get("isPublished") === "on",
  }
}

function validateForm(data) {
  clearErrors()

  let isValid = true

  // Title is required
  if (!data.title) {
    showFieldError("titleError", "Tiêu đề là bắt buộc")
    isValid = false
  } else if (data.title.length > 200) {
    showFieldError("titleError", "Tiêu đề không được vượt quá 200 ký tự")
    isValid = false
  }

  // Content is required for published posts
  if (data.isPublished && !data.content.trim()) {
    showFieldError("contentError", "Nội dung là bắt buộc cho bài viết đã xuất bản")
    isValid = false
  }

  // Validate thumbnail URL if provided
  if (data.thumbnail && !isValidUrl(data.thumbnail)) {
    showToast("URL ảnh đại diện không hợp lệ", "error")
    isValid = false
  }

  return isValid
}

function showFieldError(elementId, message) {
  const errorElement = document.getElementById(elementId)
  if (errorElement) {
    errorElement.textContent = message
    errorElement.classList.add("show")
  }
}

function clearErrors() {
  const errorElements = document.querySelectorAll(".form-error")
  errorElements.forEach((element) => {
    element.classList.remove("show")
    element.textContent = ""
  })
}

async function updatePost(postId, postData) {
  const submitBtn = document.querySelector('button[type="submit"]')

  // Show loading state
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i data-feather="loader"></i> Đang cập nhật...'
  }

  try {
    // Mock API call - replace with actual API
    const result = await mockUpdatePost(postId, postData)

    if (result.success) {
      showToast("Cập nhật bài viết thành công!", "success")

      // Update the post info section
      updatePostInfo({
        ...result.data,
        updatedAt: new Date(),
      })

      // Clear draft
      if (editor) {
        editor.clearDraft()
      }

      // Redirect to post detail after short delay
      setTimeout(() => {
        window.location.href = `detail.html?id=${postId}`
      }, 1500)
    }
  } catch (error) {
    console.error("Error updating post:", error)
    showToast("Không thể cập nhật bài viết. Vui lòng thử lại.", "error")
  } finally {
    // Restore button state
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i data-feather="save"></i> Cập nhật'
    }

    // Re-initialize feather icons
    if (typeof window.feather !== "undefined") {
      window.feather.replace()
    }
  }
}

async function handleDelete() {
  if (!confirm("Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.")) {
    return
  }

  const urlParams = new URLSearchParams(window.location.search)
  const postId = urlParams.get("id")

  const deleteBtn = document.getElementById("deleteBtn")

  // Show loading state
  if (deleteBtn) {
    deleteBtn.disabled = true
    deleteBtn.innerHTML = '<i data-feather="loader"></i> Đang xóa...'
  }

  try {
    // Mock API call - replace with actual API
    const result = await mockDeletePost(postId)

    if (result.success) {
      showToast("Xóa bài viết thành công!", "success")

      // Clear draft
      if (editor) {
        editor.clearDraft()
      }

      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = "index.html"
      }, 1500)
    }
  } catch (error) {
    console.error("Error deleting post:", error)
    showToast("Không thể xóa bài viết. Vui lòng thử lại.", "error")
  } finally {
    // Restore button state
    if (deleteBtn) {
      deleteBtn.disabled = false
      deleteBtn.innerHTML = '<i data-feather="trash-2"></i> Xóa bài viết'
    }

    // Re-initialize feather icons
    if (typeof window.feather !== "undefined") {
      window.feather.replace()
    }
  }
}

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId)
  const messageElement = document.getElementById("errorMessage")

  if (errorElement) {
    errorElement.style.display = "flex"
  }

  if (messageElement) {
    messageElement.textContent = message
  }

  // Hide loading
  const loading = document.getElementById("loading")
  if (loading) {
    loading.style.display = "none"
  }
}

function canEditPost(post) {
  const currentUser = window.Auth.currentUser
  if (!currentUser) return false

  // Admin can edit all posts
  if (currentUser.role === "admin") return true

  // Editor can edit their own posts
  if (currentUser.role === "editor" && post.authorId === currentUser.id) return true

  return false
}

function formatDate(dateString) {
  if (!dateString) return "-"

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (error) {
    return "-"
  }
}

function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

function showToast(message, type = "info") {
  // Create toast element
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === "success" ? "var(--success-color)" : type === "error" ? "var(--danger-color)" : "var(--info-color)"};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-hover);
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    max-width: 300px;
    font-size: 0.875rem;
    font-weight: 500;
  `

  toast.textContent = message
  document.body.appendChild(toast)

  // Show toast
  setTimeout(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateX(0)"
  }, 100)

  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateX(100%)"

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, 3000)
}

// Mock API functions - replace with actual API calls
async function mockGetPost(postId) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock post data
  const mockPost = {
    id: postId,
    title: "Vietnam Student Marathon 2025 - Sự kiện chạy bộ lớn nhất dành cho sinh viên",
    shortDescription:
      "Tham gia cùng hàng nghìn sinh viên trong cuộc đua marathon đầy ý nghĩa, khởi dậy hành trình chạy bộ của bạn!",
    content: `
      <h2>Giới thiệu về Vietnam Student Marathon 2025</h2>
      <p>Vietnam Student Marathon (VSM) là sự kiện chạy bộ thường niên lớn nhất dành riêng cho sinh viên tại Việt Nam. Với slogan <strong>"Khởi dậy hành trình chạy bộ của bạn"</strong>, VSM không chỉ là một cuộc thi thể thao mà còn là nơi kết nối sinh viên từ khắp cả nước.</p>
      
      <h3>Thông tin sự kiện</h3>
      <ul>
        <li><strong>Thời gian:</strong> 28/12/2025</li>
        <li><strong>Địa điểm:</strong> Khu đô thị Sala, Thủ Đức, TP HCM</li>
        <li><strong>Đối tượng:</strong> Ưu tiên Sinh viên</li>
      </ul>
      
      <h3>Các cự ly thi đấu</h3>
      <p>Sự kiện có nhiều cự ly phù hợp với mọi trình độ:</p>
      <ol>
        <li>5KM - Cự ly khởi động</li>
        <li>10KM - Cự ly phổ biến</li>
        <li>21KM - Half Marathon</li>
        <li>42KM - Full Marathon</li>
      </ol>
      
      <blockquote>
        <p>"VSM - Nơi kết nối sinh viên đam mê chạy bộ, rèn luyện sức khỏe và chinh phục giới hạn bản thân qua những sự kiện marathon quy mô toàn quốc."</p>
      </blockquote>
      
      <h3>Đăng ký tham gia</h3>
      <p>Để đăng ký tham gia, sinh viên có thể truy cập website chính thức hoặc liên hệ:</p>
      <ul>
        <li>Email: vsm.org.vn@gmail.com</li>
        <li>Hotline: 0329 381 489</li>
        <li>Địa chỉ: Tầng 15 - UEH, 279 Nguyễn Tri Phương, Quận 10, TP Hồ Chí Minh</li>
      </ul>
    `,
    thumbnail: "/assets/vsm-hero.jpg",
    category: "su-kien",
    tags: ["marathon", "chạy bộ", "sinh viên", "thể thao", "VSM"],
    isPublished: true,
    publishedAt: "2024-12-20T10:00:00Z",
    authorId: 1,
    authorName: "Admin VSM",
    createdAt: "2024-12-15T08:30:00Z",
    updatedAt: "2024-12-20T10:00:00Z",
  }

  return {
    success: true,
    data: mockPost,
  }
}

async function mockUpdatePost(postId, postData) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Mock successful update
  return {
    success: true,
    data: {
      ...postData,
      id: postId,
      updatedAt: new Date().toISOString(),
    },
  }
}

async function mockDeletePost(postId) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock successful deletion
  return {
    success: true,
    message: "Post deleted successfully",
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (editor) {
    editor.destroy()
  }
})
