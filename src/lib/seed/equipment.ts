/**
 * Equipment reference data.
 *
 * A normalised collection rather than free strings on each recipe, so a future
 * "equipment recommendations" feature can link to a thing rather than to a
 * spelling — and so "Milk pitcher" and "milk jug" cannot become two entries.
 *
 * `icon` names come from lucide-react and are resolved through a vetted
 * allow-list on the client; they are never rendered as arbitrary markup.
 */
export interface EquipmentSeed {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export const EQUIPMENT_SEED: EquipmentSeed[] = [
  {
    slug: 'espresso-machine',
    name: 'Espresso machine',
    description: 'Forces hot water through finely ground coffee at nine bars of pressure.',
    icon: 'CupSoda',
  },
  {
    slug: 'coffee-grinder',
    name: 'Coffee grinder',
    description: 'A burr grinder. Blade grinders produce uneven particles and muddy extraction.',
    icon: 'Settings',
  },
  {
    slug: 'milk-pitcher',
    name: 'Milk pitcher',
    description: 'Stainless steel jug for steaming and pouring milk.',
    icon: 'Milk',
  },
  {
    slug: 'kettle',
    name: 'Kettle',
    description: 'A gooseneck kettle gives the pour control that manual brewing needs.',
    icon: 'Droplet',
  },
  {
    slug: 'scale',
    name: 'Kitchen scale',
    description: 'Coffee is a ratio. Weighing beats measuring by volume every time.',
    icon: 'Scale',
  },
  {
    slug: 'cezve',
    name: 'Cezve',
    description: 'Small long-handled pot for Turkish coffee, traditionally copper or brass.',
    icon: 'Coffee',
  },
  {
    slug: 'french-press',
    name: 'French press',
    description: 'Full-immersion brewer with a mesh plunger.',
    icon: 'Coffee',
  },
  {
    slug: 'cold-brew-jar',
    name: 'Cold brew jar',
    description: 'Any large sealable jar works for a long cold steep.',
    icon: 'Container',
  },
  {
    slug: 'filter',
    name: 'Filter',
    description: 'Paper or fine mesh, for separating grounds from the finished brew.',
    icon: 'Filter',
  },
  {
    slug: 'glass',
    name: 'Serving glass',
    description: 'Clear glass shows the layers that make a drink look like itself.',
    icon: 'CupSoda',
  },
  {
    slug: 'cup',
    name: 'Cup',
    description: 'A warmed cup keeps the drink at temperature for longer than you expect.',
    icon: 'Coffee',
  },
  {
    slug: 'blender',
    name: 'Blender',
    description: 'For frappés and anything that needs ice broken down.',
    icon: 'Blend',
  },
  {
    slug: 'whisk',
    name: 'Whisk',
    description: 'Hand or electric. Dalgona needs sustained whipping.',
    icon: 'Wind',
  },
  {
    slug: 'phin',
    name: 'Phin filter',
    description: 'Vietnamese single-cup drip filter that sits on the glass.',
    icon: 'Filter',
  },
  {
    slug: 'spoon',
    name: 'Bar spoon',
    description: 'Long handle, for layering drinks without disturbing what is beneath.',
    icon: 'Utensils',
  },
];
