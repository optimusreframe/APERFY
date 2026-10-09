import { getInventoryCategory, type InventoryCategorySlug } from './taxonomy';
import type { InventorySourceRow } from './types';

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export function normalizeInventoryText(...values: unknown[]): string {
  return values
    .map(text)
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matches(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

const rules: Array<{ slug: InventoryCategorySlug; patterns: RegExp[] }> = [
  {
    slug: '3d-printing',
    patterns: [
      /\b3d\s*(print|printer|printing|printer(?:s)?|filament|resin)\b/,
      /\bfilament\b/, /\bresin\s+printer\b/, /\bhotend\b/, /\bnozzle\b/, /\bbuild\s*plate\b/, /\bfep\s*film\b/, /\bfilament\s*(dryer|drying|storage)\b/,
    ],
  },
  {
    slug: 'cell-phones-accessories',
    patterns: [
      /\biphone\b/, /\boneplus\b/, /\bsmartphone\b/, /\bcell\s*phone\b/, /\bphone\s*(case|cover|holder|mount|charger)\b/, /\bmagsafe\b/, /\bgalaxy\s*(s|a|note|z)\b/,
    ],
  },
  {
    slug: 'computers-accessories',
    patterns: [
      /\blaptop\b/, /\bnotebook\b/, /\bdesktop\b/, /\bmonitor\b/, /\bkeyboard\b/, /\bmouse\b/, /\bwebcam\b/, /\bssd\b/, /\bhard\s*drive\b/, /\bflash\s*drive\b/, /\busb\s*(drive|hub)\b/, /\btablet\b/, /\bipad\b/, /\bcomputer\b/, /\blaptop\s*(stand|bag|dock|charger)\b/,
    ],
  },
  {
    slug: 'video-games-consoles',
    patterns: [
      /\bplaystation\b/, /\b(?:ps[345]|xbox|nintendo\s*switch|switch\s*(?:lite|oled)?)\b/, /\bvideo\s*game\b/, /\bgame\s*(?:controller|console|pad)\b/, /\bjoy\s*con\b/,
    ],
  },
  {
    slug: 'automotive',
    patterns: [
      /\bautomotive\b/, /\bcar\b/, /\bvehicle\b/, /\bobd\b/, /\bdash\s*cam\b/, /\btire\b/, /\bwindshield\b/, /\bcar\s*(?:charger|mount|holder)\b/,
    ],
  },
  {
    slug: 'sports-outdoors',
    patterns: [
      /\bsport\b/, /\bfitness\b/, /\byoga\b/, /\bgym\b/, /\bcamping\b/, /\bhiking\b/, /\boutdoor\b/, /\bbicycle\b/, /\bgolf\b/, /\bbaseball\b/, /\bfootball\b/, /\bexercise\b/,
    ],
  },
  {
    slug: 'toys-games',
    patterns: [
      /\btoy\b/, /\bpuzzle\b/, /\bboard\s*game\b/, /\bdoll\b/, /\bstuffed\s*animal\b/, /\bbuilding\s*blocks?\b/, /\blego\b/,
    ],
  },
  {
    slug: 'office-products',
    patterns: [
      /\boffice\b/, /\bstapler\b/, /\bbinder\b/, /\bpaper\b/, /\bdesk\s*organizer\b/, /\blabel\s*maker\b/, /\bfiling\b/, /\bcalculator\b/,
    ],
  },
  {
    slug: 'beauty-personal-care',
    patterns: [
      /\bmakeup\b/, /\bcosmetic\b/, /\bskincare\b/, /\bshampoo\b/, /\bconditioner\b/, /\bhair\s*(?:dryer|brush|straightener)\b/, /\bfacial\b/, /\bnail\b/, /\brazor\b/,
    ],
  },
  {
    slug: 'health-household',
    patterns: [
      /\bhealth\b/, /\bmedical\b/, /\bfirst\s*aid\b/, /\bvitamin\b/, /\bthermometer\b/, /\bmask\b/, /\bppe\b/, /\bprotective\s*equipment\b/,
    ],
  },
  {
    slug: 'pet-supplies',
    patterns: [
      /\bpet\b/, /\bdog\b/, /\bcat\b/, /\baquarium\b/, /\bleash\b/, /\bpet\s*(?:bed|food|bowl|toy)\b/,
    ],
  },
  {
    slug: 'arts-crafts',
    patterns: [
      /\bart\b/, /\bcraft\b/, /\bsewing\b/, /\bpaint(?:ing)?\b/, /\bcanvas\b/, /\bdrawing\b/, /\bknitting\b/, /\byarn\b/, /\bscrapbook\b/,
    ],
  },
  {
    slug: 'tools-home-improvement',
    patterns: [
      /\bdrill\b/, /\bscrewdriver\b/, /\bwrench\b/, /\btool\b/, /\bhardware\b/, /\bsolder(?:ing|ing iron)\b/, /\bmultimeter\b/, /\bmeasure(?:ment|ring)?\b/, /\btape\s*measure\b/, /\bworkshop\b/, /\bladder\b/, /\bsaw\b/, /\bwall\s*mount\b/,
    ],
  },
  {
    slug: 'home-kitchen',
    patterns: [
      /\bkitchen\b/, /\bhome\b/, /\bhousehold\b/, /\bappliance\b/, /\bcookware\b/, /\bdrinkware\b/, /\bbottle\b/, /\bmug\b/, /\blamp\b/, /\blighting\b/, /\bfurniture\b/, /\bchair\b/, /\btable\b/, /\bstorage\b/, /\bcontainer\b/, /\bvase\b/, /\bvacuum\b/,
    ],
  },
];

export function classifyInventoryRow(row: InventorySourceRow): { slug: InventoryCategorySlug; reason: string } {
  const normalized = normalizeInventoryText(row.Item, row.Brand, row.Model, row.Description);
  const matchingRule = rules.find((rule) => matches(normalized, rule.patterns));
  const slug = matchingRule?.slug ?? 'electronics';
  const category = getInventoryCategory(slug);
  const reason = matchingRule
    ? `${category?.name_en ?? slug}: matched shopper-purpose rule`
    : `${category?.name_en ?? slug}: fallback for an uncategorized consumer product`;
  return { slug, reason };
}
