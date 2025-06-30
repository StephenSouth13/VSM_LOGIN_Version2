// Detail post page functionality

// Declare necessary variables
const auth = {} // Placeholder for auth object
const api = {} // Placeholder for api object
const DateUtils = {} // Placeholder for DateUtils object
const toast = {} // Placeholder for toast object
const feather = {} // Placeholder for feather object

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication - redirect to login if not authenticated
  if (!window.Auth.requireAuth()) return

  // Get post ID from URL
  const urlParams = new URLSearchParams(window.location.search)
  const postId = urlParams.get("id")

  if (!postId) {
    showError("Không tìm thấy ID bài viết")
    return
  }

  await loadPost(postId)
  initializeActions()

  // Initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
})

async function loadPost(postId) {
  const loading = document.getElementById("loading")
  const errorState = document.getElementById("errorState")
  const postDetail = document.getElementById("postDetail")

  try {
    if (loading) loading.style.display = "flex"
    if (errorState) errorState.style.display = "none"
    if (postDetail) postDetail.style.display = "none"

    const result = await api.getPost(postId)

    if (result.success) {
      const post = result.data
      displayPost(post)

      if (loading) loading.style.display = "none"
      if (postDetail) postDetail.style.display = "block"
    }
  } catch (error) {
    console.error("Error loading post:", error)
    showError("Không thể tải bài viết")
  }
}

function displayPost(post) {
  // Update page title
  document.title = `${post.title} - VSM CMS`

  // Update post content
  updateElement("postTitle", post.title)
  updateElement("postDescription", post.shortDescription || "")
  updateElement("postContent", post.content || "")
  updateElement("authorName", post.authorName || "Unknown")
  updateElement("publishDate", DateUtils.formatDate(post.publishedAt || post.createdAt, "dd/mm/yyyy"))
  updateElement("createdAt", DateUtils.formatDate(post.createdAt, "dd/mm/yyyy hh:mm"))
  updateElement("updatedAt", DateUtils.formatDate(post.updatedAt, "dd/mm/yyyy hh:mm"))

  // Update category
  const categoryElement = document.getElementById("postCategory")
  if (categoryElement) {
    categoryElement.textContent = getCategoryLabel(post.category)
    categoryElement.className = `post-category category-${post.category}`
  }

  // Update status
  const statusElement = document.getElementById("postStatus")
  if (statusElement) {
    statusElement.textContent = post.isPublished ? "Đã xuất bản" : "Bản nháp"
    statusElement.className = `post-status ${post.isPublished ? "status-published" : "status-draft"}`
  }

  // Update thumbnail
  const thumbnailElement = document.getElementById("postThumbnail")
  if (thumbnailElement && post.thumbnail) {
    thumbnailElement.src = post.thumbnail
    thumbnailElement.alt = post.title
  }

  // Update tags
  displayTags(post.tags)

  // Show/hide action buttons based on permissions
  updateActionButtons(post)
}

function updateElement(id, content) {
  const element = document.getElementById(id)
  if (element) {
    element.textContent = content
  }
}

function displayTags(tags) {
  const tagsContainer = document.getElementById("postTags")
  if (!tagsContainer) return

  if (!tags || tags.length === 0) {
    tagsContainer.innerHTML = '<p class="text-muted">Chưa có tags</p>'
    return
  }

  const tagsHtml = tags.map((tag) => `<span class="tag">${tag}</span>`).join("")

  tagsContainer.innerHTML = `
    <div class="tags-list">
      <strong>Tags: </strong>
      ${tagsHtml}
    </div>
  `
}

function updateActionButtons(post) {
  const editBtn = document.getElementById("editBtn")
  const deleteBtn = document.getElementById("deleteBtn")

  // Show edit button if user can edit
  if (editBtn) {
    if (auth.canEditPost(post)) {
      editBtn.style.display = "inline-flex"
      editBtn.href = `edit.html?id=${post.id}`
    } else {
      editBtn.style.display = "none"
    }
  }

  // Show delete button if user can delete
  if (deleteBtn) {
    if (auth.canDeletePost(post)) {
      deleteBtn.style.display = "inline-flex"
      deleteBtn.onclick = () => handleDelete(post.id)
    } else {
      deleteBtn.style.display = "none"
    }
  }
}

function initializeActions() {
  // Print button
  const printBtn = document.getElementById("printBtn")
  if (printBtn) {
    printBtn.addEventListener("click", handlePrint)
  }

  // Share button
  const shareBtn = document.getElementById("shareBtn")
  if (shareBtn) {
    shareBtn.addEventListener("click", handleShare)
  }

  // Copy link button
  const copyLinkBtn = document.getElementById("copyLinkBtn")
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", handleCopyLink)
  }
}

function handlePrint() {
  // Create a print-friendly version
  const printWindow = window.open("", "_blank")
  const post = getCurrentPost()

  if (!post) {
    toast.error("Không thể in bài viết")
    return
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${post.title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #27ae60; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .meta { color: #666; font-size: 14px; }
        .content { margin-top: 30px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${post.title}</div>
        <div class="meta">
          Tác giả: ${post.authorName} | 
          Ngày đăng: ${DateUtils.formatDate(post.publishedAt || post.createdAt, "dd/mm/yyyy")}
        </div>
      </div>
      
      ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.title}" style="margin-bottom: 20px;">` : ""}
      
      ${post.shortDescription ? `<div style="font-style: italic; margin-bottom: 20px;">${post.shortDescription}</div>` : ""}
      
      <div class="content">
        ${post.content}
      </div>
      
      <div class="footer">
        © 2025 Viet Nam Student Marathon • vsm.org.vn@gmail.com
      </div>
    </body>
    </html>
  `

  printWindow.document.write(printContent)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

function handleShare() {
  if (navigator.share) {
    const post = getCurrentPost()
    if (post) {
      navigator
        .share({
          title: post.title,
          text: post.shortDescription || post.title,
          url: window.location.href,
        })
        .catch((error) => {
          console.error("Error sharing:", error)
          fallbackShare()
        })
    }
  } else {
    fallbackShare()
  }
}

function fallbackShare() {
  // Fallback share options
  const shareUrl = window.location.href
  const post = getCurrentPost()
  const title = post ? post.title : "Bài viết VSM"

  const shareOptions = [
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Twitter",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: "LinkedIn",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
  ]

  const shareMenu = shareOptions
    .map((option) => `<a href="${option.url}" target="_blank" rel="noopener">${option.name}</a>`)
    .join(" | ")

  toast.info(`Chia sẻ qua: ${shareMenu}`)
}

async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.success("Đã sao chép link vào clipboard")
  } catch (error) {
    console.error("Error copying link:", error)

    // Fallback for older browsers
    const textArea = document.createElement("textarea")
    textArea.value = window.location.href
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand("copy")
    document.body.removeChild(textArea)

    toast.success("Đã sao chép link vào clipboard")
  }
}

async function handleDelete(postId) {
  if (!confirm("Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.")) {
    return
  }

  const deleteBtn = document.getElementById("deleteBtn")

  // Show loading state
  if (deleteBtn) {
    deleteBtn.disabled = true
    deleteBtn.innerHTML = '<i data-feather="loader"></i> Đang xóa...'
  }

  try {
    const result = await api.deletePost(postId)

    if (result.success) {
      toast.success("Xóa bài viết thành công!")

      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = "index.html"
      }, 1500)
    }
  } catch (error) {
    console.error("Error deleting post:", error)
    toast.error("Không thể xóa bài viết. Vui lòng thử lại.")
  } finally {
    // Restore button state
    if (deleteBtn) {
      deleteBtn.disabled = false
      deleteBtn.innerHTML = '<i data-feather="trash-2"></i> Xóa'
    }

    // Re-initialize feather icons
    if (typeof feather !== "undefined") {
      feather.replace()
    }
  }
}

function getCurrentPost() {
  // Get post data from the displayed content
  const title = document.getElementById("postTitle")?.textContent
  const content = document.getElementById("postContent")?.textContent
  const shortDescription = document.getElementById("postDescription")?.textContent
  const authorName = document.getElementById("authorName")?.textContent
  const publishDate = document.getElementById("publishDate")?.textContent
  const thumbnail = document.getElementById("postThumbnail")?.src

  if (!title) return null

  return {
    title,
    content,
    shortDescription,
    authorName,
    publishedAt: publishDate,
    thumbnail,
  }
}

function getCategoryLabel(category) {
  const labels = {
    news: "Tin tức",
    events: "Sự kiện",
    training: "Huấn luyện",
    community: "Cộng đồng",
  }
  return labels[category] || "Khác"
}

function showError(message) {
  const loading = document.getElementById("loading")
  const errorState = document.getElementById("errorState")
  const postDetail = document.getElementById("postDetail")

  if (loading) loading.style.display = "none"
  if (postDetail) postDetail.style.display = "none"
  if (errorState) {
    errorState.style.display = "flex"
    const errorMessage = errorState.querySelector("p")
    if (errorMessage) {
      errorMessage.textContent = message
    }
  }
}
