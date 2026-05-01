export const SHOP_BY_AGE_GROUPS = [
  { value: 'Newborn', label: 'New born', description: '0-6 Months' },
  { value: 'Infants', label: 'Infants', description: '6-24 Months' },
  { value: 'Toddlers', label: 'Toddler', description: '2-7 Years' },
  { value: 'Juniors', label: 'Juniors', description: '7-10 Years' },
] as const;

/** `marketingFile` = filename under `/marketing/` on the Next site (same as web HomeCategories). */
export const HOME_AGE_TILES = [
  { id: 'newborn', title: 'New born', age: '0-6 Months', ageQuery: 'Newborn', marketingFile: 'newborn.png' },
  { id: 'infants', title: 'Infants', age: '6-24 Months', ageQuery: 'Infants', marketingFile: 'infants.png' },
  { id: 'toddler', title: 'Toddler', age: '2-7 Years', ageQuery: 'Toddlers', marketingFile: 'toddler.png' },
  { id: 'juniors', title: 'Juniors', age: '7-10 Years', ageQuery: 'Juniors', marketingFile: 'juniors.png' },
];
