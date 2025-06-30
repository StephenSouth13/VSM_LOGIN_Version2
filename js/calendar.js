// Enhanced Calendar functionality for VSM CMS

document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!window.Auth.requireAuth()) {
    return
  }

  // Initialize calendar
  initCalendar()
  setupEventListeners()

  // Initialize theme
  if (window.Theme) {
    window.Theme.init()
  }

  // Initialize auth UI
  if (window.Auth.isAuthenticated) {
    window.Auth.updateUI()
  }

  // Initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
})

let currentDate = new Date()
let selectedDate = null
let currentView = "month"
let events = JSON.parse(localStorage.getItem("vsm_calendar_events") || "[]")
let currentEventId = null

function initCalendar() {
  updateCurrentMonth()
  renderCurrentView()
  renderMiniCalendar()
  renderUpcomingEvents()
}

function setupEventListeners() {
  // Navigation
  document.getElementById("prevMonth")?.addEventListener("click", () => {
    if (currentView === "month") {
      currentDate.setMonth(currentDate.getMonth() - 1)
    } else if (currentView === "week") {
      currentDate.setDate(currentDate.getDate() - 7)
    } else if (currentView === "day") {
      currentDate.setDate(currentDate.getDate() - 1)
    }
    updateCurrentMonth()
    renderCurrentView()
  })

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    if (currentView === "month") {
      currentDate.setMonth(currentDate.getMonth() + 1)
    } else if (currentView === "week") {
      currentDate.setDate(currentDate.getDate() + 7)
    } else if (currentView === "day") {
      currentDate.setDate(currentDate.getDate() + 1)
    }
    updateCurrentMonth()
    renderCurrentView()
  })

  document.getElementById("todayBtn")?.addEventListener("click", () => {
    currentDate = new Date()
    updateCurrentMonth()
    renderCurrentView()
  })

  // View switching
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      currentView = e.target.dataset.view
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"))
      e.target.classList.add("active")
      renderCurrentView()
    })
  })

  // Create event
  document.getElementById("createEventBtn")?.addEventListener("click", () => {
    showEventModal()
  })

  // Event form
  document.getElementById("eventForm")?.addEventListener("submit", handleEventSubmit)
  document.getElementById("quickEventForm")?.addEventListener("submit", handleQuickEventSubmit)

  // Modal controls
  document.getElementById("closeEventModal")?.addEventListener("click", hideEventModal)
  document.getElementById("cancelEvent")?.addEventListener("click", hideEventModal)
  document.getElementById("deleteEvent")?.addEventListener("click", deleteCurrentEvent)

  document.getElementById("closeQuickEventModal")?.addEventListener("click", hideQuickEventModal)
  document.getElementById("cancelQuickEvent")?.addEventListener("click", hideQuickEventModal)

  // All day checkbox
  document.getElementById("eventAllDay")?.addEventListener("change", (e) => {
    const timeInputs = document.querySelectorAll("#eventStartTime, #eventEndTime")
    timeInputs.forEach((input) => {
      input.disabled = e.target.checked
      if (e.target.checked) {
        input.value = ""
      }
    })
  })

  // Reminder checkbox
  document.getElementById("eventReminder")?.addEventListener("change", (e) => {
    const reminderTime = document.getElementById("reminderTime")
    if (reminderTime) {
      reminderTime.style.display = e.target.checked ? "block" : "none"
    }
  })

  // Color presets
  document.querySelectorAll(".color-preset").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const color = e.target.dataset.color
      const colorInput = document.getElementById("eventColor")
      if (colorInput) {
        colorInput.value = color
      }
    })
  })

  // Mini calendar navigation
  document.getElementById("miniPrevMonth")?.addEventListener("click", () => {
    const miniDate = new Date(currentDate)
    miniDate.setMonth(miniDate.getMonth() - 1)
    renderMiniCalendar(miniDate)
  })

  document.getElementById("miniNextMonth")?.addEventListener("click", () => {
    const miniDate = new Date(currentDate)
    miniDate.setMonth(miniDate.getMonth() + 1)
    renderMiniCalendar(miniDate)
  })

  // Agenda filters
  document.getElementById("agendaPeriod")?.addEventListener("change", renderAgendaView)
  document.getElementById("agendaCategory")?.addEventListener("change", renderAgendaView)

  // Click outside modal to close
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      hideEventModal()
      hideQuickEventModal()
    }
  })

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideEventModal()
      hideQuickEventModal()
    }
    if (e.ctrlKey && e.key === "n") {
      e.preventDefault()
      showEventModal()
    }
  })
}

function updateCurrentMonth() {
  const monthElement = document.getElementById("currentMonth")
  if (monthElement) {
    const options = { year: "numeric", month: "long" }
    monthElement.textContent = currentDate.toLocaleDateString("vi-VN", options)
  }

  const miniMonthElement = document.getElementById("miniCurrentMonth")
  if (miniMonthElement) {
    const options = { month: "long" }
    miniMonthElement.textContent = currentDate.toLocaleDateString("vi-VN", options)
  }
}

function renderCurrentView() {
  // Hide all views
  document.querySelectorAll(".calendar-view").forEach((view) => {
    view.style.display = "none"
  })

  // Show current view
  const currentViewElement = document.getElementById(currentView + "View")
  if (currentViewElement) {
    currentViewElement.style.display = "block"
  }

  // Render the appropriate view
  switch (currentView) {
    case "month":
      renderMonthView()
      break
    case "week":
      renderWeekView()
      break
    case "day":
      renderDayView()
      break
    case "agenda":
      renderAgendaView()
      break
  }
}

function renderMonthView() {
  const calendarGrid = document.getElementById("calendarGrid")
  if (!calendarGrid) return

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
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
        isCurrentMonth = true

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
      } else {
        // Next month days
        dayNumber = nextMonthDay
        cellDate = new Date(year, month + 1, dayNumber)
        nextMonthDay++
        isCurrentMonth = false
      }

      const dateKey = getDateKey(cellDate)
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.startDate)
        return getDateKey(eventDate) === dateKey
      })

      const isToday = isDateToday(cellDate)
      const isSelected = selectedDate && cellDate.toDateString() === selectedDate.toDateString()

      const classes = ["calendar-day"]
      if (!isCurrentMonth) classes.push("other-month")
      if (isToday) classes.push("today")
      if (isSelected) classes.push("selected")

      html += `
        <div class="${classes.join(" ")}" onclick="selectDate('${dateKey}')">
          <div class="day-number">${dayNumber}</div>
          <div class="day-events">
            ${dayEvents
              .slice(0, 3)
              .map(
                (event) => `
              <div class="event-item ${event.category}" onclick="editEvent(${event.id}); event.stopPropagation();" title="${event.title}">
                ${event.allDay ? "" : formatTime(event.startTime) + " "}${event.title}
              </div>
            `,
              )
              .join("")}
            ${dayEvents.length > 3 ? `<div class="more-events">+${dayEvents.length - 3} khác</div>` : ""}
          </div>
        </div>
      `
    }
  }

  calendarGrid.innerHTML = html
}

function renderWeekView() {
  const weekDays = document.getElementById("weekDays")
  const timeSlots = document.getElementById("timeSlots")
  const weekEvents = document.getElementById("weekEvents")

  if (!weekDays || !timeSlots || !weekEvents) return

  // Get week start (Sunday)
  const weekStart = new Date(currentDate)
  weekStart.setDate(currentDate.getDate() - currentDate.getDay())

  // Render week days header
  let weekDaysHtml = ""
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    const isToday = isDateToday(day)

    weekDaysHtml += `
      <div class="week-day ${isToday ? "today" : ""}">
        <div class="week-day-name">${getDayName(day.getDay())}</div>
        <div class="week-day-number">${day.getDate()}</div>
      </div>
    `
  }
  weekDays.innerHTML = weekDaysHtml

  // Render time slots
  let timeSlotsHtml = ""
  for (let hour = 0; hour < 24; hour++) {
    timeSlotsHtml += `
      <div class="time-slot">
        ${hour.toString().padStart(2, "0")}:00
      </div>
    `
  }
  timeSlots.innerHTML = timeSlotsHtml

  // Render week events
  let weekEventsHtml = ""
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    const dateKey = getDateKey(day)
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate)
      return getDateKey(eventDate) === dateKey
    })

    dayEvents.forEach((event) => {
      if (!event.allDay && event.startTime) {
        const startHour = Number.parseInt(event.startTime.split(":")[0])
        const startMinute = Number.parseInt(event.startTime.split(":")[1])
        const duration = event.endTime
          ? (Number.parseInt(event.endTime.split(":")[0]) - startHour) * 60 +
            (Number.parseInt(event.endTime.split(":")[1]) - startMinute)
          : 60

        weekEventsHtml += `
          <div class="week-event ${event.category}" 
               style="left: ${(i / 7) * 100}%; top: ${startHour * 60 + startMinute}px; height: ${duration}px; width: ${100 / 7}%;"
               onclick="editEvent(${event.id})">
            <strong>${event.title}</strong>
            ${event.location ? `<br><small>${event.location}</small>` : ""}
          </div>
        `
      }
    })
  }
  weekEvents.innerHTML = weekEventsHtml
}

function renderDayView() {
  const selectedDayTitle = document.getElementById("selectedDayTitle")
  const dayTimeline = document.getElementById("dayTimeline")

  if (!selectedDayTitle || !dayTimeline) return

  selectedDayTitle.textContent = currentDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const dateKey = getDateKey(currentDate)
  const dayEvents = events.filter((event) => {
    const eventDate = new Date(event.startDate)
    return getDateKey(eventDate) === dateKey
  })

  let timelineHtml = ""
  for (let hour = 0; hour < 24; hour++) {
    const hourEvents = dayEvents.filter((event) => {
      if (event.allDay) return hour === 0
      if (!event.startTime) return false
      return Number.parseInt(event.startTime.split(":")[0]) === hour
    })

    timelineHtml += `
      <div class="timeline-hour">
        <div class="timeline-time">
          ${hour.toString().padStart(2, "0")}:00
        </div>
        <div class="timeline-content">
          ${hourEvents
            .map(
              (event) => `
            <div class="event-item ${event.category}" onclick="editEvent(${event.id})">
              <strong>${event.title}</strong>
              ${event.location ? `<br><small>${event.location}</small>` : ""}
              ${event.description ? `<br><small>${event.description}</small>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `
  }
  dayTimeline.innerHTML = timelineHtml
}

function renderAgendaView() {
  const agendaList = document.getElementById("agendaList")
  if (!agendaList) return

  const period = document.getElementById("agendaPeriod")?.value || "week"
  const category = document.getElementById("agendaCategory")?.value || ""

  let startDate, endDate
  const today = new Date()

  switch (period) {
    case "week":
      startDate = new Date(today)
      startDate.setDate(today.getDate() - today.getDay())
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      break
    case "month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      break
    case "quarter":
      const quarter = Math.floor(today.getMonth() / 3)
      startDate = new Date(today.getFullYear(), quarter * 3, 1)
      endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0)
      break
  }

  const filteredEvents = events
    .filter((event) => {
      const eventDate = new Date(event.startDate)
      const matchesDate = eventDate >= startDate && eventDate <= endDate
      const matchesCategory = !category || event.category === category
      return matchesDate && matchesCategory
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))

  if (filteredEvents.length === 0) {
    agendaList.innerHTML = `
      <div class="empty-state">
        <i data-feather="calendar"></i>
        <h3>Không có sự kiện nào</h3>
        <p>Không có sự kiện nào trong khoảng thời gian đã chọn</p>
      </div>
    `
    return
  }

  let currentDateStr = ""
  let html = ""

  filteredEvents.forEach((event) => {
    const eventDate = new Date(event.startDate)
    const dateStr = eventDate.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    if (dateStr !== currentDateStr) {
      html += `<div class="agenda-date">${dateStr}</div>`
      currentDateStr = dateStr
    }

    html += `
      <div class="agenda-event" onclick="editEvent(${event.id})">
        <div class="agenda-category ${event.category}"></div>
        <div class="agenda-time">
          ${event.allDay ? "Cả ngày" : event.startTime || "Không xác định"}
        </div>
        <div class="agenda-details">
          <div class="agenda-title">${event.title}</div>
          ${event.location ? `<div class="agenda-location">${event.location}</div>` : ""}
        </div>
      </div>
    `
  })

  agendaList.innerHTML = html

  // Re-initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
}

function renderMiniCalendar(date = currentDate) {
  const miniCalendarGrid = document.getElementById("miniCalendarGrid")
  if (!miniCalendarGrid) return

  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  let html = ""
  let dayCount = 1

  // Generate mini calendar
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const cellIndex = week * 7 + day
      let dayNumber,
        cellDate,
        isCurrentMonth = true

      if (cellIndex < startingDayOfWeek) {
        const prevMonth = new Date(year, month, 0)
        dayNumber = prevMonth.getDate() - startingDayOfWeek + cellIndex + 1
        cellDate = new Date(year, month - 1, dayNumber)
        isCurrentMonth = false
      } else if (dayCount <= daysInMonth) {
        dayNumber = dayCount
        cellDate = new Date(year, month, dayNumber)
        dayCount++
      } else {
        dayNumber = dayCount - daysInMonth
        cellDate = new Date(year, month + 1, dayNumber)
        dayCount++
        isCurrentMonth = false
      }

      const isToday = isDateToday(cellDate)
      const isSelected = selectedDate && cellDate.toDateString() === selectedDate.toDateString()

      const classes = ["mini-day"]
      if (!isCurrentMonth) classes.push("other-month")
      if (isToday) classes.push("today")
      if (isSelected) classes.push("selected")

      html += `
        <div class="${classes.join(" ")}" onclick="selectMiniDate('${getDateKey(cellDate)}')">
          ${dayNumber}
        </div>
      `
    }
  }

  miniCalendarGrid.innerHTML = html
}

function renderUpcomingEvents() {
  const upcomingEventsList = document.getElementById("upcomingEventsList")
  if (!upcomingEventsList) return

  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event.startDate)
      return eventDate >= today && eventDate <= nextWeek
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 5)

  if (upcomingEvents.length === 0) {
    upcomingEventsList.innerHTML = `
      <div class="text-muted" style="text-align: center; padding: 20px;">
        Không có sự kiện sắp tới
      </div>
    `
    return
  }

  const html = upcomingEvents
    .map((event) => {
      const eventDate = new Date(event.startDate)
      const timeStr = event.allDay ? "Cả ngày" : event.startTime || ""

      return `
      <div class="upcoming-event" onclick="editEvent(${event.id})">
        <div class="upcoming-event-color ${event.category}"></div>
        <div class="upcoming-event-details">
          <div class="upcoming-event-title">${event.title}</div>
          <div class="upcoming-event-time">
            ${eventDate.toLocaleDateString("vi-VN", { month: "short", day: "numeric" })} ${timeStr}
          </div>
        </div>
      </div>
    `
    })
    .join("")

  upcomingEventsList.innerHTML = html
}

function selectDate(dateKey) {
  selectedDate = new Date(dateKey)
  currentDate = new Date(selectedDate)
  renderCurrentView()
  renderMiniCalendar()

  // Show quick event modal for easy event creation
  showQuickEventModal(dateKey)
}

function selectMiniDate(dateKey) {
  selectedDate = new Date(dateKey)
  currentDate = new Date(selectedDate)
  updateCurrentMonth()
  renderCurrentView()
  renderMiniCalendar()
}

function showEventModal(eventId = null) {
  const modal = document.getElementById("eventModal")
  const modalTitle = document.getElementById("eventModalTitle")
  const deleteBtn = document.getElementById("deleteEvent")

  if (!modal) return

  currentEventId = eventId

  if (eventId) {
    const event = events.find((e) => e.id === eventId)
    if (event) {
      modalTitle.textContent = "Chỉnh sửa sự kiện"
      deleteBtn.style.display = "inline-block"
      fillEventForm(event)
    }
  } else {
    modalTitle.textContent = "Tạo sự kiện mới"
    deleteBtn.style.display = "none"
    clearEventForm()

    // Set default date
    if (selectedDate) {
      document.getElementById("eventStartDate").value = getDateKey(selectedDate)
    }
  }

  modal.classList.add("show")
}

function hideEventModal() {
  const modal = document.getElementById("eventModal")
  if (modal) {
    modal.classList.remove("show")
  }
  currentEventId = null
}

function showQuickEventModal(dateKey = null) {
  const modal = document.getElementById("quickEventModal")
  if (!modal) return

  if (dateKey) {
    const date = new Date(dateKey)
    const dateTimeInput = document.getElementById("quickEventDateTime")
    if (dateTimeInput) {
      dateTimeInput.value = date.toISOString().slice(0, 16)
    }
  }

  modal.classList.add("show")

  // Focus title input
  setTimeout(() => {
    const titleInput = document.getElementById("quickEventTitle")
    if (titleInput) titleInput.focus()
  }, 100)
}

function hideQuickEventModal() {
  const modal = document.getElementById("quickEventModal")
  if (modal) {
    modal.classList.remove("show")
  }

  // Clear form
  document.getElementById("quickEventForm")?.reset()
}

function fillEventForm(event) {
  document.getElementById("eventTitle").value = event.title || ""
  document.getElementById("eventStartDate").value = event.startDate || ""
  document.getElementById("eventStartTime").value = event.startTime || ""
  document.getElementById("eventEndDate").value = event.endDate || ""
  document.getElementById("eventEndTime").value = event.endTime || ""
  document.getElementById("eventCategory").value = event.category || "meeting"
  document.getElementById("eventLocation").value = event.location || ""
  document.getElementById("eventDescription").value = event.description || ""
  document.getElementById("eventAllDay").checked = event.allDay || false
  document.getElementById("eventReminder").checked = event.reminder || false
  document.getElementById("eventColor").value = event.color || "#3498db"

  // Handle all day checkbox
  const allDayChecked = event.allDay || false
  const timeInputs = document.querySelectorAll("#eventStartTime, #eventEndTime")
  timeInputs.forEach((input) => {
    input.disabled = allDayChecked
  })

  // Handle reminder
  const reminderTime = document.getElementById("reminderTime")
  if (reminderTime) {
    reminderTime.style.display = event.reminder || false ? "block" : "none"
    reminderTime.value = event.reminderTime || "15"
  }
}

function clearEventForm() {
  document.getElementById("eventForm")?.reset()
  document.getElementById("eventColor").value = "#3498db"

  // Reset disabled states
  const timeInputs = document.querySelectorAll("#eventStartTime, #eventEndTime")
  timeInputs.forEach((input) => {
    input.disabled = false
  })

  const reminderTime = document.getElementById("reminderTime")
  if (reminderTime) {
    reminderTime.style.display = "none"
  }
}

function handleEventSubmit(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const eventData = {
    title: formData.get("eventTitle") || document.getElementById("eventTitle").value,
    startDate: document.getElementById("eventStartDate").value,
    startTime: document.getElementById("eventStartTime").value,
    endDate: document.getElementById("eventEndDate").value,
    endTime: document.getElementById("eventEndTime").value,
    category: document.getElementById("eventCategory").value,
    location: document.getElementById("eventLocation").value,
    description: document.getElementById("eventDescription").value,
    allDay: document.getElementById("eventAllDay").checked,
    reminder: document.getElementById("eventReminder").checked,
    reminderTime: document.getElementById("reminderTime").value,
    color: document.getElementById("eventColor").value,
  }

  // Validation
  if (!eventData.title || !eventData.startDate) {
    alert("Vui lòng nh ập tiêu đề và ngày bắt đầu")
    return
  }

  if (currentEventId) {
    // Update existing event
    const eventIndex = events.findIndex((e) => e.id === currentEventId)
    if (eventIndex !== -1) {
      events[eventIndex] = { ...events[eventIndex], ...eventData }
    }
  } else {
    // Create new event
    eventData.id = Date.now()
    events.push(eventData)
  }

  saveEvents()
  renderCurrentView()
  renderMiniCalendar()
  renderUpcomingEvents()
  hideEventModal()

  // Show success message
  showNotification(currentEventId ? "Sự kiện đã được cập nhật" : "Sự kiện đã được tạo")
}

function handleQuickEventSubmit(e) {
  e.preventDefault()

  const title = document.getElementById("quickEventTitle").value
  const dateTime = document.getElementById("quickEventDateTime").value

  if (!title || !dateTime) {
    alert("Vui lòng nhập đầy đủ thông tin")
    return
  }

  const date = new Date(dateTime)
  const eventData = {
    id: Date.now(),
    title: title,
    startDate: date.toISOString().split("T")[0],
    startTime: date.toTimeString().slice(0, 5),
    endDate: "",
    endTime: "",
    category: "event",
    location: "",
    description: "",
    allDay: false,
    reminder: false,
    reminderTime: "15",
    color: "#27ae60",
  }

  events.push(eventData)
  saveEvents()
  renderCurrentView()
  renderMiniCalendar()
  renderUpcomingEvents()
  hideQuickEventModal()

  showNotification("Sự kiện đã được tạo")
}

function editEvent(eventId) {
  showEventModal(eventId)
}

function deleteCurrentEvent() {
  if (!currentEventId) return

  if (confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
    events = events.filter((e) => e.id !== currentEventId)
    saveEvents()
    renderCurrentView()
    renderMiniCalendar()
    renderUpcomingEvents()
    hideEventModal()

    showNotification("Sự kiện đã được xóa")
  }
}

function saveEvents() {
  localStorage.setItem("vsm_calendar_events", JSON.stringify(events))
}

function getDateKey(date) {
  return date.toISOString().split("T")[0]
}

function isDateToday(date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function getDayName(dayIndex) {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
  return days[dayIndex]
}

function formatTime(timeString) {
  if (!timeString) return ""
  return timeString.slice(0, 5)
}

function showNotification(message) {
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
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}

// Add CSS animations
const style = document.createElement("style")
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
  }
  
  .empty-state i {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .empty-state p {
    margin: 0;
    font-size: 14px;
  }
`
document.head.appendChild(style)
