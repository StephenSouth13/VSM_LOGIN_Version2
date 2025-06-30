// Login page functionality

document.addEventListener("DOMContentLoaded", () => {
  initLoginPage()
  setupEventListeners()

  // Initialize feather icons
  if (typeof window.feather !== "undefined") {
    window.feather.replace()
  }
})

function initLoginPage() {
  // Check if user is already logged in
  if (window.Auth && window.Auth.isAuthenticated) {
    window.location.href = "index.html"
    return
  }

  // Auto-fill remembered credentials
  const rememberedEmail = localStorage.getItem("vsm_remembered_email")
  if (rememberedEmail) {
    document.getElementById("email").value = rememberedEmail
    document.getElementById("remember").checked = true
  }
}

function setupEventListeners() {
  // Login form submission
  const loginForm = document.getElementById("loginForm")
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }

  // Demo account buttons
  const demoButtons = document.querySelectorAll(".demo-btn")
  demoButtons.forEach((btn) => {
    btn.addEventListener("click", handleDemoLogin)
  })

  // Password toggle
  const togglePassword = document.getElementById("togglePassword")
  const passwordInput = document.getElementById("password")
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password"
      passwordInput.setAttribute("type", type)

      const icon = togglePassword.querySelector("i")
      if (icon) {
        icon.setAttribute("data-feather", type === "password" ? "eye" : "eye-off")
        window.feather.replace()
      }
    })
  }

  // Real-time validation
  const emailInput = document.getElementById("email")
  const passwordInputField = document.getElementById("password")

  if (emailInput) {
    emailInput.addEventListener("blur", validateEmail)
    emailInput.addEventListener("input", clearEmailError)
  }

  if (passwordInputField) {
    passwordInputField.addEventListener("blur", validatePassword)
    passwordInputField.addEventListener("input", clearPasswordError)
  }
}

async function handleLogin(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const email = formData.get("email").trim()
  const password = formData.get("password")
  const remember = formData.get("remember") === "on"

  // Clear previous errors
  clearAllErrors()

  // Validate form
  if (!validateForm(email, password)) {
    return
  }

  // Show loading state
  showLoadingState()

  try {
    // Attempt login
    const result = await window.Auth.login(email, password, remember)

    if (result.success) {
      // Handle remember me
      if (remember) {
        localStorage.setItem("vsm_remembered_email", email)
      } else {
        localStorage.removeItem("vsm_remembered_email")
      }

      // Show success message
      showMessage("Đăng nhập thành công! Đang chuyển hướng...", "success")

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = "index.html"
      }, 1500)
    } else {
      showMessage(result.message || "Đăng nhập thất bại", "error")
    }
  } catch (error) {
    console.error("Login error:", error)
    showMessage("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.", "error")
  } finally {
    hideLoadingState()
  }
}

function handleDemoLogin(e) {
  const email = e.currentTarget.getAttribute("data-email")
  const password = e.currentTarget.getAttribute("data-password")

  if (email && password) {
    document.getElementById("email").value = email
    document.getElementById("password").value = password

    // Auto-submit the form
    const loginForm = document.getElementById("loginForm")
    if (loginForm) {
      loginForm.dispatchEvent(new Event("submit"))
    }
  }
}

function validateForm(email, password) {
  let isValid = true

  // Validate email
  if (!email) {
    showFieldError("emailError", "Email là bắt buộc")
    isValid = false
  } else if (!isValidEmail(email)) {
    showFieldError("emailError", "Email không hợp lệ")
    isValid = false
  }

  // Validate password
  if (!password) {
    showFieldError("passwordError", "Mật khẩu là bắt buộc")
    isValid = false
  } else if (password.length < 6) {
    showFieldError("passwordError", "Mật khẩu phải có ít nhất 6 ký tự")
    isValid = false
  }

  return isValid
}

function validateEmail() {
  const email = document.getElementById("email").value.trim()
  if (email && !isValidEmail(email)) {
    showFieldError("emailError", "Email không hợp lệ")
    return false
  }
  return true
}

function validatePassword() {
  const password = document.getElementById("password").value
  if (password && password.length < 6) {
    showFieldError("passwordError", "Mật khẩu phải có ít nhất 6 ký tự")
    return false
  }
  return true
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

function clearEmailError() {
  const errorElement = document.getElementById("emailError")
  if (errorElement) {
    errorElement.classList.remove("show")
  }
}

function clearPasswordError() {
  const errorElement = document.getElementById("passwordError")
  if (errorElement) {
    errorElement.classList.remove("show")
  }
}

function clearAllErrors() {
  const errorElements = document.querySelectorAll(".form-error")
  errorElements.forEach((element) => {
    element.classList.remove("show")
  })

  const messageElement = document.getElementById("formMessage")
  if (messageElement) {
    messageElement.classList.remove("show", "error", "success")
  }
}

function showLoadingState() {
  const loginBtn = document.getElementById("loginBtn")
  const btnText = loginBtn.querySelector(".btn-text")
  const btnLoader = loginBtn.querySelector(".btn-loader")

  if (btnText && btnLoader) {
    btnText.style.display = "none"
    btnLoader.style.display = "flex"
  }

  loginBtn.disabled = true
}

function hideLoadingState() {
  const loginBtn = document.getElementById("loginBtn")
  const btnText = loginBtn.querySelector(".btn-text")
  const btnLoader = loginBtn.querySelector(".btn-loader")

  if (btnText && btnLoader) {
    btnText.style.display = "block"
    btnLoader.style.display = "none"
  }

  loginBtn.disabled = false
}

function showMessage(message, type = "error") {
  const messageElement = document.getElementById("formMessage")
  if (messageElement) {
    messageElement.textContent = message
    messageElement.className = `form-message show ${type}`
  }
}

// Auto-hide messages after 5 seconds
function autoHideMessage() {
  setTimeout(() => {
    const messageElement = document.getElementById("formMessage")
    if (messageElement && messageElement.classList.contains("show")) {
      messageElement.classList.remove("show")
    }
  }, 5000)
}

// Call autoHideMessage when showing messages
const originalShowMessage = showMessage
showMessage = (message, type = "error") => {
  originalShowMessage(message, type)
  autoHideMessage()
}
