import { getExt } from '../../public/utils/getExt.js';
import { daFetch } from '../../utils/daFetch.js';

const AEM_ORIGIN = 'https://admin.hlx.page';
const DA_ORIGIN = 'https://admin.da.live';

function isBulkDa(action) {
  return action === 'versionsource';
}

export function throttle(start) {
  const end = Date.now();
  const timeDiff = end - start;
  const pause = timeDiff > 2000 ? 0 : 500 + timeDiff;
  return new Promise((resolve) => { setTimeout(() => { resolve(); }, pause); });
}

export function formatUrls(urls, action, hasDelete) {
  return [...new Set(urls.split('\n'))].reduce((acc, href) => {
    try {
      const url = new URL(href);
      const [ref, repo, org] = url.hostname.split('.').shift().split('--');
      let { pathname } = url;
      if (pathname.endsWith('/')) pathname = `${pathname}index`;
      if (ref && org && repo && pathname) {
        acc.push({
          href, ref, org, repo, pathname, action, hasDelete,
        });
      }
    } catch {
      console.log('Could not make url.');
    }
    return acc;
  }, []);
}

export async function sendAction(url, label) {
  try {
    const method = url.hasDelete ? 'DELETE' : 'POST';
    const opts = { method };
    if (label && isBulkDa(url.action)) opts.body = JSON.stringify({ label });
    const origin = isBulkDa(url.action) ? DA_ORIGIN : AEM_ORIGIN;
    const ext = getExt(url.pathname);
    const path = !ext && isBulkDa(url.action) ? `${url.pathname}.html` : url.pathname;
    const ref = isBulkDa(url.action) ? '' : `/${url.ref}`;
    const aemUrl = `${origin}/${url.action}/${url.org}/${url.repo}${ref}${path}`;
    const resp = await daFetch(aemUrl, opts);
    url.status = resp.status;
  } catch {
    url.status = '400';
  }
  return url;
}

export async function triggerJob(urls) {
  try {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' } };
    const origin = AEM_ORIGIN;

    const deleteJob = !!urls[0].hasDelete;
    opts.body = JSON.stringify({ paths: urls.map((url) => url.pathname), delete: deleteJob });

    const aemUrl = `${origin}/${urls[0].action}/${urls[0].org}/${urls[0].repo}/${urls[0].ref}/*`;
    const resp = await daFetch(aemUrl, opts);

    if (resp.status !== 202) {
      return { error: resp.status, message: 'Job failed to trigger.' };
    }
    return resp.json();
  } catch (error) {
    return { error, message: 'Job failed to trigger.' };
  }
}

export async function cancelJob(jobUrl) {
  try {
    const opts = { method: 'DELETE' };
    const job = await daFetch(jobUrl, opts);
    const result = await job.json();
    return result;
  } catch (error) {
    return error;
  }
}

export async function getJobStatus(jobUrl, force = false) {
  if (!force) {
    await new Promise((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  }
  try {
    const opts = { method: 'GET' };
    const status = await daFetch(jobUrl, opts);
    const result = await status.json();
    return result;
  } catch (error) {
    return error;
  }
}
