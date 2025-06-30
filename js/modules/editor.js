// WordPress-style Block Editor for VSM CMS

class BlockEditor {
  constructor() {
    this.blocks = []
    this.selectedBlock = null
    this.currentBlockId = 0
    this.inserterVisible = false
    this.autoSaveInterval = null
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupAutoSave()
    this.loadDraft()
  }

  setupEventListeners() {
    // Title input
    const titleInput = document.getElementById("postTitle")
    if (titleInput) {
      titleInput.addEventListener("input", (e) => {
        this.updateTitlePreview(e.target.value)
        this.triggerAutoSave()
      })

      titleInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          this.focusEditor()
        }
      })
    }

    // Editor content
    const editorContent = document.getElementById("editorContent")
    if (editorContent) {
      editorContent.addEventListener("click", (e) => {
        if (e.target === editorContent) {
          this.showInserter(e)
        }
      })

      editorContent.addEventListener("keydown", (e) => {
        this.handleEditorKeydown(e)
      })
    }

    // Block inserter
    this.setupBlockInserter()

    // Sidebar tabs
    this.setupSidebarTabs()

    // Toolbar buttons
    this.setupToolbarButtons()

    // Image modal
    this.setupImageModal()

    // Tags input
    this.setupTagsInput()

    // Global shortcuts
    document.addEventListener("keydown", (e) => {
      this.handleGlobalShortcuts(e)
    })
  }

  setupBlockInserter() {
    const inserterBlocks = document.querySelectorAll(".block-item")
    inserterBlocks.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const blockType = e.currentTarget.dataset.block
        this.insertBlock(blockType)
        this.hideInserter()
      })
    })

    // Search functionality
    const inserterSearch = document.getElementById("inserterSearch")
    if (inserterSearch) {
      inserterSearch.addEventListener("input", (e) => {
        this.filterBlocks(e.target.value)
      })
    }

    // Hide inserter when clicking outside
    document.addEventListener("click", (e) => {
      const inserter = document.getElementById("blockInserter")
      if (inserter && !inserter.contains(e.target) && !e.target.closest(".editor-content")) {
        this.hideInserter()
      }
    })
  }

  setupSidebarTabs() {
    const tabBtns = document.querySelectorAll(".sidebar-tabs .tab-btn")
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabName = e.target.dataset.tab
        this.switchSidebarTab(tabName)
      })
    })
  }

  setupToolbarButtons() {
    // Save draft
    const saveDraftBtn = document.getElementById("saveDraftBtn")
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener("click", () => {
        this.saveDraft()
      })
    }

    // Publish
    const publishBtn = document.getElementById("publishBtn")
    if (publishBtn) {
      publishBtn.addEventListener("click", () => {
        this.publishPost()
      })
    }

    // Preview
    const previewBtn = document.getElementById("previewBtn")
    if (previewBtn) {
      previewBtn.addEventListener("click", () => {
        this.previewPost()
      })
    }
  }

  setupImageModal() {
    const imageModal = document.getElementById("imageModal")
    const closeBtn = document.getElementById("closeImageModal")
    const cancelBtn = document.getElementById("cancelImageBtn")
    const insertBtn = document.getElementById("insertImageBtn")

    if (closeBtn) closeBtn.addEventListener("click", () => this.hideImageModal())
    if (cancelBtn) cancelBtn.addEventListener("click", () => this.hideImageModal())
    if (insertBtn) insertBtn.addEventListener("click", () => this.insertImage())

    // Tab switching
    const tabBtns = imageModal?.querySelectorAll(".image-upload-tabs .tab-btn")
    tabBtns?.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchImageTab(e.target.dataset.tab)
      })
    })

    // File upload
    const fileInput = document.getElementById("imageFileInput")
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        this.handleFileUpload(e.target.files)
      })
    }

    // Drag and drop
    const uploadArea = document.getElementById("uploadArea")
    if (uploadArea) {
      uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault()
        uploadArea.classList.add("dragover")
      })

      uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover")
      })

      uploadArea.addEventListener("drop", (e) => {
        e.preventDefault()
        uploadArea.classList.remove("dragover")
        this.handleFileUpload(e.dataTransfer.files)
      })
    }
  }

  setupTagsInput() {
    const tagsInput = document.getElementById("tagsInput")
    if (tagsInput) {
      tagsInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault()
          this.addTag(e.target.value.trim())
          e.target.value = ""
        }
      })
    }
  }

  setupAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.saveDraft(true) // Silent save
    }, 30000) // Every 30 seconds
  }

  handleEditorKeydown(e) {
    if (e.key === "/") {
      // Show block inserter when typing '/'
      setTimeout(() => {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          this.showInserter(null, { x: rect.left, y: rect.bottom })
        }
      }, 0)
    } else if (e.key === "Enter") {
      // Handle enter key for new blocks
      if (!e.shiftKey) {
        e.preventDefault()
        this.handleEnterKey()
      }
    } else if (e.key === "Backspace") {
      // Handle backspace for block deletion
      this.handleBackspace(e)
    }
  }

  handleGlobalShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "s":
          e.preventDefault()
          this.saveDraft()
          break
        case "k":
          e.preventDefault()
          this.showShortcutMenu()
          break
        case "z":
          if (e.shiftKey) {
            e.preventDefault()
            this.redo()
          } else {
            e.preventDefault()
            this.undo()
          }
          break
      }
    }
  }

  showInserter(event, position = null) {
    const inserter = document.getElementById("blockInserter")
    const placeholder = document.getElementById("editorPlaceholder")

    if (!inserter) return

    if (position) {
      inserter.style.left = position.x + "px"
      inserter.style.top = position.y + "px"
    } else if (event) {
      inserter.style.left = event.clientX + "px"
      inserter.style.top = event.clientY + "px"
    }

    inserter.style.display = "block"
    this.inserterVisible = true

    if (placeholder) {
      placeholder.classList.add("hidden")
    }

    // Focus search input
    const searchInput = document.getElementById("inserterSearch")
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100)
    }
  }

  hideInserter() {
    const inserter = document.getElementById("blockInserter")
    const placeholder = document.getElementById("editorPlaceholder")

    if (inserter) {
      inserter.style.display = "none"
      this.inserterVisible = false
    }

    if (placeholder && this.blocks.length === 0) {
      placeholder.classList.remove("hidden")
    }
  }

  insertBlock(type, content = "", position = null) {
    const blockId = ++this.currentBlockId
    const block = {
      id: blockId,
      type: type,
      content: content,
      attributes: {},
    }

    if (position !== null) {
      this.blocks.splice(position, 0, block)
    } else {
      this.blocks.push(block)
    }

    this.renderBlocks()
    this.selectBlock(blockId)
    this.triggerAutoSave()

    // Focus the new block
    setTimeout(() => {
      const blockElement = document.querySelector(`[data-block-id="${blockId}"] .block-content`)
      if (blockElement) {
        blockElement.focus()
      }
    }, 100)
  }

  renderBlocks() {
    const container = document.getElementById("editorBlocks")
    if (!container) return

    container.innerHTML = this.blocks.map((block) => this.renderBlock(block)).join("")

    // Attach event listeners to new blocks
    this.attachBlockListeners()

    // Update placeholder visibility
    const placeholder = document.getElementById("editorPlaceholder")
    if (placeholder) {
      placeholder.classList.toggle("hidden", this.blocks.length > 0)
    }
  }

  renderBlock(block) {
    const blockClass = `block-${block.type}`
    const isSelected = this.selectedBlock === block.id

    return `
      <div class="editor-block ${blockClass} ${isSelected ? "selected" : ""}" 
           data-block-id="${block.id}" 
           data-block-type="${block.type}">
        <div class="block-toolbar">
          <button onclick="editor.moveBlockUp(${block.id})" title="Di chuyển lên">
            <i data-feather="chevron-up"></i>
          </button>
          <button onclick="editor.moveBlockDown(${block.id})" title="Di chuyển xuống">
            <i data-feather="chevron-down"></i>
          </button>
          <button onclick="editor.duplicateBlock(${block.id})" title="Nhân bản">
            <i data-feather="copy"></i>
          </button>
          <button onclick="editor.deleteBlock(${block.id})" title="Xóa">
            <i data-feather="trash-2"></i>
          </button>
        </div>
        ${this.renderBlockContent(block)}
      </div>
    `
  }

  renderBlockContent(block) {
    switch (block.type) {
      case "paragraph":
        return `<div class="block-content" contenteditable="true" data-placeholder="Nhập văn bản...">${block.content}</div>`

      case "heading":
        const level = block.attributes.level || 2
        return `<${level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : level === 4 ? "h4" : level === 5 ? "h5" : "h6"} class="block-content" contenteditable="true" data-placeholder="Nhập tiêu đề...">${block.content}</${level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : level === 4 ? "h4" : level === 5 ? "h5" : "h6"}>`

      case "image":
        if (block.content) {
          return `
            <div class="block-image">
              <img src="${block.content}" alt="${block.attributes.alt || ""}" />
              <div class="image-caption" contenteditable="true" data-placeholder="Thêm chú thích...">${block.attributes.caption || ""}</div>
            </div>
          `
        } else {
          return `
            <div class="block-image-placeholder" onclick="editor.showImageModal(${block.id})">
              <i data-feather="image"></i>
              <p>Click để thêm hình ảnh</p>
            </div>
          `
        }

      case "quote":
        return `<blockquote class="block-content" contenteditable="true" data-placeholder="Nhập trích dẫn...">${block.content}</blockquote>`

      case "list":
        const listType = block.attributes.ordered ? "ol" : "ul"
        const items = block.content.split("\n").filter((item) => item.trim())
        return `
          <${listType} class="block-content">
            ${items.map((item) => `<li contenteditable="true">${item}</li>`).join("")}
            <li contenteditable="true" data-placeholder="Thêm mục mới..."></li>
          </${listType}>
        `

      case "code":
        return `<pre class="block-content" contenteditable="true" data-placeholder="Nhập mã nguồn...">${block.content}</pre>`

      case "separator":
        return `<hr class="block-separator" />`

      default:
        return `<div class="block-content" contenteditable="true">${block.content}</div>`
    }
  }

  attachBlockListeners() {
    const blockElements = document.querySelectorAll(".editor-block")
    blockElements.forEach((element) => {
      const blockId = Number.parseInt(element.dataset.blockId)

      // Click to select
      element.addEventListener("click", (e) => {
        e.stopPropagation()
        this.selectBlock(blockId)
      })

      // Content editing
      const contentElement = element.querySelector(".block-content")
      if (contentElement) {
        contentElement.addEventListener("input", (e) => {
          this.updateBlockContent(blockId, e.target.innerHTML || e.target.textContent)
        })

        contentElement.addEventListener("keydown", (e) => {
          this.handleBlockKeydown(e, blockId)
        })
      }
    })

    // Re-initialize feather icons
    const feather = window.feather // Declare feather variable
    if (typeof feather !== "undefined") {
      feather.replace()
    }
  }

  selectBlock(blockId) {
    this.selectedBlock = blockId

    // Update visual selection
    document.querySelectorAll(".editor-block").forEach((el) => {
      el.classList.toggle("selected", Number.parseInt(el.dataset.blockId) === blockId)
    })

    // Update sidebar
    this.updateBlockSettings(blockId)
  }

  updateBlockContent(blockId, content) {
    const block = this.blocks.find((b) => b.id === blockId)
    if (block) {
      block.content = content
      this.triggerAutoSave()
    }
  }

  deleteBlock(blockId) {
    if (confirm("Bạn có chắc chắn muốn xóa khối này?")) {
      this.blocks = this.blocks.filter((b) => b.id !== blockId)
      this.renderBlocks()
      this.triggerAutoSave()
    }
  }

  duplicateBlock(blockId) {
    const block = this.blocks.find((b) => b.id === blockId)
    if (block) {
      const newBlock = {
        ...block,
        id: ++this.currentBlockId,
      }
      const index = this.blocks.findIndex((b) => b.id === blockId)
      this.blocks.splice(index + 1, 0, newBlock)
      this.renderBlocks()
      this.triggerAutoSave()
    }
  }

  moveBlockUp(blockId) {
    const index = this.blocks.findIndex((b) => b.id === blockId)
    if (index > 0) {
      ;[this.blocks[index - 1], this.blocks[index]] = [this.blocks[index], this.blocks[index - 1]]
      this.renderBlocks()
      this.selectBlock(blockId)
      this.triggerAutoSave()
    }
  }

  moveBlockDown(blockId) {
    const index = this.blocks.findIndex((b) => b.id === blockId)
    if (index < this.blocks.length - 1) {
      ;[this.blocks[index], this.blocks[index + 1]] = [this.blocks[index + 1], this.blocks[index]]
      this.renderBlocks()
      this.selectBlock(blockId)
      this.triggerAutoSave()
    }
  }

  showImageModal(blockId = null) {
    this.currentImageBlockId = blockId
    const modal = document.getElementById("imageModal")
    if (modal) {
      modal.classList.add("show")
    }
  }

  hideImageModal() {
    const modal = document.getElementById("imageModal")
    if (modal) {
      modal.classList.remove("show")
    }
    this.currentImageBlockId = null
  }

  insertImage() {
    const urlInput = document.getElementById("imageUrlInput")
    const altInput = document.getElementById("imageAltInput")

    const imageUrl = urlInput?.value.trim()
    const altText = altInput?.value.trim()

    if (!imageUrl) {
      alert("Vui lòng nhập URL hình ảnh")
      return
    }

    if (this.currentImageBlockId) {
      // Update existing image block
      const block = this.blocks.find((b) => b.id === this.currentImageBlockId)
      if (block) {
        block.content = imageUrl
        block.attributes.alt = altText
        this.renderBlocks()
      }
    } else {
      // Create new image block
      this.insertBlock("image", imageUrl)
      const newBlock = this.blocks[this.blocks.length - 1]
      newBlock.attributes.alt = altText
    }

    this.hideImageModal()
    this.triggerAutoSave()

    // Clear form
    if (urlInput) urlInput.value = ""
    if (altInput) altInput.value = ""
  }

  switchImageTab(tabName) {
    const tabs = document.querySelectorAll(".image-upload-tabs .tab-btn")
    const contents = document.querySelectorAll("#imageModal .tab-content")

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName)
    })

    contents.forEach((content) => {
      content.classList.toggle("active", content.id === tabName + "Tab")
    })
  }

  addTag(tagText) {
    if (!tagText) return

    const tagsList = document.getElementById("tagsList")
    if (!tagsList) return

    // Check if tag already exists
    const existingTags = Array.from(tagsList.querySelectorAll(".tag-item"))
    if (existingTags.some((tag) => tag.textContent.includes(tagText))) {
      return
    }

    const tagElement = document.createElement("div")
    tagElement.className = "tag-item"
    tagElement.innerHTML = `
      <span>${tagText}</span>
      <button class="tag-remove" onclick="this.parentElement.remove()">
        <i data-feather="x"></i>
      </button>
    `

    tagsList.appendChild(tagElement)

    // Re-initialize feather icons
    const feather = window.feather // Declare feather variable
    if (typeof feather !== "undefined") {
      feather.replace()
    }
  }

  switchSidebarTab(tabName) {
    const tabs = document.querySelectorAll(".sidebar-tabs .tab-btn")
    const contents = document.querySelectorAll(".tab-content")

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName)
    })

    contents.forEach((content) => {
      content.classList.toggle("active", content.id === tabName + "Tab")
    })
  }

  updateTitlePreview(title) {
    const preview = document.getElementById("postTitlePreview")
    if (preview) {
      preview.textContent = title || "Không có tiêu đề - Bài viết"
    }
  }

  focusEditor() {
    if (this.blocks.length === 0) {
      this.insertBlock("paragraph")
    } else {
      const firstBlock = document.querySelector(".editor-block .block-content")
      if (firstBlock) {
        firstBlock.focus()
      }
    }
  }

  saveDraft(silent = false) {
    const title = document.getElementById("postTitle")?.value || ""
    const content = this.getPostContent()

    const draftData = {
      title,
      blocks: this.blocks,
      timestamp: new Date().toISOString(),
    }

    localStorage.setItem("vsm_post_draft", JSON.stringify(draftData))

    if (!silent) {
      this.showSaveStatus("Đã lưu nháp")
    }
  }

  loadDraft() {
    const draftData = localStorage.getItem("vsm_post_draft")
    if (draftData) {
      try {
        const draft = JSON.parse(draftData)

        // Load title
        const titleInput = document.getElementById("postTitle")
        if (titleInput && draft.title) {
          titleInput.value = draft.title
          this.updateTitlePreview(draft.title)
        }

        // Load blocks
        if (draft.blocks && draft.blocks.length > 0) {
          this.blocks = draft.blocks
          this.currentBlockId = Math.max(...draft.blocks.map((b) => b.id))
          this.renderBlocks()
        }
      } catch (error) {
        console.error("Error loading draft:", error)
      }
    }
  }

  getPostContent() {
    return this.blocks
      .map((block) => {
        switch (block.type) {
          case "heading":
            const level = block.attributes.level || 2
            return `<h${level}>${block.content}</h${level}>`
          case "paragraph":
            return `<p>${block.content}</p>`
          case "image":
            return `<img src="${block.content}" alt="${block.attributes.alt || ""}" />`
          case "quote":
            return `<blockquote>${block.content}</blockquote>`
          case "list":
            const listType = block.attributes.ordered ? "ol" : "ul"
            const items = block.content.split("\n").filter((item) => item.trim())
            return `<${listType}>${items.map((item) => `<li>${item}</li>`).join("")}</${listType}>`
          case "code":
            return `<pre><code>${block.content}</code></pre>`
          case "separator":
            return "<hr />"
          default:
            return `<div>${block.content}</div>`
        }
      })
      .join("\n")
  }

  showSaveStatus(message) {
    const status = document.getElementById("autoSaveStatus")
    if (status) {
      status.textContent = message
      status.style.color = "var(--success-color)"

      setTimeout(() => {
        status.textContent = "Đã lưu"
        status.style.color = "var(--text-muted)"
      }, 2000)
    }
  }

  triggerAutoSave() {
    clearTimeout(this.autoSaveTimeout)
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDraft(true)
    }, 1000)
  }

  publishPost() {
    const title = document.getElementById("postTitle")?.value.trim()
    if (!title) {
      alert("Vui lòng nhập tiêu đề bài viết")
      return
    }

    if (this.blocks.length === 0) {
      alert("Vui lòng thêm nội dung cho bài viết")
      return
    }

    // Simulate publishing
    this.showSaveStatus("Đang đăng...")

    setTimeout(() => {
      this.showSaveStatus("Đã đăng thành công!")
      // Clear draft
      localStorage.removeItem("vsm_post_draft")

      // Redirect to posts list
      setTimeout(() => {
        window.location.href = "index.html"
      }, 1500)
    }, 1000)
  }

  previewPost() {
    const title = document.getElementById("postTitle")?.value || "Bài viết không có tiêu đề"
    const content = this.getPostContent()

    const previewWindow = window.open("", "_blank")
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
          h1, h2, h3, h4, h5, h6 { margin-top: 2em; margin-bottom: 0.5em; }
          img { max-width: 100%; height: auto; }
          blockquote { border-left: 4px solid #27ae60; padding-left: 20px; margin: 20px 0; font-style: italic; }
          pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${content}
      </body>
      </html>
    `)
  }
}

// Initialize editor when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.editor = new BlockEditor()
})
