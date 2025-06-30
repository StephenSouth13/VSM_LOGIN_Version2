// Fetch utilities for VSM CMS API calls

class FetchManager {
  constructor() {
    this.baseURL = ""
    this.defaultHeaders = {
      "Content-Type": "application/json",
    }
  }

  // Set authorization token
  setAuthToken(token) {
    if (token) {
      this.defaultHeaders["Authorization"] = `Bearer ${token}`
    } else {
      delete this.defaultHeaders["Authorization"]
    }
  }

  // Generic request method
  async request(url, options = {}) {
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    }

    try {
      const response = await fetch(this.baseURL + url, config)

      // Handle different response types
      const contentType = response.headers.get("content-type")
      let data

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return { data, status: response.status, headers: response.headers }
    } catch (error) {
      console.error("Fetch error:", error)
      throw error
    }
  }

  // GET request
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url

    return this.request(fullUrl, { method: "GET" })
  }

  // POST request
  async post(url, data = {}) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // PUT request
  async put(url, data = {}) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // PATCH request
  async patch(url, data = {}) {
    return this.request(url, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  // DELETE request
  async delete(url) {
    return this.request(url, { method: "DELETE" })
  }

  // Upload file
  async upload(url, file, additionalData = {}) {
    const formData = new FormData()
    formData.append("file", file)

    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value)
    })

    const headers = { ...this.defaultHeaders }
    delete headers["Content-Type"] // Let browser set it for FormData

    return this.request(url, {
      method: "POST",
      body: formData,
      headers,
    })
  }

  // Download file
  async download(url, filename) {
    try {
      const response = await fetch(this.baseURL + url, {
        headers: this.defaultHeaders,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename || "download"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(downloadUrl)

      return true
    } catch (error) {
      console.error("Download error:", error)
      throw error
    }
  }
}

// Create global fetch instance
const fetchManager = new FetchManager()

// Export fetch manager
window.Fetch = fetchManager
