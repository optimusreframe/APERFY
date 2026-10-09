import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'node_modules/country-state-city/lib/assets');
const OUTPUT_DIR = path.join(ROOT, 'public/data');
const ALLOWED_COUNTRIES = ['US', 'VE'];

const sortByName = (left, right) => left.name.localeCompare(right.name, 'en');

const readJson = async (fileName) => JSON.parse(await readFile(path.join(SOURCE_DIR, fileName), 'utf8'));

const writeJson = async (filePath, value) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`, 'utf8');
};

const run = async () => {
  const [states, cities] = await Promise.all([readJson('state.json'), readJson('city.json')]);
  const stateRoot = path.join(OUTPUT_DIR, 'location-states');
  const cityRoot = path.join(OUTPUT_DIR, 'location-cities');

  await rm(stateRoot, { recursive: true, force: true });
  await rm(cityRoot, { recursive: true, force: true });

  const summary = {};
  for (const countryCode of ALLOWED_COUNTRIES) {
    const countryStates = states
      .filter((state) => state.countryCode === countryCode)
      .map((state) => ({ isoCode: state.isoCode, name: state.name }))
      .sort(sortByName);
    const stateCodes = new Set(countryStates.map((state) => state.isoCode));
    const countryCities = cities.filter((city) => city[1] === countryCode && stateCodes.has(city[2]));

    await writeJson(path.join(stateRoot, `${countryCode}.json`), countryStates);
    for (const state of countryStates) {
      const stateCities = countryCities
        .filter((city) => city[2] === state.isoCode)
        .map((city) => city[0])
        .filter((name, index, names) => names.indexOf(name) === index)
        .sort((left, right) => left.localeCompare(right, 'en'));
      await writeJson(path.join(cityRoot, countryCode, `${state.isoCode}.json`), stateCities);
    }

    summary[countryCode] = { states: countryStates.length, cities: countryCities.length };
  }

  console.log(JSON.stringify(summary, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
