// Premium default: the 50 / 30 / 20 rule, applied to this month's income.
//   50 % needs   = 35 % home + 15 % food
//   30 % wants   = everything else (restaurants, clothes, fun, travel…), shared
//   20 % savings
export const RULE_PCT = { HOUSE: 35, EATING: 15, SAVINGS: 20 }
export const WANTS_PCT = 30
export const groupOf = cat => (cat === 'HOUSE' || cat === 'EATING') ? 'needs' : cat === 'SAVINGS' ? 'savings' : 'wants'
export const GROUP_PCT = { needs: 50, wants: WANTS_PCT, savings: 20 }
