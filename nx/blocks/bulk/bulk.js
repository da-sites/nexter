import { LitElement, html, nothing } from '../../deps/lit/lit-core.min.js';

import { getConfig } from '../../scripts/nexter.js';
import getStyle from '../../utils/styles.js';
import getSvg from '../../utils/svg.js';

import { cancelJob, formatUrls, getJobStatus, triggerJob } from './index.js';

const { nxBase } = getConfig();
const style = await getStyle(import.meta.url);
const buttons = await getStyle(`${nxBase}/styles/buttons.js`);

const ICONS = [
  `${nxBase}/img/icons/Smock_ChevronRight_18_N.svg`,
];

const SUCCESS_CODES = [200, 201, 204, 304];

const MOCK_URLS = 'https://main--bacom-sandbox--adobecom.hlx.live/\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/aaa-northeast-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/aaa-northeast-case-study-updatedcaastags\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/abb-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/academy-of-art-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/accent-group-ecommerce-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/aci-worldwide-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adobe-campaign-orchestration-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adobe-digital-legal-workflow-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adobe-digital-onboarding-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adobe-digital-university-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adobe-inside-adobe-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adobe-promo-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adobe-summit-2023-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/adp-workfront-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/aftia-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/airbus-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/aisg-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/al-ghandi-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/alma-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/alshaya-group-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/altisource-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/americord-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/analogic-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/aon-hewitt-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/apollo-tyres-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/ariel-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/armor-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/asics-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/asus-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/avidxchange-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/avionte-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/bank-of-new-zealand-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/barilla-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/bbva-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/bbva-workfront-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/ben-and-jerrys-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/benefytt-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/best-buy-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/best-western-hotels-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/biomedica-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/blackmores-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/bmw-group-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/bny-mellon-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/boots-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/border-states-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/bose-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/brand-safety-institute-case-study\nhttps://main--bacom-sandbox--adobecom.hlx.live/customer-success-stories/breville-case-study';

class NxBulk extends LitElement {
  static properties = {
    _jobStatus: { state: true },
    _jobUrl: { state: true },
    _baseUrls: { state: true },
    _successUrls: { state: true },
    _errorUrls: { state: true },
    _isDelete: { state: true },
    _cancel: { state: true },
    _cancelText: { state: true },
    _showVersion: { state: true },
    _error: { attribute: false },
  };

  constructor() {
    super();
    this._isDelete = false;
    this.resetState();
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style, buttons];
    getSvg({ parent: this.shadowRoot, paths: ICONS });
  }

  processJobStatus(jobStatus) {
    if (jobStatus.progress) {
      this._jobStatus = jobStatus.progress;
      this._jobStatus.stopped = jobStatus.state === 'stopped';
    }
    if (jobStatus.cancelled) {
      this.resetState();
    } else if (jobStatus.data?.resources) {
      this._successUrls = jobStatus.data.resources.filter(
        (res) => SUCCESS_CODES.includes(res.status),
      );
      this._errorUrls = jobStatus.data.resources.filter(
        (res) => res.status && !SUCCESS_CODES.includes(res.status),
      );
      this._baseUrls = jobStatus.data.resources.filter((res) => !res.status);
    }
    this.requestUpdate();
  }

  async pollJobStatus(job, setProgress) {
    let jobStatus;
    let stopped = false;
    while (!stopped) {
      const status = await getJobStatus(`${job.links.self}`);
      if (status?.stopTime) {
        jobStatus = status;
        stopped = true;
      }
      if (status) setProgress(status);
    }
    if (stopped) {
      jobStatus = await getJobStatus(`${jobStatus.links.details}`, true);
      setProgress(jobStatus);
    }
    return jobStatus;
  }

  resetState() {
    this._cancel = false;
    this._cancelText = 'Cancel';
    this._baseUrls = [];
    this._successUrls = [];
    this._errorUrls = [];
    this._error = '';
    this._jobStatus = {
      stopped: false,
      total: 0,
      processed: 0,
      failed: 0,
      success: 0,
      notmodified: 0,
    };
    this._jobUrl = '';
    if (this.shadowRoot) {
      const cards = this.shadowRoot.querySelectorAll('.detail-card');
      const lists = this.shadowRoot.querySelectorAll('.url-list');
      [...cards, ...lists].forEach((el) => { el.classList.remove('is-expanded'); });
    }
  }

  handleDeleteCheck() {
    this._isDelete = !this._isDelete;
  }

  async handleCancel() {
    this._cancel = true;
    this._cancelText = 'Canceling';
    if (this._jobUrl && !this._jobStatus.stopped) {
      await cancelJob(this._jobUrl);
    }
  }

  handleToggleList(e) {
    const card = e.target.closest('.detail-card');
    const { name } = e.target.closest('button').dataset;
    const list = this.shadowRoot.querySelector(`.url-list-${name}`);
    const cards = this.shadowRoot.querySelectorAll('.detail-card');
    const lists = this.shadowRoot.querySelectorAll('.url-list');

    const isExpanded = card.classList.contains('is-expanded');
    [...cards, ...lists].forEach((el) => { el.classList.remove('is-expanded'); });
    if (isExpanded) return;

    card.classList.add('is-expanded');
    list.classList.add('is-expanded');
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.resetState();

    const data = new FormData(e.target);
    const { urls, action, delete: hasDelete, label } = Object.fromEntries(data);

    this._baseUrls = formatUrls(urls, action, hasDelete);
    const jobResult = await triggerJob(this._baseUrls, label);

    if (jobResult.error) {
      this.resetState();
      this._error = jobResult.message || 'Something went wrong.';
      return;
    }

    this._jobUrl = jobResult.links.self;
    await this.pollJobStatus(jobResult, (status) => {
      this.processJobStatus(status);
    });
  }

  handleSelect(e) {
    this._showVersion = e.target.value === 'versionsource';
  }

  get _totalCount() {
    return this._jobStatus.total || this._baseUrls.length;
  }

  get _successCount() {
    return this._jobStatus.success + this._jobStatus.notmodified;
  }

  get _remainingCount() {
    return this._totalCount - this._jobStatus.processed;
  }

  renderBadge(name, length, hasCancel) {
    const lowerName = name.toLowerCase();
    const hasExpand = this._jobStatus.stopped && length > 0 && (lowerName !== 'total' || lowerName === 'remaining');

    return html`
      <div class="detail-card detail-card-${lowerName}">
        <div>
          <h3>${name}</h3>
          <p>${length}</p>
        </div>
        <div class="detail-card-actions">
          ${hasCancel ? html`<button class="cancel-button" @click=${this.handleCancel}>${this._cancelText}</button>` : nothing}
          ${hasExpand ? html`
            <button class="toggle-list-icon" @click=${this.handleToggleList} data-name="${lowerName}">
              <svg class="icon"><use href="#spectrum-chevronRight"/></svg>
            </button>
          ` : nothing}
        </div>
      </div>`;
  }

  renderList(name, urls) {
    return html`
      <div class="url-list url-list-${name.toLowerCase()}">
        <h2>${name}</h2>
        <ul class="urls-result">
          ${urls.map((url) => html`
            <li>
              <div class="url-path">${url.path || url.webPath || url.pathname}</div>
              <div class="url-status result-${url.status ? url.status : 'waiting'}">
                ${url.status ? url.status : 'waiting'}
              </div>
            </li>
          `)}
        </ul>
      </div>
    `;
  }

  render() {
    return html`
      <h1>Bulk Operations</h1>
      <form @submit=${this.handleSubmit}>
        <label for="urls">URLs</label>
        <textarea id="urls" name="urls" placeholder="Add AEM URLs here..."></textarea>
        <div class="da-bulk-action-submit">
          ${!this._showVersion ? html`
            <div class="delete-toggle">
              <input type="checkbox" id="delete" name="delete" .checked=${this._isDelete} @click=${this.handleDeleteCheck} />
              <label for="delete">Delete</label>
            </div>
          ` : nothing}
          ${this._showVersion ? html`<input type="text" name="label" placeholder="Version label" />` : nothing}
          <select id="action" name="action" @change=${this.handleSelect}>
            <option value="preview">Preview</option>
            <option value="live">Publish</option>
            <option value="versionsource">Version</option>
            <option value="index">Index</option>
          </select>
          ${this._isDelete ? html`<button class="negative">Delete</button>` : html`<button class="accent">Submit</button>`}
        </div>
      </form>
      <div class="detail-cards">
        ${this.renderBadge('Remaining', this._remainingCount, this._remainingCount > 1 && !this._jobStatus.stopped)}
        ${this.renderBadge('Errors', this._jobStatus.failed)}
        ${this.renderBadge('Success', this._successCount)}
        ${this.renderBadge('Total', this._totalCount)}
      </div>
      ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
      ${this.renderList('Remaining', this._baseUrls)}
      ${this.renderList('Errors', this._errorUrls)}
      ${this.renderList('Success', this._successUrls)}
    `;
  }
}

customElements.define('nx-bulk', NxBulk);

export default function init(el) {
  el.innerHTML = '<nx-bulk></nx-bulk>';
}
