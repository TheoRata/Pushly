/**
 * Fuzzy search composable for Salesforce metadata components.
 * Pure ES module — no Vue dependencies.
 */

/**
 * Split a PascalCase/camelCase string into lowercase words.
 * "CaseManager" → ["case", "manager"]
 * "ApexClass"   → ["apex", "class"]
 */
function extractCamelWords(original) {
  return original
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Score how well a single query word matches a field value.
 * Returns 0 if no match, higher = better match.
 *
 * @param {string} word   Lowercased query word
 * @param {string} field  Lowercased field value
 * @param {string} orig   Original (mixed-case) field for camelCase analysis
 * @returns {number}
 */
function scoreWord(word, field, orig) {
  if (!word || !field) return 0

  // Exact full-field match
  if (field === word) return 100

  // Exact prefix of full field
  if (field.startsWith(word)) return 80

  const camelWords = extractCamelWords(orig)

  // Exact match on a camelCase segment ("manager" → "Manager")
  // Prefix match on a camelCase segment ("cas" → "Case")
  let bestCamel = 0
  for (const cw of camelWords) {
    if (cw === word) { bestCamel = 75; break }
    if (cw.startsWith(word) && bestCamel < 60) bestCamel = 60
  }
  if (bestCamel > 0) return bestCamel

  // CamelCase initials abbreviation: each char of word matches the first char of
  // successive camelCase segments in order ("cm" → C·ase M·anager)
  if (word.length >= 2 && word.length <= camelWords.length) {
    let cwIdx = 0
    let wIdx = 0
    while (wIdx < word.length && cwIdx < camelWords.length) {
      if (camelWords[cwIdx][0] === word[wIdx]) wIdx++
      cwIdx++
    }
    if (wIdx === word.length) return 50
  }

  // Substring anywhere in field
  if (field.includes(word)) return 40

  // Scattered subsequence: all chars of word appear in order within field
  // ("csmgr" matches "casemanager")
  let fi = 0
  let wi = 0
  while (fi < field.length && wi < word.length) {
    if (field[fi] === word[wi]) wi++
    fi++
  }
  if (wi === word.length) {
    // Score relative to how dense the match is
    return Math.floor(10 + (word.length / field.length) * 20)
  }

  return 0
}

// ---------------------------------------------------------------------------

/**
 * Build a search index from a categories array.
 * Pre-lowercases all fields to avoid per-keystroke `.toLowerCase()` calls.
 *
 * @param {Array<{name: string, components: Array<{fullName: string, type: string}>}>} categories
 * @returns {Map<string, {lowerName, lowerType, lowerCategory, component, categoryName}>}
 */
export function buildSearchIndex(categories) {
  const index = new Map()
  for (const cat of categories) {
    const lowerCategory = cat.name.toLowerCase()
    for (const component of cat.components) {
      const key = `${component.type}:${component.fullName}`
      index.set(key, {
        lowerName: component.fullName.toLowerCase(),
        lowerType: component.type.toLowerCase(),
        lowerCategory,
        component,
        categoryName: cat.name,
      })
    }
  }
  return index
}

/**
 * Fuzzy-search the index.
 *
 * Multi-word queries: every space-separated word must match at least one field
 * (name, type, or category). Components that satisfy all words are returned
 * sorted by descending score.
 *
 * Returns `null` when query is empty (signals "no active search").
 *
 * @param {Map}         index
 * @param {string}      query
 * @param {string|null} activeCategoryName  When set, restrict to this category.
 * @returns {null | Array<{component, categoryName, score}>}
 */
export function fuzzySearch(index, query, activeCategoryName = null) {
  if (!query || !query.trim()) return null

  const words = query.trim().toLowerCase().split(/\s+/)
  const results = []

  for (const entry of index.values()) {
    if (activeCategoryName && entry.categoryName !== activeCategoryName) continue

    let totalScore = 0
    let allWordsMatched = true

    for (const word of words) {
      // Name carries 3× weight; type and category carry 1× weight
      const nameScore  = scoreWord(word, entry.lowerName,     entry.component.fullName) * 3
      const typeScore  = scoreWord(word, entry.lowerType,     entry.component.type)
      const catScore   = scoreWord(word, entry.lowerCategory, entry.categoryName)

      const best = Math.max(nameScore, typeScore, catScore)
      if (best === 0) { allWordsMatched = false; break }
      totalScore += best
    }

    if (allWordsMatched) {
      results.push({ component: entry.component, categoryName: entry.categoryName, score: totalScore })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

/**
 * Tally match counts per category from a search-results array.
 *
 * @param {Array<{component, categoryName, score}>} searchResults
 * @returns {Map<string, number>}
 */
export function matchCountsByCategory(searchResults) {
  const counts = new Map()
  for (const { categoryName } of searchResults) {
    counts.set(categoryName, (counts.get(categoryName) ?? 0) + 1)
  }
  return counts
}
