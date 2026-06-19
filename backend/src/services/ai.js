// AI Expense Auto-Categorization
// Simple keyword-based categorization (no external API needed)

const CATEGORY_RULES = [
  { category: 'Rent', keywords: ['rent', 'lease', 'office space', 'coworking', 'workspace'] },
  { category: 'Utilities', keywords: ['electricity', 'power', 'water', 'gas', 'internet', 'broadband', 'wifi', 'telephone', 'mobile', 'recharge'] },
  { category: 'Travel', keywords: ['travel', 'flight', 'train', 'bus', 'taxi', 'uber', 'ola', 'fuel', 'petrol', 'diesel', 'parking', 'toll'] },
  { category: 'Office Supplies', keywords: ['office', 'stationery', 'paper', 'printer', 'ink', 'toner', 'pen', 'stapler', 'folder'] },
  { category: 'Professional Services', keywords: ['consultant', 'ca', 'chartered', 'legal', 'lawyer', 'audit', 'accounting', 'subscription', 'saas'] },
  { category: 'Marketing', keywords: ['marketing', 'advertising', 'ads', 'google ads', 'facebook', 'instagram', 'promotion', 'banner', 'brochure'] },
  { category: 'Software', keywords: ['software', 'saas', 'tool', 'license', 'subscription', 'cloud', 'hosting', 'domain', 'ssl'] },
  { category: 'Food & Entertainment', keywords: ['food', 'lunch', 'dinner', 'breakfast', 'cafe', 'restaurant', 'coffee', 'tea', 'snack', 'team lunch', 'client dinner', 'party'] },
  { category: 'Healthcare', keywords: ['medical', 'health', 'doctor', 'hospital', 'pharmacy', 'medicine', 'insurance', 'health insurance'] },
  { category: 'Education', keywords: ['course', 'training', 'workshop', 'seminar', 'book', 'learning', 'udemy', 'coursera'] },
  { category: 'Telecom', keywords: ['airtel', 'jio', 'vi', 'bsnl', 'sim', 'postpaid', 'prepaid'] },
  { category: 'Miscellaneous', keywords: [] },
];

function categorizeExpense(description) {
  if (!description) return 'Miscellaneous';

  const desc = description.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => desc.includes(kw))) {
      return rule.category;
    }
  }

  return 'Miscellaneous';
}

function suggestCategories(description) {
  const results = [];
  const desc = description.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => desc.includes(kw))) {
      results.push({
        category: rule.category,
        confidence: rule.keywords.filter(kw => desc.includes(kw)).length / rule.keywords.length,
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

module.exports = { categorizeExpense, suggestCategories };
