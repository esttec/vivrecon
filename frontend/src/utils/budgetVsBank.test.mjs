// node src/utils/budgetVsBank.test.mjs
import assert from 'node:assert'
import { budgetVsBank } from './budgetVsBank.js'

const txs = [
  { date: '2026-10-02', description: 'SELVER', amount: -10, refunded: false },
  { date: '2026-10-03', description: 'SELVER', amount: -5, refunded: false },
  { date: '2026-10-09', description: 'SPARTA', amount: 887.9, refunded: false },
  { date: '2026-10-12', description: 'MKK*sportland.ee', amount: -56.98, refunded: true },
  { date: '2026-10-13', description: 'Kaart: ?? - MKK*sportland.ee - kuupäev', amount: 56.98, refunded: true },
  { date: '2026-10-05', description: 'TOILET', amount: -0.5, refunded: false },
]
const budgets = [{ yearMonth: '2026-10',
  incomeLines: [{ description: 'SPARTA', amount: 887.9 }, { description: 'Algsaldo', amount: 100 }],
  expenseLines: [{ description: 'SELVER (2)', amount: 15 }, { description: 'MKK*sportland.ee', amount: 56.98 },
    { description: 'Tagastus: MKK*sportland.ee', amount: -56.98 }, { description: 'TOILET', amount: 3.5 }] }]

assert.deepStrictEqual(budgetVsBank(txs, budgets).map(r => [r.label, r.diff]), [['Algsaldo', 100], ['TOILET', -3]])
console.log('ok')
