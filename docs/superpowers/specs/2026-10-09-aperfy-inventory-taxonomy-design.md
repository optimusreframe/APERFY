# APERFY inventory taxonomy design

## Objective

Classify the 209 inventory records from `inventory.xlsx` using clean, shopper-facing departments instead of copying operational source labels such as `Miscellaneous`, `Equipment`, or `Technician Equipment`.

The taxonomy is intentionally flat because APERFY currently models categories without parent-child relationships. It should feel familiar to a shopper browsing Amazon, Walmart, Best Buy, or Costco while remaining small enough to scan quickly.

## Approved taxonomy

| Slug | English | Spanish |
| --- | --- | --- |
| `electronics` | Electronics | Electrónica |
| `computers-accessories` | Computers & Accessories | Computadoras y Accesorios |
| `cell-phones-accessories` | Cell Phones & Accessories | Celulares y Accesorios |
| `video-games-consoles` | Video Games & Consoles | Videojuegos y Consolas |
| `home-kitchen` | Home & Kitchen | Hogar y Cocina |
| `tools-home-improvement` | Tools & Home Improvement | Herramientas y Mejoras del Hogar |
| `automotive` | Automotive | Automotriz |
| `sports-outdoors` | Sports & Outdoors | Deportes y Aire Libre |
| `toys-games` | Toys & Games | Juguetes y Juegos |
| `office-products` | Office Products | Oficina |
| `beauty-personal-care` | Beauty & Personal Care | Belleza y Cuidado Personal |
| `health-household` | Health & Household | Salud y Hogar |
| `pet-supplies` | Pet Supplies | Mascotas |
| `arts-crafts` | Arts, Crafts & Sewing | Arte y Manualidades |
| `3d-printing` | 3D Printing | Impresión 3D |

Existing APERFY categories (`Accessories`, `Figurines`, and `Home Decor`) remain untouched for existing or future APERFY catalog content. They are not used as catch-all categories for this inventory import.

## Classification rules

1. Use `Item`, `Brand`, `Model`, and `Description` together. The source `Category` is evidence only, not the final category.
2. Assign exactly one primary category to each product row.
3. Prefer the category a normal shopper would search first. For example, phone cases go to `Cell Phones & Accessories`, even if the source says `Electronics`.
4. Use `3D Printing` for 3D printers, resin printers, filament dryers, filament storage, and print post-processing equipment.
5. Use `Cell Phones & Accessories` for iPhones, OnePlus phones, phone cases, MagSafe accessories, and phone-specific charging or mounting products.
6. Use `Computers & Accessories` for laptops, monitors, computer input devices, storage, and laptop-specific accessories. Tablets and their accessories are grouped here unless the product is clearly a phone accessory.
7. Use `Video Games & Consoles` for PlayStation, Nintendo Switch, controllers, controller accessories, and console games.
8. Use `Electronics` for consumer electronics that do not have a more specific approved department, including audio, cameras, drones, projectors, smart-home products, and general chargers.
9. Use `Home & Kitchen` for kitchen appliances, drinkware, food-service containers, lighting, and general household products.
10. Use `Tools & Home Improvement` for hand tools, power tools, repair kits, measuring tools, wall mounts, and workshop equipment.
11. Keep duplicate product names as separate products when their image, price, model, brand, or quantity differs.
12. If two rules appear to apply, use the most specific product-purpose category and record the decision in the import preview rather than silently merging or dropping the row.

## Import field mapping

The approved taxonomy is used by the later inventory import with this mapping:

- `Item` → `name_en` and `name_es` until a verified translation workflow is applied.
- `Description` → `description_en` and `description_es`, with brand and model retained as useful product context.
- `Unit price` → `base_price`.
- `Qty` → `stock_quantity`.
- `inventory_enabled` → `true` for imported rows.
- `low_stock_threshold` → `3` by default.
- `Status = approved` → `is_active = true`.
- `Photo file` → the product's primary image in the `product-images` bucket.
- Category mapping → the approved category UUID, resolved by slug.

## Validation before data writes

The importer must produce a preview before creating products. The preview must show:

- total rows and total referenced photos;
- category distribution using the approved 15-category taxonomy;
- rows with missing names, descriptions, prices, quantities, or photos;
- duplicate names that will receive unique slugs;
- category assignments that required a fallback decision.

The import may proceed only when every row has one category, every referenced photo exists, and no existing APERFY product is overwritten. The current product-level inventory controls and checkout reservation logic remain enabled for all imported products.

## Out of scope

- Renaming or deleting existing APERFY categories.
- Importing products or images as part of the taxonomy-design step.
- Inventing product translations, specifications, or prices.
- Merging duplicate inventory rows.
- Adding hierarchical category support to the database.
