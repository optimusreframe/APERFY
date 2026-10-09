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
      /\bfilament\b/, /\bresin\s+printer\b/, /\bhotend\b/, /\b3d\s*printer\s*nozzle\b/, /\bbuild\s*plate\b/, /\bfep\s*film\b/, /\bfilament\s*(dryer|drying|storage)\b/, /\bwash\s+and\s+cure\b/,
    ],
  },
  {
    slug: 'health-household',
    patterns: [
      /\bfirst\s*aid\b/, /\bemergency\s+survival\s+kit\b/,
    ],
  },
  {
    slug: 'home-kitchen',
    patterns: [
      /\b(?:small|computer|workstation|l-shaped)\s+desk\b/,
    ],
  },
  {
    slug: 'electronics',
    patterns: [
      /\bsecurity\s+camera\b/, /\bpropeller\b/, /\blight\s+switch\b/, /\bflashlight\b/, /\bportable\s+power\s+station\b/, /\bcamera\s+tripod\b/, /\bradar\s+detector\b/, /\bsmart\s+plug\b/, /\bpower\s+strip\b/, /\bspeaker\s+(?:storage|carrying)\s+case\b/,
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
      /\blaptop\b/, /\bnotebook\b/, /\bdesktop\b/, /\bmonitor\b/, /\bkeyboard\b/, /\bkeypad\b/, /\bmouse\b/, /\bwebcam\b/, /\bssd\b/, /\bhard\s*drive\b/, /\bflash\s*drive\b/, /\busb\s*(drive|hub)\b/, /\btablet\b/, /\bipad\b/, /\bcomputer\b/, /\blaptop\s*(stand|bag|dock|charger)\b/,
    ],
  },
  {
    slug: 'video-games-consoles',
    patterns: [
      /\bplaystation\b/, /\b(?:ps[345]|xbox|nintendo\s*switch|switch\s+(?:lite|oled|controller|game))\b/, /\bvideo\s*game\b/, /\bgame\s*(?:controller|console|pad)\b/, /\bjoy\s*con\b/,
    ],
  },
  {
    slug: 'automotive',
    patterns: [
      /\bautomotive\b/, /\bvehicle\b/, /\bobd\b/, /\bdash\s*cam\b/, /\btire\b/, /\bwindshield\b/, /\bcar\s*(?:charger|mount|holder|vacuum|phone|interior|atmosphere)\b/, /\bjump\s*starter\b/, /\btrolley\s*jack\b/, /\bjack\s*stand\b/, /\bhigh\s*pressure\s*inflator\b/, /\becho\s*auto\b/,
    ],
  },
  {
    slug: 'sports-outdoors',
    patterns: [
      /\bsport\b/, /\bfitness\b/, /\byoga\b/, /\bgym\b/, /\bcamping\b/, /\bhiking\b/, /\boutdoor\b/, /\bbicycle\b/, /\bgolf\b/, /\bbaseball\b/, /\bfootball\b/, /\bexercise\b/, /\btennis\s*racket\b/, /\bpickleball\b/, /\bduffel\s*bag\b/, /\bbinoculars\b/,
    ],
  },
  {
    slug: 'toys-games',
    patterns: [
      /\btoy\b/, /\bmodel\s+car\b/, /\bpuzzle\b/, /\bboard\s*game\b/, /\bdoll\b/, /\bstuffed\s*animal\b/, /\bbuilding\s*blocks?\b/, /\blego\b/, /\buno\b/, /\bdominoes?\b/, /\bactivity\s*selector\b/,
    ],
  },
  {
    slug: 'office-products',
    patterns: [
      /\boffice\b/, /\bstapler\b/, /\bbinder\b/, /\bpaper\b/, /\bdesk\s*organizer\b/, /\blabel\s*maker\b/, /\bfiling\b/, /\bcalculator\b/,
    ],
  },
  {
    slug: 'pet-supplies',
    patterns: [
      /\bdog\b/, /\bcat\b/, /\baquarium\b/, /\bleash\b/, /\bpet\s*(?:bed|food|bowl|toy|grooming|supplies?)\b/,
    ],
  },
  {
    slug: 'beauty-personal-care',
    patterns: [
      /\bmakeup\b/, /\bcosmetic\b/, /\bskincare\b/, /\bshampoo\b/, /\bconditioner\b/, /\bhair\s*(?:dryer|brush|straightener)\b/, /\bfacial\b/, /\bnail\b/, /\brazor\b/, /\bbaby\s*oil\b/,
    ],
  },
  {
    slug: 'health-household',
    patterns: [
      /\bhealth\b/, /\bmedical\b/, /\bfirst\s*aid\b/, /\bvitamin\b/, /\bthermometer\b/, /\bmask\b/, /\bppe\b/, /\btourniquet\b/, /\bprotective\s*equipment\b/,
    ],
  },
  {
    slug: 'pet-supplies',
    patterns: [
      /\bdog\b/, /\bcat\b/, /\baquarium\b/, /\bleash\b/, /\bpet\s*(?:bed|food|bowl|toy|grooming|supplies?)\b/,
    ],
  },
  {
    slug: 'arts-crafts',
    patterns: [
      /\bart\b/, /\bcraft\b/, /\bsewing\b/, /\bpaint(?:ing)?\b/, /\bcanvas\b/, /\bdrawing\b/, /\bknitting\b/, /\byarn\b/, /\bscrapbook\b/, /\bmarker\b/, /\bbrush\s*marker\b/,
    ],
  },
  {
    slug: 'tools-home-improvement',
    patterns: [
      /\bdrill\b/, /\bscrewdriver\b/, /\bwrench\b/, /\btool\b/, /\bhardware\b/, /\bsolder(?:ing|ing iron)\b/, /\bmultimeter\b/, /\btape\s*measure\b/, /\bheat\s*gun\b/, /\bworkshop\b/, /\bladder\b/, /\bsaw\b/, /\bchainsaw\b/, /\bstud\s*finder\b/, /\btagging\s*gun\b/, /\bepoxy\b/, /\bblower\b/, /\bwall\s*mount\b/,
    ],
  },
  {
    slug: 'home-kitchen',
    patterns: [
      /\bkitchen\b/, /\bhome\b/, /\bhousehold\b/, /\bappliance\b/, /\bcookware\b/, /\bdrinkware\b/, /\btumbler\b/, /\bstraw\s+cup\b/, /\bbottle\b/, /\bmug\b/, /\bcup\b/, /\bspoons?\b/, /\bportion\s*cups?\b/, /\bfood\s*containers?\b/, /\bplastic\s*bucket\b/, /\bmilkshake\s*maker\b/, /\bair\s*fryer\b/, /\bblender\b/, /\bice\s*cream\s*maker\b/, /\bcoffee\s*maker\b/, /\bespresso\b/, /\bkeurig\b/, /\blamp\b/, /\blighting\b/, /\blight\s*fixture\b/, /\bfurniture\b/, /\bchair\b/, /\btable\b/, /\bstorage\b/, /\bcontainers?\b/, /\bvase\b/, /\bshop\s+vacuum\b/, /\bvacuum\b/,
    ],
  },
  {
    slug: 'electronics',
    patterns: [
      /\bstrobe\s*light\b/, /\bheadlamp\b/, /\bmicrophone\b/, /\bpower\s*bank\b/, /\bdrone\b/, /\bpropeller\s*guard\b/, /\bcharging\s*(?:hub|station)\b/, /\bspeaker\b/, /\bheadphones?\b/, /\bdoor\s*lock\b/, /\bpower\s*strip\b/, /\bwall\s*charger\b/, /\bsoundbar\b/, /\bsmart\s*speaker\b/, /\bbattery\b/, /\bcd\s*dvd\s*drive\b/, /\bmicro\s*sd\b/, /\bsd\s*card\b/, /\boutlet\s*extender\b/, /\badapter\b/, /\bsmart\s*plug\b/, /\bdoorbell\s*camera\b/, /\bprinter\b/, /\bwatch\b/, /\bprojector\b/, /\bhandheld\s*fan\b/, /\b(?:usb|wireless)\s*-?c?\s*(?:to\s*)?c?\s*cable\b/, /\bwireless\s*charger\b/, /\bcharger\b/, /\bwarning\s*light\b/,
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
