// Create post page functionality

document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!window.Auth.requireAuth()) {
    return
  }

  // Initialize create post page
  initCreatePost()
  setupEventListeners()
  setupEditor()

  // Initialize theme
  if (window.Theme) {
    window.Theme.init()
  }

  // Initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
})

function initCreatePost() {
  // Setup user info
  if (window.Auth.isAuthenticated) {
    window.Auth.updateUI()
  }

  // Set default values
  const authorInput = document.getElementById("author")
  if (authorInput && window.Auth.currentUser) {
    authorInput.value = window.Auth.currentUser.name
  }

  const dateInput = document.getElementById("publishDate")
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0]
  }
}

function setupEventListeners() {
  const form = document.getElementById("createPostForm")
  if (form) {
    form.addEventListener("submit", handleSubmit)
  }

  // Auto-save functionality
  const titleInput = document.getElementById("title")
  const contentInput = document.getElementById("content")

  if (titleInput) {
    titleInput.addEventListener("input", debounce(autoSave, 1000))
  }
  if (contentInput) {
    contentInput.addEventListener("input", debounce(autoSave, 1000))
  }

  // Image upload
  const imageInput = document.getElementById("featuredImage")
  if (imageInput) {
    imageInput.addEventListener("change", handleImageUpload)
  }

  // Category management
  const addCategoryBtn = document.getElementById("addCategoryBtn")
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener("click", showAddCategoryModal)
  }
}

function setupEditor() {
  // Simple rich text editor setup
  const contentTextarea = document.getElementById("content")
  if (contentTextarea) {
    // Add basic formatting buttons
    const editorToolbar = document.createElement("div")
    editorToolbar.className = "editor-toolbar"
    editorToolbar.style.cssText = `
      display: flex;
      gap: 5px;
      margin-bottom: 10px;
      padding: 10px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
    `

    const buttons = [
      { text: "B", action: "bold", title: "Bold" },
      { text: "I", action: "italic", title: "Italic" },
      { text: "U", action: "underline", title: "Underline" },
      { text: "Link", action: "link", title: "Insert Link" },
    ]

    buttons.forEach((btn) => {
      const button = document.createElement("button")
      button.type = "button"
      button.textContent = btn.text
      button.title = btn.title
      button.style.cssText = `
        padding: 5px 10px;
        border: 1px solid #ccc;
        background: white;
        cursor: pointer;
        border-radius: 3px;
      `
      button.addEventListener("click", () => formatText(btn.action))
      editorToolbar.appendChild(button)
    })

    contentTextarea.parentNode.insertBefore(editorToolbar, contentTextarea)
  }
}

function formatText(action) {
  const textarea = document.getElementById("content")
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = textarea.value.substring(start, end)

  let formattedText = ""
  switch (action) {
    case "bold":
      formattedText = `**${selectedText}**`
      break
    case "italic":
      formattedText = `*${selectedText}*`
      break
    case "underline":
      formattedText = `<u>${selectedText}</u>`
      break
    case "link":
      const url = prompt("Nhập URL:")
      if (url) {
        formattedText = `[${selectedText || "Link text"}](${url})`
      }
      break
  }

  if (formattedText) {
    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end)
    textarea.focus()
    textarea.setSelectionRange(start, start + formattedText.length)
  }
}

async function handleSubmit(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const postData = {
    title: formData.get("title"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt"),
    category: formData.get("category"),
    tags: formData.get("tags"),
    status: formData.get("status"),
    publishDate: formData.get("publishDate"),
    author: formData.get("author"),
    featuredImage: formData.get("featuredImage"),
  }

  // Validation
  if (!postData.title || !postData.content) {
    showError("Vui lòng nhập tiêu đề và nội dung bài viết")
    return
  }

  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]')
  const originalText = submitBtn.textContent
  submitBtn.textContent = "Đang lưu..."
  submitBtn.disabled = true

  try {
    // Mock API call
    await savePost(postData)

    showSuccess("Bài viết đã được lưu thành công!")

    // Redirect after delay
    setTimeout(() => {
      window.location.href = "index.html"
    }, 1500)
  } catch (error) {
    console.error("Save error:", error)
    showError("Có lỗi xảy ra khi lưu bài viết")
  } finally {
    submitBtn.textContent = originalText
    submitBtn.disabled = false
  }
}

async function savePost(postData) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock save to localStorage
  const posts = JSON.parse(localStorage.getItem("vsm_posts") || "[]")
  const newPost = {
    ...postData,
    id: Date.now(),
    authorId: window.Auth.currentUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  posts.push(newPost)
  localStorage.setItem("vsm_posts", JSON.stringify(posts))

  return newPost
}

function handleImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showError("Vui lòng chọn file hình ảnh")
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showError("File hình ảnh không được vượt quá 5MB")
    return
  }

  // Show preview
  const reader = new FileReader()
  reader.onload = (e) => {
    const preview = document.getElementById("imagePreview")
    if (preview) {
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 4px;">
        <button type="button" onclick="removeImage()" style="margin-left: 10px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Xóa</button>
      `
    }
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  const imageInput = document.getElementById("featuredImage")
  const preview = document.getElementById("imagePreview")

  if (imageInput) imageInput.value = ""
  if (preview) preview.innerHTML = ""
}

function autoSave() {
  const title = document.getElementById("title")?.value
  const content = document.getElementById("content")?.value

  if (title || content) {
    const draftData = {
      title,
      content,
      timestamp: new Date().toISOString(),
    }

    localStorage.setItem("vsm_draft", JSON.stringify(draftData))

    // Show auto-save indicator
    showAutoSaveIndicator()
  }
}

function showAutoSaveIndicator() {
  const indicator = document.getElementById("autoSaveIndicator")
  if (indicator) {
    indicator.textContent = "Đã lưu tự động"
    indicator.style.color = "#28a745"

    setTimeout(() => {
      indicator.textContent = ""
    }, 2000)
  }
}

function showAddCategoryModal() {
  const categoryName = prompt("Nhập tên danh mục mới:")
  if (categoryName) {
    const categorySelect = document.getElementById("category")
    if (categorySelect) {
      const option = document.createElement("option")
      option.value = categoryName
      option.textContent = categoryName
      option.selected = true
      categorySelect.appendChild(option)
    }
  }
}

function showError(message) {
  const errorDiv = document.createElement("div")
  errorDiv.className = "error-message"
  errorDiv.style.cssText = `
    background: #f8d7da;
    color: #721c24;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid #f5c6cb;
  `
  errorDiv.textContent = message

  const form = document.getElementById("createPostForm")
  if (form) {
    form.insertBefore(errorDiv, form.firstChild)
    setTimeout(() => errorDiv.remove(), 5000)
  }
}

function showSuccess(message) {
  const successDiv = document.createElement("div")
  successDiv.className = "success-message"
  successDiv.style.cssText = `
    background: #d4edda;
    color: #155724;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid #c3e6cb;
  `
  successDiv.textContent = message

  const form = document.getElementById("createPostForm")
  if (form) {
    form.insertBefore(successDiv, form.firstChild)
  }
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
