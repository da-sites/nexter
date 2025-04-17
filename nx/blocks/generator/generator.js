import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import { createSite } from './create-site.js';

const style = await getStyle(import.meta.url);
// const placeholders = [];
const blueprints = [{ label: 'Blueprint', value: '/adobe-commerce/commerce-boilerplate' }];

// const onOpenPlaceholder = (item) => {
//   const url = `https://da.live/sheet#${item.value}`;
//   window.open(url, url);
// };

const onOpenBlueprint = (item) => {
  const url = `https://da.live/#${item.value}`;
  window.open(url, url);
};

class Generator extends LitElement {
  static properties = {
    _data: { state: true },
    _loading: { state: true },
    _status: { state: true },
    _time: { state: true },
  };

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  calculateCrawlTime(startTime) {
    const crawlTime = Date.now() - startTime;
    return `${String(crawlTime / 1000).substring(0, 4)}s`;
  }

  async handleSubmit(e) {
    e.preventDefault();
    this._time = null;
    this._loading = true;
    const formData = new FormData(e.target.closest('form'));
    const entries = Object.fromEntries(formData.entries());

    const empty = Object.keys(entries).some((key) => !entries[key]);
    if (empty) {
      this._status = { type: 'error', message: 'Some fields empty.' };
      return;
    }

    const startTime = Date.now();
    const getTime = setInterval(() => {
      this._time = this.calculateCrawlTime(startTime);
    }, 100);

    this._data = {
      ...entries,
      siteName: entries.repo.replaceAll(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
      orgName: entries.organization.replaceAll(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
    };

    const setStatus = (status) => { this._status = status; };

    try {
      await createSite(this._data, setStatus);
    } catch (err) {
      this._status = ({ type: 'error', message: err.message });
      throw err;
    } finally {
      clearTimeout(getTime);
    }

    this._status = { type: 'success', message: `Site created in ${this.calculateCrawlTime(startTime)}.` };
  }

  get _heading() {
    return this._status?.type === 'success' ? 'Next steps' : 'Create your site';
  }

  renderSuccess() {
    const { siteName, orgName } = this._data;

    return html`
      <div class="success-panel">
        <h2>Edit content</h2>
        <p><a href="https://da.live/edit#/${orgName}/${siteName}/nav" target="_blank">Edit main navigation</a></p>
        <p><a href="https://da.live/edit#/${orgName}/${siteName}/footer" target="_blank">Edit footer</a></p>
        <p><a href="https://da.live/#/${orgName}/${siteName}" target="_blank">View all content</a></p>
      </div>
      <div class="success-panel">
        <h2>View site</h2>
        <p><a href="https://main--${siteName}--${orgName}.aem.page" target="_blank">Visit site</a></p>
      </div>
      <p class="status ${this._status.type || 'note'}">${this._status.message}</p>
    `;
  }

  renderRadioItems(items, name, onOpen) {
    return html`
      <div class="grid-list">
        <input type="hidden" name="${name}" value="" />
        ${items.map((item, i) => html`
              <div class="grid-list-item">
                <input id="${name}-${i}" type="radio" name="${name}" value="${item.value}" />
                <label for="${name}-${i}">${item.label}</label>
                <button @click="${(e) => {
    e.preventDefault();
    onOpen(item);
  }}"><img src="https://da.live/nx/public/icons/S2_Icon_OpenIn_20_N.svg" /></button>
              </div>
            `)}
      </div>
    `;
  }

  renderForm() {
    return html`
      <form>
        <div class="fieldgroup">
          <label>Organization name</label>
          <sl-input type="text" name="organization" placeholder="Organization name"></sl-input>
        </div>
        <div class="fieldgroup">
          <label>Repository name</label>
          <sl-input type="text" name="repo" placeholder="Repository name"></sl-input>
        </div>
        <div class="fieldgroup">
          <label>Select content blueprint</label>
          ${this.renderRadioItems(blueprints, 'blueprint', onOpenBlueprint)}
        </div>
        <div class="form-footer">
          <div>
          </div>
          <div class="time-actions">
            <p>${this._time}</p>
            <sl-button ?disabled=${this._loading} @click=${this.handleSubmit}>Create site</sl-button>
          </div>
        </div>
        ${this._status ? html`<p class="status ${this._status?.type || 'note'}">${this._status?.message}</p>` : nothing}
      </form>
    `;
  }

  render() {
    return html`
      <h1>${this._heading}</h1>
      ${this._status?.type === 'success' ? this.renderSuccess() : this.renderForm()}
    `;
  }
}

customElements.define('da-generator', Generator);

export default function decorate(el) {
  el.innerHTML = '<da-generator></da-generator>';
}
