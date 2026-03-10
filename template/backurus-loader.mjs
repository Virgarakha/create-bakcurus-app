export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve)
  } catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')
    const hasKnownExtension = /\.[a-z0-9]+$/i.test(specifier)
    if (!isRelative || hasKnownExtension) throw error
    return defaultResolve(`${specifier}.js`, context, defaultResolve)
  }
}
