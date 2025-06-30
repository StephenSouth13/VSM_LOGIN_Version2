// Utility functions for VSM CMS

window.Utils = {
  // Storage utilities
  Storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (error) {
        console.error("Storage set error:", error)
        return false
      }
    },

    get(key) {
      try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error("Storage get error:", error)
        return null
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key)
        return true
      } catch (error) {
        console.error("Storage remove error:", error)
        return false
      }
    },

    clear() {
      try {
        localStorage.clear()
        return true
      } catch (error) {
        console.error("Storage clear error:", error)
        return false
      }
    },
  },

  // Date utilities
  Date: {
    format(date, format = "dd/mm/yyyy") {
      if (!date) return ""

      const d = new Date(date)
      if (isNaN(d.getTime())) return ""

      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, "0")
      const minutes = String(d.getMinutes()).padStart(2, "0")

      switch (format) {
        case "dd/mm/yyyy":
          return `${day}/${month}/${year}`
        case "mm/dd/yyyy":
          return `${month}/${day}/${year}`
        case "yyyy-mm-dd":
          return `${year}-${month}-${day}`
        case "dd/mm/yyyy hh:mm":
          return `${day}/${month}/${year} ${hours}:${minutes}`
        case "relative":
          return this.getRelativeTime(d)
        default:
          return d.toLocaleDateString("vi-VN")
      }
    },

    getRelativeTime(date) {
      const now = new Date()
      const diff = now - new Date(date)
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (days > 0) return `${days} ngày trước`
      if (hours > 0) return `${hours} giờ trước`
      if (minutes > 0) return `${minutes} phút trước`
      return "Vừa xong"
    },

    isToday(date) {
      const today = new Date()
      const checkDate = new Date(date)
      return (
        checkDate.getDate() === today.getDate() &&
        checkDate.getMonth() === today.getMonth() &&
        checkDate.getFullYear() === today.getFullYear()
      )
    },
  },

  // String utilities
  String: {
    truncate(str, length = 100, suffix = "...") {
      if (!str || str.length <= length) return str
      return str.substring(0, length) + suffix
    },

    slugify(str) {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    },

    capitalize(str) {
      if (!str) return ""
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    },

    removeVietnameseAccents(str) {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
    },
  },

  // Validation utilities
  Validation: {
    email(email) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return regex.test(email)
    },

    phone(phone) {
      const regex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/
      return regex.test(phone.replace(/\s/g, ""))
    },

    url(url) {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    },

    password(password, minLength = 6) {
      return password && password.length >= minLength
    },
  },

  // File utilities
  File: {
    formatSize(bytes) {
      if (bytes === 0) return "0 Bytes"
      const k = 1024
      const sizes = ["Bytes", "KB", "MB", "GB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    },

    getExtension(filename) {
      return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
    },

    isImage(filename) {
      const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
      const ext = this.getExtension(filename).toLowerCase()
      return imageExtensions.includes(ext)
    },

    readAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
  },

  // DOM utilities
  DOM: {
    createElement(tag, attributes = {}, children = []) {
      const element = document.createElement(tag)

      Object.entries(attributes).forEach(([key, value]) => {
        if (key === "className") {
          element.className = value
        } else if (key === "innerHTML") {
          element.innerHTML = value
        } else {
          element.setAttribute(key, value)
        }
      })

      children.forEach((child) => {
        if (typeof child === "string") {
          element.appendChild(document.createTextNode(child))
        } else {
          element.appendChild(child)
        }
      })

      return element
    },

    show(element) {
      if (element) element.style.display = "block"
    },

    hide(element) {
      if (element) element.style.display = "none"
    },

    toggle(element) {
      if (element) {
        element.style.display = element.style.display === "none" ? "block" : "none"
      }
    },
  },

  // Toast notifications
  Toast: {
    show(message, type = "info", duration = 5000) {
      // Remove existing toasts
      const existing = document.querySelectorAll(".toast-notification")
      existing.forEach((toast) => toast.remove())

      const toast = document.createElement("div")
      toast.className = `toast-notification toast-${type}`

      const colors = {
        error: { bg: "#fee", color: "#c53030", border: "#feb2b2" },
        success: { bg: "#f0fff4", color: "#38a169", border: "#9ae6b4" },
        warning: { bg: "#fffbeb", color: "#d69e2e", border: "#fbd38d" },
        info: { bg: "#ebf8ff", color: "#3182ce", border: "#90cdf4" },
      }

      const style = colors[type] || colors.info
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${style.bg};
        color: ${style.color};
        border: 1px solid ${style.border};
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease-out;
      `
      toast.textContent = message

      document.body.appendChild(toast)

      // Auto remove
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.animation = "slideOutRight 0.3s ease-in"
          setTimeout(() => toast.remove(), 300)
        }
      }, duration)

      return toast
    },

    error(message, duration) {
      return this.show(message, "error", duration)
    },

    success(message, duration) {
      return this.show(message, "success", duration)
    },

    warning(message, duration) {
      return this.show(message, "warning", duration)
    },

    info(message, duration) {
      return this.show(message, "info", duration)
    },
  },

  // Debounce utility
  debounce(func, wait, immediate) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        timeout = null
        if (!immediate) func(...args)
      }
      const callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) func(...args)
    }
  },

  // Throttle utility
  throttle(func, limit) {
    let inThrottle
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  },

  // Generate unique ID
  generateId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      this.Toast.success("Đã sao chép vào clipboard")
      return true
    } catch (error) {
      console.error("Copy failed:", error)
      this.Toast.error("Không thể sao chép")
      return false
    }
  },

  // Format number
  formatNumber(num, locale = "vi-VN") {
    return new Intl.NumberFormat(locale).format(num)
  },

  // Format currency
  formatCurrency(amount, currency = "VND", locale = "vi-VN") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(amount)
  },
}

// Add CSS for toast animations
const toastStyles = document.createElement("style")
toastStyles.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
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
document.head.appendChild(toastStyles)
