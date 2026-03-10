import { initI18n, setLanguage, t, getCurrentLanguage } from './i18n.js'

const SEARCH_INDEX = [
  { page: 'index.html', title: 'nav.introduction', description: 'search.introduction_desc' },
  { page: 'installation.html', title: 'nav.installation', description: 'search.installation_desc' },
  { page: 'quickstart.html', title: 'nav.quickstart', description: 'search.quickstart_desc' },
  { page: 'routing.html', title: 'nav.routing', description: 'search.routing_desc' },
  { page: 'controllers.html', title: 'nav.controllers', description: 'search.controllers_desc' },
  { page: 'models.html', title: 'nav.models', description: 'search.models_desc' },
  { page: 'migrations.html', title: 'nav.migrations', description: 'search.migrations_desc' },
  { page: 'validation.html', title: 'nav.validation', description: 'search.validation_desc' },
  { page: 'authentication.html', title: 'nav.authentication', description: 'search.authentication_desc' },
  { page: 'queue.html', title: 'nav.queue', description: 'search.queue_desc' },
  { page: 'websocket.html', title: 'nav.websocket', description: 'search.websocket_desc' },
  { page: 'plugins.html', title: 'nav.plugins', description: 'search.plugins_desc' },
  { page: 'cli.html', title: 'nav.cli', description: 'search.cli_desc' }
]

function applyHighlighting() {
  if (window.Prism?.highlightAll) {
    window.Prism.highlightAll()
  }
}

function setupCopyButtons() {
  document.querySelectorAll('.copy-button').forEach((button) => {
    if (button.dataset.bound === 'true') return
    button.dataset.bound = 'true'
    button.addEventListener('click', async () => {
      const code = button.closest('.code-block')?.querySelector('code')?.textContent || ''
      await navigator.clipboard.writeText(code)
      const original = button.textContent
      button.textContent = t('ui.copied')
      setTimeout(() => {
        button.textContent = original
      }, 1200)
    })
  })
}

function setupTheme() {
  const stored = localStorage.getItem('docs-theme') || 'light'
  document.documentElement.dataset.theme = stored
  document.querySelectorAll('[data-theme-switch]').forEach((button) => {
    button.classList.toggle('active', button.dataset.themeSwitch === stored)
    button.addEventListener('click', () => {
      const theme = button.dataset.themeSwitch
      localStorage.setItem('docs-theme', theme)
      document.documentElement.dataset.theme = theme
      document.querySelectorAll('[data-theme-switch]').forEach((item) => {
        item.classList.toggle('active', item.dataset.themeSwitch === theme)
      })
    })
  })
}

function setupLanguageSwitcher() {
  document.querySelectorAll('[data-lang-switch]').forEach((button) => {
    button.addEventListener('click', async () => {
      await setLanguage(button.dataset.langSwitch)
      renderSearchResults(document.querySelector('[data-search-input]')?.value || '')
    })
  })
}

function setupSidebar() {
  const sidebar = document.querySelector('.sidebar')
  const toggle = document.querySelector('.mobile-toggle')
  if (!sidebar || !toggle) return
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'))
  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => sidebar.classList.remove('open'))
  })
}

function setupActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html'
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === page)
  })
}

function renderSearchResults(query) {
  const panel = document.querySelector('[data-search-results]')
  if (!panel) return

  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    panel.innerHTML = ''
    panel.classList.remove('active')
    return
  }

  const matches = SEARCH_INDEX.filter((entry) => {
    const title = t(entry.title).toLowerCase()
    const description = t(entry.description).toLowerCase()
    return title.includes(normalized) || description.includes(normalized)
  }).slice(0, 8)

  panel.innerHTML = matches.map((entry) => `
    <a class="search-result" href="${entry.page}">
      <strong>${t(entry.title)}</strong>
      <small>${t(entry.description)}</small>
    </a>
  `).join('') || `<div class="search-result"><strong>${t('search.no_results')}</strong></div>`
  panel.classList.add('active')
}

function setupSearch() {
  const input = document.querySelector('[data-search-input]')
  if (!input) return
  input.addEventListener('input', () => renderSearchResults(input.value))
  document.addEventListener('click', (event) => {
    const panel = document.querySelector('[data-search-results]')
    if (!panel) return
    if (!event.target.closest('.search-panel')) panel.classList.remove('active')
  })
}

function updateGeneratedStrings() {
  document.querySelectorAll('[data-copy-label]').forEach((button) => {
    button.textContent = t('ui.copy_code')
  })

  const metaLanguage = document.querySelector('[data-language-value]')
  if (metaLanguage) metaLanguage.textContent = getCurrentLanguage().toUpperCase()
}

document.addEventListener('i18n:updated', () => {
  updateGeneratedStrings()
  setupActiveNav()
  applyHighlighting()
})

window.addEventListener('DOMContentLoaded', async () => {
  await initI18n()
  setupTheme()
  setupLanguageSwitcher()
  setupSidebar()
  setupActiveNav()
  setupSearch()
  setupCopyButtons()
  updateGeneratedStrings()
  renderSearchResults('')
  applyHighlighting()
})
