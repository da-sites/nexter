import { crawl } from 'https://da.live/nx/public/utils/tree.js';
import { loadIms } from '../../utils/ims.js';

const { accessToken: { token } } = await loadIms();

const PLACEHOLDERS_DIR = 'TODO/da-sws/configs/';

const DA_ORIGIN = 'https://admin.da.live';
const AEM_ORIGIN = 'https://admin.hlx.page';

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
};

function getDestinationPath(siteName, orgName) {
  return `/${orgName}/${siteName}`;
}

function getConfig(siteName, orgName) {
  return {
    version: 1,
    content: {
      source: {
        url: `https://content.da.live/${orgName}/${siteName}/`,
        type: 'markup',
      },
    },
    extends: { profile: 'da-nsw-school' },
  };
}

function getAuthHeaders() {
  return { Authorization: `Bearer ${token}` };
}

export async function listPlaceholders() {
  const res = await fetch(`${DA_ORIGIN}/list${PLACEHOLDERS_DIR}`, {
    headers: getAuthHeaders(),
    method: 'GET',
  });
  if (!res.ok) throw new Error(`Failed to list placeholders: ${res.statusText}`);
  const data = await res.json();
  return data;
}

async function createConfig(data) {
  const { siteName, orgName } = data;
  const config = getConfig(siteName, orgName);

  const opts = {
    method: 'POST',
    body: JSON.stringify(config),
    headers: HEADERS,
  };

  const res = await fetch(`${AEM_ORIGIN}/config/${orgName}/sites/${data.siteName}.json`, opts);
  if (!res.ok) throw new Error(`Failed to create config: ${res.statusText}`);
}

async function replaceTemplate(data) {
  const templateFilePath = `${DA_ORIGIN}/source${data.placeholder}`;
  const templatesRes = await fetch(templateFilePath, { headers: getAuthHeaders() });
  if (!templatesRes.ok) throw new Error(`Failed to fetch templates: ${templatesRes.statusText}`);
  const templateFile = await templatesRes.json();

  const callback = async (item) => {
    if (!item.path.endsWith('.html')) return;

    const daPath = `https://admin.da.live/source${item.path}`;

    // get source to template
    const sourceRes = await fetch(daPath, { headers: getAuthHeaders() });
    if (!sourceRes.ok) throw new Error(`Failed to fetch index.html: ${sourceRes.statusText}`);

    // replace template values
    const sourceText = await sourceRes.text();

    let templatedText = sourceText;
    templateFile.data.forEach(({ key, value, Key, Value }) => {
      // TODO better handling of upper/lowercase
      if (key && value) {
        templatedText = templatedText.replaceAll(`{{${key.trim()}}}`, value);
      }
      if (Key && Value) {
        templatedText = templatedText.replaceAll(`{{${Key.trim()}}}`, Value);
      }
    });

    // update source
    const formData = new FormData();
    const blob = new Blob([templatedText], { type: 'text/html' });
    formData.set('data', blob);
    const updateRes = await fetch(daPath, { method: 'POST', body: formData, headers: getAuthHeaders() });
    if (!updateRes.ok) {
      throw new Error(`Failed to update index.html: ${updateRes.statusText}`);
    }
  };

  const { results } = crawl({
    path: getDestinationPath(data.siteName, data.orgName),
    callback,
    concurrent: 5,
    throttle: 250,
  });
  await results;
}

async function previewOrPublishPages(data, action, setStatus) {
  const parent = getDestinationPath(data.siteName, data.orgName);

  const label = action === 'preview' ? 'Previewing' : 'Publishing';

  const opts = { method: 'POST', headers: { Authorization: `Bearer ${token}` } };

  const callback = async (item) => {
    if (item.path.endsWith('.svg') || item.path.endsWith('.png') || item.path.endsWith('.jpg')) return;
    setStatus({ message: `${label}: ${item.path.replace(parent, '').replace('.html', '')}` });
    const aemPath = item.path.replace(parent, `${parent}/main`).replace('.html', '');
    const resp = await fetch(`${AEM_ORIGIN}/${action}${aemPath}`, opts);
    if (!resp.ok) throw new Error(`Could not preview ${aemPath}`);
  };

  // Get the library
  crawl({ path: `${parent}/.da`, callback, concurrent: 5, throttle: 250 });
  const { results } = crawl({ path: parent, callback, concurrent: 5, throttle: 250 });

  await results;
}

async function copyContent(data) {
  const formData = new FormData();
  const destination = getDestinationPath(data.siteName, data.orgName);

  formData.set('destination', destination);

  const opts = { method: 'POST', body: formData, headers: getAuthHeaders() };

  // TODO: Remove force delete. Copying tree doesn't seem to work
  // eslint-disable-next-line no-unused-vars
  const del = await fetch(`${DA_ORIGIN}/source${destination}`, { method: 'DELETE', headers: getAuthHeaders() });

  const res = await fetch(`${DA_ORIGIN}/copy${data.blueprint}/`, opts);

  if (!res.ok) throw new Error(`Failed to copy content: ${res.statusText}`);
}

function checkAuth() {
  if (!token || token === 'undefined') {
    throw new Error('Please sign in.');
  }
}

export async function createSite(data, setStatus) {
  checkAuth();
  setStatus({ message: 'Copying content.' });
  await copyContent(data);
  setStatus({ message: 'Templating content.' });
  await replaceTemplate(data);
  setStatus({ message: 'Creating new site.' });
  await createConfig(data);
  setStatus({ message: 'Previewing pages.' });
  await previewOrPublishPages(data, 'preview', setStatus);
  setStatus({ message: 'Publishing pages.' });
  await previewOrPublishPages(data, 'live', setStatus);
  setStatus({ message: 'Done!' });
}
