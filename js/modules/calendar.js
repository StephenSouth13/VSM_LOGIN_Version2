// Calendar management module for VSM CMS

class CalendarManager {
  constructor() {
    this.currentDate = new Date()
    this.selectedDate = null
    this.notes = Storage.get("vsm_calendar_notes", {})
    this.currentView = "month"
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.renderCalendar()
    this.updateCurrentMonth()
  }

  setupEventListeners() {
    // Navigation buttons
    document.getElementById("prevMonth")?.addEventListener("click", () => this.previousMonth())
    document.getElementById("nextMonth")?.addEventListener("click", () => this.nextMonth())
    document.getElementById("todayBtn")?.addEventListener("click", () => this.goToToday())

    // View toggle
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.switchView(e.target.dataset.view))
    })

    // Add note button
    document.getElementById("addNoteBtn")?.addEventListener("click", () => this.showNoteModal())

    // Modal controls
    document.getElementById("closeModal")?.addEventListener("click", () => this.hideNoteModal())
    document.getElementById("cancelNote")?.addEventListener("click", () => this.hideNoteModal())
    document.getElementById("noteForm")?.addEventListener("submit", (e) => this.handleNoteSubmit(e))

    // Sidebar controls
    document.getElementById("closeSidebar")?.addEventListener("click", () => this.closeSidebar())
    document.getElementById("saveNote")?.addEventListener("click", () => this.saveQuickNote())

    // Click outside modal to close
    document.getElementById("noteModal")?.addEventListener("click", (e) => {
      if (e.target.id === "noteModal") {
        this.hideNoteModal()
      }
    })
  }

  renderCalendar() {
    if (this.currentView === "month") {
      this.renderMonthView()
    } else {
      this.renderListView()
    }
  }

  renderMonthView() {
    const calendarDays = document.getElementById("calendarDays")
    if (!calendarDays) return

    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    // Get previous month's last days
    const prevMonth = new Date(year, month, 0)
    const daysInPrevMonth = prevMonth.getDate()

    let html = ""
    let dayCount = 1
    let nextMonthDay = 1

    // Generate 6 weeks (42 days)
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const cellIndex = week * 7 + day
        let dayNumber,
          cellDate,
          isCurrentMonth = true,
          isToday = false

        if (cellIndex < startingDayOfWeek) {
          // Previous month days
          dayNumber = daysInPrevMonth - startingDayOfWeek + cellIndex + 1
          cellDate = new Date(year, month - 1, dayNumber)
          isCurrentMonth = false
        } else if (dayCount <= daysInMonth) {
          // Current month days
          dayNumber = dayCount
          cellDate = new Date(year, month, dayNumber)
          dayCount++

          // Check if today
          const today = new Date()
          isToday = cellDate.toDateString() === today.toDateString()
        } else {
          // Next month days
          dayNumber = nextMonthDay
          cellDate = new Date(year, month + 1, dayNumber)
          nextMonthDay++
          isCurrentMonth = false
        }

        const dateKey = this.getDateKey(cellDate)
        const dayNotes = this.notes[dateKey] || []
        const isSelected = this.selectedDate && cellDate.toDateString() === this.selectedDate.toDateString()

        const classes = ["calendar-day"]
        if (!isCurrentMonth) classes.push("other-month")
        if (isToday) classes.push("today")
        if (isSelected) classes.push("selected")

        html += `
          <div class="${classes.join(" ")}" data-date="${dateKey}" onclick="calendar.selectDate('${dateKey}')">
            <div class="day-number">${dayNumber}</div>
            <div class="day-notes">
              ${dayNotes
                .slice(0, 3)
                .map(
                  (note) => `
                <div class="note-item ${note.type}" title="${note.text}">
                  ${note.time ? note.time + " - " : ""}${this.truncate(note.text, 20)}
                </div>
              `,
                )
                .join("")}
              ${dayNotes.length > 3 ? `<div class="note-item">+${dayNotes.length - 3} khác</div>` : ""}
            </div>
          </div>
        `
      }
    }

    calendarDays.innerHTML = html
  }

  renderListView() {
    const calendarList = document.getElementById("calendarList")
    const notesList = document.getElementById("notesList")
    if (!calendarList || !notesList) return

    // Show list view, hide grid
    document.getElementById("calendarGrid").style.display = "none"
    calendarList.style.display = "block"

    // Get all notes for current month
    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()
    const monthNotes = []

    Object.entries(this.notes).forEach(([dateKey, notes]) => {
      const date = new Date(dateKey)
      if (date.getFullYear() === year && date.getMonth() === month) {
        notes.forEach((note) => {
          monthNotes.push({
            ...note,
            date: date,
            dateKey: dateKey,
          })
        })
      }
    })

    // Sort by date and time
    monthNotes.sort((a, b) => {
      const dateCompare = a.date - b.date
      if (dateCompare !== 0) return dateCompare
      return (a.time || "").localeCompare(b.time || "")
    })

    if (monthNotes.length === 0) {
      notesList.innerHTML = `
        <div class="empty-state">
          <i data-feather="calendar"></i>
          <h3>Chưa có ghi chú nào</h3>
          <p>Thêm ghi chú đầu tiên cho tháng này</p>
        </div>
      `
    } else {
      notesList.innerHTML = monthNotes
        .map(
          (note) => `
        <div class="note-card">
          <div class="note-header">
            <div>
              <span class="note-date">${this.formatDate(note.date, "dd/mm/yyyy")}</span>
              ${note.time ? `<span class="note-time">${note.time}</span>` : ""}
            </div>
            <div>
              <span class="note-type ${note.type}">${this.getNoteTypeLabel(note.type)}</span>
              <button class="btn btn-danger btn-sm" onclick="calendar.deleteNote('${note.dateKey}', ${note.id})">
                <i data-feather="trash-2"></i>
              </button>
            </div>
          </div>
          <div class="note-content">${note.text}</div>
        </div>
      `,
        )
        .join("")
    }

    // Re-initialize feather icons
    if (typeof window.feather !== "undefined") {
      window.feather.replace()
    }
  }

  switchView(view) {
    this.currentView = view

    // Update active button
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view)
    })

    if (view === "month") {
      document.getElementById("calendarGrid").style.display = "block"
      document.getElementById("calendarList").style.display = "none"
      this.renderMonthView()
    } else {
      this.renderListView()
    }
  }

  selectDate(dateKey) {
    this.selectedDate = new Date(dateKey)
    this.renderCalendar()
    this.showSidebar(dateKey)
  }

  showSidebar(dateKey) {
    const sidebar = document.getElementById("notesSidebar")
    const selectedDateSpan = document.getElementById("selectedDate")
    const dayNotes = document.getElementById("dayNotes")

    if (!sidebar || !selectedDateSpan || !dayNotes) return

    const date = new Date(dateKey)
    selectedDateSpan.textContent = this.formatDate(date, "dd/mm/yyyy")

    // Display existing notes for this day
    const notes = this.notes[dateKey] || []
    dayNotes.innerHTML = notes
      .map(
        (note) => `
      <div class="note-card">
        <div class="note-header">
          <div>
            ${note.time ? `<span class="note-time">${note.time}</span>` : ""}
            <span class="note-type ${note.type}">${this.getNoteTypeLabel(note.type)}</span>
          </div>
          <button class="btn btn-danger btn-sm" onclick="calendar.deleteNote('${dateKey}', ${note.id})">
            <i data-feather="trash-2"></i>
          </button>
        </div>
        <div class="note-content">${note.text}</div>
      </div>
    `,
      )
      .join("")

    // Clear form
    document.getElementById("noteText").value = ""
    document.getElementById("noteType").value = "note"
    document.getElementById("noteTime").value = ""

    sidebar.classList.add("open")
    sidebar.dataset.dateKey = dateKey

    // Re-initialize feather icons
    if (typeof window.feather !== "undefined") {
      window.feather.replace()
    }
  }

  closeSidebar() {
    const sidebar = document.getElementById("notesSidebar")
    if (sidebar) {
      sidebar.classList.remove("open")
    }
  }

  saveQuickNote() {
    const sidebar = document.getElementById("notesSidebar")
    const dateKey = sidebar?.dataset.dateKey
    const text = document.getElementById("noteText")?.value.trim()
    const type = document.getElementById("noteType")?.value
    const time = document.getElementById("noteTime")?.value

    if (!dateKey || !text) {
      window.alert("Vui lòng nhập nội dung ghi chú")
      return
    }

    this.addNote(dateKey, { text, type, time })
    this.showSidebar(dateKey) // Refresh sidebar
    this.renderCalendar() // Refresh calendar

    window.alert("Đã lưu ghi chú")
  }

  showNoteModal() {
    const modal = document.getElementById("noteModal")
    const dateInput = document.getElementById("modalNoteDate")

    if (modal) {
      // Set default date to today or selected date
      const defaultDate = this.selectedDate || new Date()
      if (dateInput) {
        dateInput.value = defaultDate.toISOString().split("T")[0]
      }

      modal.classList.add("show")
    }
  }

  hideNoteModal() {
    const modal = document.getElementById("noteModal")
    if (modal) {
      modal.classList.remove("show")
      document.getElementById("noteForm")?.reset()
    }
  }

  handleNoteSubmit(e) {
    e.preventDefault()

    const formData = new FormData(e.target)
    const date = formData.get("modalNoteDate")
    const time = formData.get("modalNoteTime")
    const type = formData.get("modalNoteType")
    const text = formData.get("modalNoteText")?.trim()

    if (!date || !text) {
      window.alert("Vui lòng nhập đầy đủ thông tin")
      return
    }

    const dateKey = this.getDateKey(new Date(date))
    this.addNote(dateKey, { text, type, time })

    this.hideNoteModal()
    this.renderCalendar()
    window.alert("Đã thêm ghi chú")
  }

  addNote(dateKey, noteData) {
    if (!this.notes[dateKey]) {
      this.notes[dateKey] = []
    }

    const note = {
      id: Date.now(),
      text: noteData.text,
      type: noteData.type || "note",
      time: noteData.time || "",
      createdAt: new Date().toISOString(),
    }

    this.notes[dateKey].push(note)
    this.saveNotes()
  }

  deleteNote(dateKey, noteId) {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) {
      return
    }

    if (this.notes[dateKey]) {
      this.notes[dateKey] = this.notes[dateKey].filter((note) => note.id !== noteId)

      if (this.notes[dateKey].length === 0) {
        delete this.notes[dateKey]
      }

      this.saveNotes()
      this.renderCalendar()

      // Refresh sidebar if open
      const sidebar = document.getElementById("notesSidebar")
      if (sidebar && sidebar.classList.contains("open")) {
        this.showSidebar(dateKey)
      }

      window.alert("Đã xóa ghi chú")
    }
  }

  saveNotes() {
    Storage.set("vsm_calendar_notes", this.notes)
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1)
    this.updateCurrentMonth()
    this.renderCalendar()
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1)
    this.updateCurrentMonth()
    this.renderCalendar()
  }

  goToToday() {
    this.currentDate = new Date()
    this.updateCurrentMonth()
    this.renderCalendar()
  }

  updateCurrentMonth() {
    const monthElement = document.getElementById("currentMonth")
    if (monthElement) {
      const options = { year: "numeric", month: "long" }
      monthElement.textContent = this.currentDate.toLocaleDateString("vi-VN", options)
    }
  }

  getDateKey(date) {
    return date.toISOString().split("T")[0]
  }

  getNoteTypeLabel(type) {
    const labels = {
      note: "Ghi chú",
      reminder: "Nhắc nhở",
      deadline: "Deadline",
    }
    return labels[type] || "Ghi chú"
  }

  formatDate(date, format) {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  truncate(text, maxLength) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "..."
    }
    return text
  }
}

// Make calendar globally available
window.CalendarManager = CalendarManager
