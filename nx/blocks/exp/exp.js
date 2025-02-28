import { LitElement, html, nothing } from 'da-lit';
import { getConfig } from '../../scripts/nexter.js';
import { getAbb, toColor } from './utils/utils.js';
import getStyle from '../../utils/styles.js';
import getSvg from '../../utils/svg.js';

import '../../public/sl/wc.js';
import '../profile/profile.js';

const { nxBase } = getConfig();
const style = await getStyle(import.meta.url);

const ICONS = [`${nxBase}/img/icons/S2IconUsersNo20N-icon.svg`];

class NxExp extends LitElement {
  static properties = {
    port: { attribute: false },
    _ims: { state: true },
    _connected: { state: true },
    _details: { state: true },
  };

  async connectedCallback() {
    super.connectedCallback();
    getSvg({ parent: this.shadowRoot, paths: ICONS });
    this.shadowRoot.adoptedStyleSheets = [style];
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
    if (data.name) {
      this._details = data;
    }
    this._connected = true;
  }

  handleProfileLoad() {
    this._ims = true;
  }

  async handleNew() {
    this._details = (await import('./utils/data-model.js')).default;
  }

  handleTypeChange() {
    console.log('Hello');
  }

  handleOpen(e, idx) {
    e.preventDefault();
    const isOpen = this._details.variants[idx].open;
    if (isOpen) {
      this._details.variants[idx].open = false;
    } else {
      // Loop through all and close
      this._details.variants.forEach((variant) => {
        variant.open = false;
      });
      this._details.variants[idx].open = true;
    }
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
          <img src="${nxBase}/img/icons/S2IconUsersNo20N-icon.svg" alt="" class="nx-new-icon" />
          <h2 class="spectrum-Heading spectrum-Heading--sizeS">No experiments on this page</h2>
          <p class="spectrum-Body spectrum-Body--sizeS nx-new-body">
            Create a new experiment to start optimizing your web page.
          </p>
          <sp-button-group class="nx-new-buttons">
            <sp-button variant="secondary">View docs</sp-button>
            <sp-button @click=${this.handleNew}>Create new</sp-button>
          </sp-button-group>
        </div>
      </div>
    `;
  }

  renderVariants() {
    return html`
      <h2 class="spectrum-Heading spectrum-Heading--sizeXS nx-space-bottom-200">Variants</h2>
      <ul class="nx-variants-list nx-space-bottom-300">
        ${this._details.variants?.map((variant, idx) => html`
          <li class="${variant.open ? 'is-open' : ''}">
            <span style="background: ${toColor(variant.name)}">
              ${getAbb(variant.name)}
            </span>
            <p>${variant.name}</p>
            <div class="sl-inputfield">
              <input type="range" id="split" name="volume" min="0" max="100" />
            </div>
            <button @click=${(e) => this.handleOpen(e, idx)} class="sl-button sl-button-icon-only nx-exp-btn-more">Details</button>
          </li>
        `)}
      </ul>
    `;
  }

  renderDates() {
    return html`
      <div class="sl-fieldgroup sl-fieldgroup-two-up nx-space-bottom-300">
        <div class="sl-inputfield nx-space-bottom-100">
          <label for="nx-input-exp-name">Start date</label>
          <input type="date" id="start" name="trip-start" value="2018-07-22" min="2018-01-01" max="2018-12-31" />
        </div>
        <div class="sl-inputfield nx-space-bottom-100">
          <label for="nx-input-exp-name">Start date</label>
          <input type="date" id="start" name="trip-start" value="2018-07-22" min="2018-01-01" max="2018-12-31" />
        </div>
      </div>
    `;
  }

  renderDetails() {
    return html`
      <form class="nx-details">
        <h2 class="spectrum-Heading spectrum-Heading--sizeS nx-space-bottom-200">Edit experiment</h2>
        <hr class="sl-rule"></div>

        <sl-input name="exp-name" placeholder="Enter experimentation name"></sl-input>

        <div class="sl-fieldgroup sl-fieldgroup-two-up nx-space-bottom-300">
          <sl-select name="exp-type" @change=${this.handleTypeChange}>
            <option>A/B test</option>
            <option>MAB</option>
          </sl-select>

          <div class="sl-inputfield">
            <label for="nx-input-exp-opt-for">Optimizing for</label>
            <div class="sl-inputfield-select-wrapper">
              <select id="nx-input-exp-opt-for">
                <option>Overall conversion</option>
                <option>Form submission</option>
                <option>Engagement</option>
              </select>
            </div>
          </div>
        </div>
        <hr class="sl-rule"></div>
        ${this.renderVariants()}
        ${this.renderDates()}
      </form>
    `;
  }

  renderReady() {
    return this._details ? this.renderDetails() : this.renderNone();
  }

  render() {
    return html`
      ${this.renderHeader()}
      ${this._ims && this._connected ? this.renderReady() : nothing}
    `;
  }
}

customElements.define('nx-exp', NxExp);

export default function init() {
  const exp = document.createElement('nx-exp');

  window.addEventListener('message', (e) => {
    if (e.data && e.data.ready) [exp.port] = e.ports;
  });

  document.body.append(exp);
}
