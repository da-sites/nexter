import { LitElement, html, nothing } from 'da-lit';
import { getConfig, loadStyle } from '../../scripts/nexter.js';
import { getAbb, processDetails, toColor } from './utils/utils.js';
import getStyle from '../../utils/styles.js';
import getSvg from '../../utils/svg.js';

import '../../public/sl/components.js';
import '../profile/profile.js';

const { nxBase } = getConfig();

document.body.style = 'height: 600px; overflow: hidden;';
const sl = await getStyle(`${nxBase}/public/sl/styles.css`);
const exp = await getStyle(import.meta.url);

const ICONS = [`${nxBase}/img/icons/S2IconUsersNo20N-icon.svg`];

class NxExp extends LitElement {
  static properties = {
    port: { attribute: false },
    _ims: { state: true },
    _connected: { state: true },
    _page: { state: true },
    _details: { state: true },
  };

  async connectedCallback() {
    super.connectedCallback();
    getSvg({ parent: this.shadowRoot, paths: ICONS });
    this.shadowRoot.adoptedStyleSheets = [sl, exp];
  }

  update(props) {
    if (props.has('port') && this.port) {
      // Post a message saying this side is ready.
      this.port.postMessage({ ready: true });
      // Wait for more messages from the other side.
      this.port.onmessage = (e) => { this.handleMessage(e); };
    }
    super.update();
  }

  async handleMessage({ data }) {
    if (data.experiment) {
      this._details = processDetails(data.experiment);
    }
    if (data.page) {
      this._page = data.page;
    }
    this._connected = true;
  }

  handleProfileLoad() {
    this._ims = true;
  }

  async handleNew() {
    const experiment = (await import('./utils/data-model.js')).default;
    this._details = processDetails(experiment);
    this.requestUpdate();
  }

  handleOpen(e, idx) {
    e.preventDefault();
    this._details.variants.forEach((variant, index) => {
      variant.open = idx === index ? !variant.open : false;
    });
    this.requestUpdate();
  }

  renderHeader() {
    return html`
      <div class="nx-exp-header">
        <h1>Experimentation</h1>
        <nx-profile @loaded=${this.handleProfileLoad}></nx-profile>
      </div>
    `;
  }

  renderNone() {
    return html`
      <div class="nx-new-wrapper">
        <div class="nx-new">
          <img src="${nxBase}/img/icons/S2IconUsersNo20N-icon.svg" alt="" class="nx-new-icon nx-space-bottom-200" />
          <p class="sl-heading-m nx-space-bottom-100">No experiments on this page.</p>
          <p class="sl-body-xs nx-space-bottom-300">
            Create a new experiment to start optimizing your web page.
          </p>
          <div class="nx-new-action-area">
            <sl-button @click=${this.handleNew}>Create new</sl-button>
          </div>
        </div>
      </div>
    `;
  }

  renderVariants() {
    return html`
      <div class="nx-variants-area">
        <p class="nx-variants-heading">Variants</p>
        <ul class="nx-variants-list">
          ${this._details.variants?.map((variant, idx) => html`
            <li class="${variant.open ? 'is-open' : ''}">
              <div class="nx-variant-name">
                <span style="background: var(${toColor(variant.name)})">${getAbb(variant.name)}</span>
                <p>${variant.name}</p>
                <sl-input type="range" id="split" name="volume" min="0" max="100"></sl-input>
                <button @click=${(e) => this.handleOpen(e, idx)} class="nx-exp-btn-more">Details</button>
              </div>
              <div class="nx-variant-details">
                <hr/>
                <sl-input
                  class="nx-space-bottom-200 quiet"
                  label="URL"
                  type="text"
                  name="url"
                  value="${variant.url}"
                  placeholder="${this._page.origin}/experiments/..."></sl-input>
                <div class="nx-variant-action-area ${variant.name === 'control' ? 'is-control' : ''}">
                  <button>Edit</button>
                  ${variant.name !== 'control' ? html`<button>Open</button>` : nothing}
                  <button>Preview</button>
                  ${variant.name !== 'control' ? html`<button>Delete</button>` : nothing}
                </div>
              </div>
            </li>
          `)}
        </ul>
      </p>
    `;
  }

  renderDates() {
    return html`
      <div class="nx-date-area">
        <div class="nx-grid-two-up nx-space-bottom-100">
          <sl-input label="Start date" type="date" id="start" name="start" min="2025-03-01"></sl-input>
          <sl-input label="End date" type="date" id="end" name="end" min="2025-03-01"></sl-input>
        </div>
      </div>
    `;
  }

  renderActions() {
    return html`
      <div class="nx-action-area nx-action-area-right">
        <sl-button class="primary outline">Save as draft</sl-button>
        <sl-button>Publish</sl-button>
      </div>
    `;
  }

  renderDetails() {
    return html`
      <form>
        <div class="nx-exp-details-header nx-space-bottom-200">
          <button aria-label="Back">
            <img class="nx-exp-back" src="${nxBase}/img/icons/S2_Icon_Undo_20_N.svg" />
          </button>
          <p class="sl-heading-m">Edit experiment</p>
        </div>
        <div class="nx-details-area">
          <sl-input value="${this._details.name}" type="text" label="Name" name="exp-name" placeholder="Enter experiment name" class="nx-space-bottom-100"></sl-input>
          <div class="nx-grid-two-up nx-space-bottom-300">
            <sl-select label="Type" name="exp-type" @change=${this.handleTypeChange}>
              <option>A/B test</option>
              <option>MAB</option>
            </sl-select>
            <sl-select label="Goal" name="exp-opt-for" @change=${this.handleTypeChange}>
              <option>Overall conversion</option>
              <option>Form submission</option>
              <option>Engagement</option>
            </sl-select>
          </div>
        </div>
        ${this.renderVariants()}
        ${this.renderDates()}
        ${this.renderActions()}
      </form>
    `;
  }

  renderReady() {
    return this._details?.variants?.length > 1 ? this.renderDetails() : this.renderNone();
  }

  render() {
    return html`
      ${this.renderHeader()}
      ${this._ims && this._connected ? this.renderReady() : nothing}
    `;
  }
}

customElements.define('nx-exp', NxExp);

export default async function init() {
  await loadStyle(`${nxBase}/public/sl/styles.css`);
  const expCmp = document.createElement('nx-exp');

  window.addEventListener('message', (e) => {
    if (e.data && e.data.ready) [expCmp.port] = e.ports;
  });

  document.body.append(expCmp);
}
