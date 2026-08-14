import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { get } from 'node:https';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORCID_ID = '0000-0002-9684-2434';
const OWNER = {
  given: 'Ignacio',
  family: 'Saldivia Gonzatti'
};
const INCLUDED_TYPES = new Set(['journal-article']);
const ORCID_WORKS_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const CROSSREF_WORK_URL = 'https://api.crossref.org/works/';
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(SCRIPT_DIRECTORY, '../src/data/publications.json');

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

function requestJson(url, headers, redirectsRemaining = 3) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = get(url, { headers }, (response) => {
      const status = response.statusCode ?? 0;

      if (status >= 300 && status < 400 && response.headers.location && redirectsRemaining > 0) {
        response.resume();
        const redirectedUrl = new URL(response.headers.location, url).toString();
        requestJson(redirectedUrl, headers, redirectsRemaining - 1).then(resolveRequest, rejectRequest);
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        if (status < 200 || status >= 300) {
          rejectRequest(new Error(`${status} ${response.statusMessage ?? ''}`.trim()));
          return;
        }

        try {
          resolveRequest(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (error) {
          rejectRequest(new Error(`invalid JSON response (${error.message})`));
        }
      });
    });

    request.setTimeout(60_000, () => {
      request.destroy(new Error('connection timed out after 60 seconds'));
    });
    request.on('error', rejectRequest);
  });
}

async function fetchJson(url, label, headers = {}) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await requestJson(url, {
        Accept: 'application/json',
        'User-Agent': `ignaciosg.com-publication-updater/1.0 (ORCID ${ORCID_ID})`,
        ...headers
      });
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 750);
    }
  }

  throw new Error(`Could not retrieve ${label}: ${lastError.message}`);
}

function normalizeDoi(value = '') {
  return value.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
}

function getDoi(work) {
  const identifiers = work?.['external-ids']?.['external-id'] ?? [];
  const identifier = identifiers.find((item) => item['external-id-type']?.toLowerCase() === 'doi');
  return normalizeDoi(identifier?.['external-id-normalized']?.value ?? identifier?.['external-id-value']);
}

function normalizeOrcid(value = '') {
  return value.replace(/^https?:\/\/orcid\.org\//i, '').trim();
}

function isOwner(author) {
  if (normalizeOrcid(author.ORCID) === ORCID_ID) return true;

  const normalizeName = (value) => value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z]/gi, '')
    .toLowerCase();
  const given = normalizeName(author.given ?? '');
  const family = normalizeName(author.family ?? '');
  const fullName = `${given}${family}`;

  return fullName === 'ignaciosaldiviagonzatti'
    || (given.includes('ignacio') && family === 'saldiviagonzatti');
}

function dateParts(record) {
  const candidates = [record.published, record['published-online'], record['published-print'], record.issued];

  for (const candidate of candidates) {
    const parts = candidate?.['date-parts']?.[0];
    if (parts?.[0]) return parts;
  }

  return [];
}

function cleanValue(value) {
  if (typeof value !== 'string') return '';

  const namedEntities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"'
  };

  return value
    .replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, code) => {
      const normalizedCode = code.toLowerCase();
      if (normalizedCode.startsWith('#x')) return String.fromCodePoint(Number.parseInt(normalizedCode.slice(2), 16));
      if (normalizedCode.startsWith('#')) return String.fromCodePoint(Number.parseInt(normalizedCode.slice(1), 10));
      return namedEntities[normalizedCode] ?? entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPublication(work, crossref) {
  const metadata = crossref.message;
  const doi = getDoi(work);
  const parts = dateParts(metadata);
  const year = Number(parts[0] ?? work?.['publication-date']?.year?.value);
  const authors = (metadata.author ?? []).map((author) => {
    const owner = isOwner(author);

    return {
      given: owner ? OWNER.given : cleanValue(author.given),
      family: owner ? OWNER.family : cleanValue(author.family),
      isOwner: owner
    };
  });

  if (!Number.isInteger(year)) {
    throw new Error(`No publication year found for ${doi}`);
  }

  if (!authors.some((author) => author.isOwner)) {
    throw new Error(`Your ORCID iD or name was not found in the Crossref authors for ${doi}`);
  }

  return {
    doi,
    title: cleanValue(work?.title?.title?.value) || cleanValue(metadata.title?.[0]),
    year,
    authors,
    journal: cleanValue(metadata['container-title']?.[0] ?? work?.['journal-title']?.value),
    volume: cleanValue(metadata.volume),
    issue: cleanValue(metadata.issue),
    pages: cleanValue(metadata.page ?? metadata['article-number']),
    type: work.type
  };
}

async function main() {
  console.log(`Reading public works from ORCID ${ORCID_ID}…`);
  const orcid = await fetchJson(ORCID_WORKS_URL, 'the ORCID works list');
  const worksByDoi = new Map();

  for (const group of orcid.group ?? []) {
    const summaries = group['work-summary'] ?? [];
    const work = summaries.find((summary) => INCLUDED_TYPES.has(summary.type) && getDoi(summary));

    if (work) worksByDoi.set(getDoi(work), work);
  }

  if (worksByDoi.size === 0) {
    throw new Error('ORCID returned no journal articles with DOIs; the existing file was not changed.');
  }

  const publications = [];

  for (const [doi, work] of worksByDoi) {
    console.log(`Enriching ${doi} with Crossref metadata…`);
    const url = `${CROSSREF_WORK_URL}${encodeURIComponent(doi)}`;
    const crossref = await fetchJson(url, `Crossref metadata for ${doi}`);
    publications.push(buildPublication(work, crossref));
  }

  publications.sort((left, right) => {
    return right.year - left.year || left.title.localeCompare(right.title, 'en');
  });

  const nextContents = `${JSON.stringify(publications, null, 2)}\n`;
  const currentContents = await readFile(OUTPUT_PATH, 'utf8').catch(() => '');

  if (currentContents === nextContents) {
    console.log(`Publications are already current (${publications.length} journal articles).`);
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  const temporaryPath = `${OUTPUT_PATH}.tmp`;
  await writeFile(temporaryPath, nextContents, 'utf8');
  await rename(temporaryPath, OUTPUT_PATH);
  console.log(`Updated ${OUTPUT_PATH} with ${publications.length} journal articles.`);
}

main().catch((error) => {
  console.error(`Publication update failed: ${error.message}`);
  process.exitCode = 1;
});
