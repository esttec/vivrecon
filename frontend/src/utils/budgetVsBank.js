// Every imported bank row should sit in the budget under its shop, in its month.
// Returns the places where they differ: lines added or edited by hand (e.g. "Algsaldo"),
// or bank rows that never reached the budget. That list is why the balance is not the bank's.
const shopKey = d => String(d).replace(/^(Tagastus|Refund): /, '').replace(/\s*\(\d+\)$/, '').trim().toLowerCase()

export function budgetVsBank(txs, budgets) {
  const sums = new Map() // "month|shop" → { month, label, bank, budget }
  const at = (month, label) => {
    const k = month + '|' + shopKey(label)
    if (!sums.has(k)) sums.set(k, { month, label, bank: 0, budget: 0 })
    return sums.get(k)
  }
  const purchases = txs.filter(x => Number(x.amount) < 0)
  for (const x of txs) {
    // A paired refund is booked as "Tagastus: SHOP", so it counts under the purchase's shop.
    const shop = Number(x.amount) > 0 && x.refunded
      ? purchases.find(p => Number(p.amount) === -Number(x.amount) && p.description.length >= 3 &&
          x.description.toLowerCase().includes(p.description.toLowerCase()))?.description
      : null
    at(x.date.slice(0, 7), shop || x.description).bank += Number(x.amount)
  }
  for (const b of budgets) {
    for (const l of b.incomeLines || []) at(b.yearMonth, l.description).budget += Number(l.amount)
    for (const l of b.expenseLines || []) at(b.yearMonth, l.description).budget -= Number(l.amount)
  }
  return [...sums.values()]
    .map(r => ({ ...r, diff: Math.round((r.budget - r.bank) * 100) / 100 }))
    .filter(r => r.diff !== 0)
    .sort((a, b) => a.month.localeCompare(b.month) || a.label.localeCompare(b.label))
}
