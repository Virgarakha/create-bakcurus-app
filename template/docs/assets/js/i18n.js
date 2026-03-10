import { FALLBACK_DICTIONARIES } from './fallback-i18n.js'

const DEFAULT_LANGUAGE = 'en'
const SUPPORTED_LANGUAGES = ['en', 'id']
const DICTIONARIES = new Map()
let currentLanguage = DEFAULT_LANGUAGE

async function loadDictionary(language) {
  if (DICTIONARIES.has(language)) return DICTIONARIES.get(language)
  let dictionary
  try {
    const response = await fetch(`./lang/${language}.json`)
    dictionary = await response.json()
  } catch {
    dictionary = FALLBACK_DICTIONARIES[language] || FALLBACK_DICTIONARIES[DEFAULT_LANGUAGE]
  }
  DICTIONARIES.set(language, dictionary)
  return dictionary
}

function getStoredLanguage() {
  const stored = localStorage.getItem('docs-language')
  return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE
}

function resolveKey(dictionary, key) {
  return key.split('.').reduce((value, part) => value?.[part], dictionary)
}

export async function setLanguage(language) {
  currentLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE
  localStorage.setItem('docs-language', currentLanguage)
  const dictionary = await loadDictionary(currentLanguage)
  document.documentElement.lang = currentLanguage

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const translated = resolveKey(dictionary, node.dataset.i18n)
    if (translated !== undefined) node.innerHTML = translated
  })

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const translated = resolveKey(dictionary, node.dataset.i18nPlaceholder)
    if (translated !== undefined) node.setAttribute('placeholder', translated)
  })

  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    const translated = resolveKey(dictionary, node.dataset.i18nAria)
    if (translated !== undefined) node.setAttribute('aria-label', translated)
  })

  document.querySelectorAll('[data-lang-switch]').forEach((button) => {
    button.classList.toggle('active', button.dataset.langSwitch === currentLanguage)
  })

  document.dispatchEvent(new CustomEvent('i18n:updated', { detail: { language: currentLanguage, dictionary } }))
}

export function t(key, fallback = key) {
  const dictionary = DICTIONARIES.get(currentLanguage)
  return resolveKey(dictionary, key) ?? fallback
}

export async function initI18n() {
  await setLanguage(getStoredLanguage())
}

export function getCurrentLanguage() {
  return currentLanguage
}

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES }
