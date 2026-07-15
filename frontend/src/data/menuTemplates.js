// Country-specific starter menus for the weekly meal-plan generator.
// Keyed by language code (which is derived from the user's country).
// Each template is 7 days; every day has breakfast (b), lunch (l), dinner (d).
// The user can edit any dish before saving, so these are just sensible defaults.

export const MENU_TEMPLATES = {
  en: [
    { b: 'Porridge with fruit',  l: 'Chicken sandwich',        d: 'Spaghetti bolognese' },
    { b: 'Toast & eggs',         l: 'Vegetable soup & bread',  d: 'Baked salmon, potatoes' },
    { b: 'Yoghurt & granola',    l: 'Jacket potato & beans',   d: 'Chicken curry & rice' },
    { b: 'Scrambled eggs',       l: 'Tuna pasta salad',        d: 'Beef stew' },
    { b: 'Oatmeal',              l: 'Ham & cheese wrap',       d: 'Fish & chips' },
    { b: 'Pancakes',             l: 'Lentil soup',             d: 'Roast chicken & veg' },
    { b: 'Full breakfast',       l: 'Leftovers',               d: 'Shepherd’s pie' },
  ],
  fr: [
    { b: 'Tartines & café',      l: 'Salade niçoise',          d: 'Poulet rôti, pommes de terre' },
    { b: 'Croissant & fruit',    l: 'Quiche lorraine & salade',d: 'Bœuf bourguignon' },
    { b: 'Yaourt & muesli',      l: 'Sandwich jambon-beurre',  d: 'Ratatouille & riz' },
    { b: 'Pain perdu',           l: 'Soupe de légumes',        d: 'Saumon, haricots verts' },
    { b: 'Baguette & confiture', l: 'Omelette & salade',       d: 'Gratin dauphinois' },
    { b: 'Œufs & pain',          l: 'Croque-monsieur',         d: 'Steak-frites' },
    { b: 'Brioche & café',       l: 'Restes',                  d: 'Blanquette de veau' },
  ],
  de: [
    { b: 'Müsli mit Obst',       l: 'Bratwurst & Brötchen',    d: 'Spaghetti Bolognese' },
    { b: 'Brot mit Käse',        l: 'Gemüsesuppe',             d: 'Schnitzel mit Kartoffeln' },
    { b: 'Joghurt & Granola',    l: 'Linseneintopf',           d: 'Hähnchencurry & Reis' },
    { b: 'Rührei & Brot',        l: 'Nudelsalat',              d: 'Rindergulasch' },
    { b: 'Haferbrei',            l: 'Käsebrötchen',            d: 'Fisch & Kartoffeln' },
    { b: 'Pfannkuchen',          l: 'Kartoffelsuppe',          d: 'Brathähnchen & Gemüse' },
    { b: 'Frühstücksei & Brot',  l: 'Reste',                   d: 'Rinderbraten' },
  ],
  et: [
    { b: 'Kaerahelbepuder marjadega', l: 'Frikadellisupp',      d: 'Makaronid hakklihakastmega' },
    { b: 'Munapuder peekoniga',       l: 'Hapukapsasupp',       d: 'Ahjuräim kartuliga' },
    { b: 'Kohupiim ja müsli',         l: 'Hernesupp suitsulihaga', d: 'Hakklihakotlet kartulipüreega' },
    { b: 'Juustuvõileib tomatiga',    l: 'Seljanka',            d: 'Ahjukana riisiga' },
    { b: 'Tatrapuder',                l: 'Rosolje',             d: 'Praetud kala kartulisalatiga' },
    { b: 'Pannkoogid moosiga',        l: 'Mulgikapsad',         d: 'Grill-liha salatiga' },
    { b: 'Kringel ja kohv',           l: 'Seenesupp',           d: 'Ahjupraad hapukapsaga' },
  ],
  fi: [
    { b: 'Kaurapuuro',           l: 'Lihakeitto',              d: 'Spagetti bolognese' },
    { b: 'Voileipä & kananmuna', l: 'Kasviskeitto',            d: 'Uunilohi, perunat' },
    { b: 'Jogurtti & mysli',     l: 'Hernekeitto',             d: 'Kanacurry & riisi' },
    { b: 'Munakokkeli',          l: 'Pastasalaatti',           d: 'Naudanlihapata' },
    { b: 'Puuro',                l: 'Juustoleipä',             d: 'Paistettu kala' },
    { b: 'Lettuja',              l: 'Linssikeitto',            d: 'Uunikana & kasviksia' },
    { b: 'Aamiainen',            l: 'Tähteet',                 d: 'Jauhelihakastike & peruna' },
  ],
  ru: [
    { b: 'Овсянка с фруктами',   l: 'Куриный суп',             d: 'Спагетти с фаршем' },
    { b: 'Бутерброд с яйцом',    l: 'Овощной суп',             d: 'Запечённый лосось, картофель' },
    { b: 'Йогурт и мюсли',       l: 'Гороховый суп',           d: 'Карри с курицей и рис' },
    { b: 'Омлет',                l: 'Салат с пастой',          d: 'Говяжье рагу' },
    { b: 'Каша',                 l: 'Бутерброд с сыром',       d: 'Жареная рыба' },
    { b: 'Блины',                l: 'Чечевичный суп',          d: 'Курица с овощами' },
    { b: 'Завтрак',              l: 'Остатки',                 d: 'Тефтели с картофелем' },
  ],
}

// The generator falls back to the English menu for languages without a template.
export function menuForLang(lang) {
  return MENU_TEMPLATES[lang] || MENU_TEMPLATES.en
}
