// Theme management for VSM CMS

class ThemeManager {
  constructor() {
    this.currentTheme = "light"
    this.init()
  }

  init() {
    // Get saved theme or detect system preference
    const savedTheme = localStorage.getItem("vsm_theme")
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

    this.currentTheme = savedTheme || systemTheme
    this.applyTheme(this.currentTheme)
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Theme toggle button
    const themeToggle = document.getElementById("themeToggle")
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        this.toggleTheme()
      })
    }

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem("vsm_theme")) {
        this.applyTheme(e.matches ? "dark" : "light")
      }
    })
  }

  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light"
    this.applyTheme(newTheme)
    localStorage.setItem("vsm_theme", newTheme)
  }

  applyTheme(theme) {
    this.currentTheme = theme
    document.documentElement.setAttribute("data-theme", theme)

    // Update theme toggle icon
    this.updateThemeIcon(theme)

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }))
  }

  updateThemeIcon(theme) {
    const themeToggle = document.getElementById("themeToggle")
    if (themeToggle) {
      const icon = themeToggle.querySelector("i")
      if (icon) {
        icon.setAttribute("data-feather", theme === "light" ? "moon" : "sun")
        if (typeof window.feather !== "undefined") {
          window.feather.replace()
        }
      }
    }
  }

  getTheme() {
    return this.currentTheme
  }

  setTheme(theme) {
    if (["light", "dark"].includes(theme)) {
      this.applyTheme(theme)
      localStorage.setItem("vsm_theme", theme)
    }
  }
}

// Create global theme instance
const theme = new ThemeManager()

// Export theme
window.Theme = theme
