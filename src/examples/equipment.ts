/** Deliberately fictional fixtures, not Cat product specifications or live inventory. */
export const equipment = [
  { id: 'mini', name: 'Terra Mini 6', category: 'Compact excavator', capacity: '6 t', power: '42 kW', reach: '6.1 m', dayRate: 6500, description: 'A smaller footprint for tighter spaces and lighter groundwork.', tag: 'Compact choice', className: 'mini', suitability: 'Urban sites', availability: 'Needs confirmation' },
  { id: 'medium', name: 'Terra Works 20', category: 'Medium excavator', capacity: '20 t', power: '110 kW', reach: '9.4 m', dayRate: 12500, description: 'A versatile starting point for foundations and general construction.', tag: 'Balanced option', className: 'medium', suitability: 'General construction', availability: 'Needs confirmation' },
  { id: 'large', name: 'Terra Pro 30', category: 'Large excavator', capacity: '30 t', power: '170 kW', reach: '10.2 m', dayRate: 18500, description: 'More capacity for large earthmoving and demanding sites.', tag: 'Heavy-duty option', className: 'large', suitability: 'Bulk earthmoving', availability: 'Needs confirmation' },
] as const;
export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const findEquipment = (id: unknown) => equipment.find(item => item.id === id) ?? equipment[1];
