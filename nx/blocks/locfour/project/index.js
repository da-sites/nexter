import { regionalDiff, removeLocTags } from '../regional-diff/regional-diff.js';
import { sendForTranslation } from '../google/index.js';
import { daFetch, saveToDa } from '../../../utils/daFetch.js';

const DA_ORIGIN = 'https://admin.da.live';
const DEFAULT_TIMEOUT = 20000; // ms

const PARSER = new DOMParser();

let projPath;

async function fetchData(path) {
  const resp = await daFetch(path);
  if (!resp.ok) return null;
  return resp.json();
}

export function formatDate(timestamp) {
  const rawDate = timestamp ? new Date(timestamp) : new Date();
  const date = rawDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const time = rawDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

export async function detectService(config) {
  const name = config['translation.service.name']?.value;
  if (name === 'GLaaS') {
    return {
      name: 'GLaaS',
      origin: config['translation.service.stage.origin'].value,
      clientid: config['translation.service.stage.clientid'].value,
      actions: await import('../glaas/index.js'),
    };
  }
  return {
    name: 'Google',
    origin: 'https://translate.da/live',
    actions: await import('../google/index.js'),
  };
}

export async function getDetails() {
  projPath = window.location.hash.replace('#', '');
  const data = await fetchData(`${DA_ORIGIN}/source${projPath}.json`);
  return data;
}

export function convertUrl({ path, srcLang, destLang }) {
  const source = path.startsWith(srcLang) ? path : `${srcLang}${path}`;
  const destSlash = srcLang === '/' ? '/' : '';
  const destination = path.startsWith(srcLang) ? path.replace(srcLang, `${destLang}${destSlash}`) : `${destLang}${path}`;

  return { source, destination };
}

export async function saveStatus(json) {
  // Make a deep copy so the in-memory data is not destroyed
  const copy = JSON.parse(JSON.stringify(json));

  // Do not save URL content
  copy.urls.forEach((url) => { delete url.content; });

  const body = new FormData();
  const file = new Blob([JSON.stringify(copy)], { type: 'application/json' });
  body.append('data', file);
  const opts = { body, method: 'POST' };
  const resp = await daFetch(`${DA_ORIGIN}/source${projPath}.json`, opts);
  if (!resp.ok) return { error: 'Could not update project' };
  return json;
}

async function saveVersion(path, label) {
  const opts = { method: 'POST' };
  if (label) opts.body = JSON.stringify({ label });

  const res = await daFetch(`${DA_ORIGIN}/versionsource${path}`, opts);
  return res;
}

export async function overwriteCopy(url, projectTitle) {
  const body = new FormData();
  body.append('destination', url.destination);
  const opts = { method: 'POST', body };

  return new Promise((resolve) => {
    (() => {
      const fetched = daFetch(`${DA_ORIGIN}/copy${url.source}`, opts);

      const timedout = setTimeout(() => {
        url.status = 'timeout';
        resolve('timeout');
      }, DEFAULT_TIMEOUT);

      fetched.then((resp) => {
        clearTimeout(timedout);
        url.status = resp.ok ? 'success' : 'error';
        if (resp.ok) {
          saveVersion(url.destination, `${projectTitle} - Rolled Out`);
        }
        resolve();
      }).catch(() => {
        clearTimeout(timedout);
        url.status = 'error';
        resolve();
      });
    })();
  });
}

const collapseWhitespace = (str) => str.replace(/\s+/g, ' ');

const getHtml = async (url, format = 'dom') => {
  const res = await daFetch(`${DA_ORIGIN}/source${url}`);
  if (!res.ok) return null;
  const str = await res.text();
  if (format === 'text') return str;
  return PARSER.parseFromString(collapseWhitespace(str), 'text/html');
};

const getDaUrl = (url) => {
  const [, org, repo, ...path] = url.destination.split('/');
  const pathname = `/${path.join('/').replace('.html', '')}`;
  return { org, repo, pathname };
};

export async function rolloutCopy(url, projectTitle) {
  // if the regional folder has content that differs from langstore,
  // then a regional diff needs to be done
  try {
    const regionalCopy = await getHtml(url.destination);
    if (!regionalCopy) {
      throw new Error('No regional content or error fetching');
    }

    const langstoreCopy = await getHtml(url.source);
    if (!langstoreCopy) {
      throw new Error('No langstore content or error fetching');
    }

    removeLocTags(regionalCopy);

    if (langstoreCopy.querySelector('main').outerHTML === regionalCopy.querySelector('main').outerHTML) {
      // No differences, don't need to do anything
      url.status = 'success';
      return Promise.resolve();
    }

    // There are differences, upload the annotated loc file
    const diffedMain = await regionalDiff(langstoreCopy, regionalCopy);

    return new Promise((resolve) => {
      const daUrl = getDaUrl(url);
      const savePromise = saveToDa(diffedMain.innerHTML, daUrl);

      const timedout = setTimeout(() => {
        url.status = 'timeout';
        resolve('timeout');
      }, DEFAULT_TIMEOUT);

      savePromise.then(({ daResp }) => {
        clearTimeout(timedout);
        url.status = daResp.ok ? 'success' : 'error';
        if (daResp.ok) {
          saveVersion(url.destination, `${projectTitle} - Rolled Out`);
        }
        resolve();
      }).catch(() => {
        clearTimeout(timedout);
        url.status = 'error';
        resolve();
      });
    });
  } catch (e) {
    return overwriteCopy(url, projectTitle);
  }
}

export async function translateCopy(toLang, url, projectTitle) {
  const dom = await getHtml(url.source);
  captureDnt(dom);
  capturePics(dom);
  const dntedHtml = dom.querySelector('main').outerHTML;
  const translated = await sendForTranslation(dntedHtml, toLang);

  if (translated) {
    return new Promise((resolve) => {
      (() => {
        const translatedDom = PARSER.parseFromString(translated, 'text/html');

        const mainHtml = releaseDnt(translatedDom);

        const saved = saveToDa(mainHtml, getDaUrl(url));

        const timedout = setTimeout(() => {
          url.status = 'timeout';
          resolve('timeout');
        }, DEFAULT_TIMEOUT);

        saved.then((daResp) => {
          clearTimeout(timedout);
          url.status = daResp.ok ? 'success' : 'error';
          if (daResp.ok) {
            saveVersion(url.destination, `${projectTitle} Translated`);
          }
          resolve();
        }).catch(() => {
          clearTimeout(timedout);
          url.status = 'error';
          resolve();
        });
      })();
    });
  }

  url.status = 'error';
  return null;
}
