import { html, LitElement } from 'da-lit';
import { getConfig } from '../../../scripts/nexter.js';
import getStyle from '../../../utils/styles.js';
import getSvg from '../../../utils/svg.js';

import { strings, getAbb, formatDate } from '../utils.js';

const { nxBase } = getConfig();

const sl = await getStyle(`${nxBase}/public/sl/styles.css`);
const style = await getStyle(import.meta.url);

const ICONS = [`${nxBase}/public/icons/S2_Icon_Delete_20_N.svg`];

class NxExpView extends LitElement {
  static properties = {
    details: { attribute: false },
  };

  handleClick(action) {
    const opts = { detail: { action }, bubbles: true, composed: true };
    const event = new CustomEvent('action', opts);
    this.dispatchEvent(event);
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [sl, style];
    getSvg({ parent: this.shadowRoot, paths: ICONS });
    this._status = this.details?.experimentStatus;
  }

  render() {
    return html`
      <div class="nx-exp-view-name-area">
        <div class="nx-exp-view-name-card">
          <div class="nx-exp-abb nx-exp-abb-${this._status}">${getAbb(this.details.name)}</div>
          <div>
            <p class="nx-exp-name">${this.details.name}</p>
            <p class="nx-exp-status nx-exp-status-${this._status}">
              ${this._status}
            </p>
          </div>
        </div>
        <div class="nx-exp-name-actions">
          <button class="nx-action-button" @click=${() => this.handleClick('edit')}>
            <img src="${nxBase}/public/icons/S2_Icon_Edit_20_N.svg" width="20" height="20" />
            <span>Edit</span>
          </button>
          <button class="nx-action-button" @click=${() => this.handleClick('pause')}>
            <img src="${nxBase}/public/icons/S2_Icon_Pause_20_N.svg" width="20" height="20" />
            <span>Pause</span>
          </button>
        </div>
      </div>
      <div class="nx-exp-view-details-area">
        <div class="nx-exp-detail-row">
          <div class="nx-exp-detail-col">
            <p class="nx-exp-detail-label">Type</p>
            <p class="nx-exp-detail-content">${strings[this.details.type]}</p>
          </div>
          <div class="nx-exp-detail-col">
            <p class="nx-exp-detail-label">Goal</p>
            <p class="nx-exp-detail-content">${strings[this.details.goal]}</p>
          </div>
        </div>
        <div class="nx-exp-detail-row">
          <div class="nx-exp-detail-col">
            <p class="nx-exp-detail-label">Start date</p>
            <p class="nx-exp-detail-content">${formatDate(this.details.startDate)}</p>
          </div>
          <div class="nx-exp-detail-col">
            <p class="nx-exp-detail-label">End date</p>
            <p class="nx-exp-detail-content">${formatDate(this.details.startDate)}</p>
          </div>
        </div>
      </div>
      <div class="nx-action-area">
        <p class="nx-status nx-status-type-${this._status?.type || 'info'}">${this._status?.text}</p>
        <div>
          <sl-button class="negative" @click=${() => this.handleClick('delete')}>
            <svg class="icon"><use href="#S2_Icon_Delete_20_N"/></svg>
            <span>Delete</span>
          </sl-button>
        </div>
      </div>
    `;
  }
}

customElements.define('nx-exp-view', NxExpView);
