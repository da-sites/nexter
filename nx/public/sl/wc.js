/* eslint-disable max-classes-per-file */
import { LitElement, html, nothing } from 'da-lit';
import getStyle from '../../utils/styles.js';

const style = await getStyle(import.meta.url);

class SlInput extends LitElement {
  static properties = {
    name: { type: String },
    label: { type: String },
    placeholder: { type: String },
    _options: { state: true },
  };

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  render() {
    return html`
      <div class="sl-inputfield">
        ${this.label ? html`<label for="sl-input-${this.name}">${this.label}</label>` : nothing}
        <input id="sl-input-${this.name}" type="text" placeholder="${this.placeholder}" />
      </div>
    `;
  }
}

class SlSelect extends LitElement {
  static properties = {
    name: { type: String },
    label: { type: String },
    placeholder: { type: String },
  };

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  handleChange(event) {
    const wcEvent = new event.constructor(event.type, event);
    this.dispatchEvent(wcEvent);
  }

  handleSlotchange(e) {
    const childNodes = e.target.assignedNodes({ flatten: true });
    const field = this.shadowRoot.querySelector('select');
    field.append(...childNodes);
  }

  render() {
    return html`
      <slot @slotchange=${this.handleSlotchange}></slot>
      <div class="sl-inputfield">
        <label for="nx-input-exp-opt-for">Optimizing for</label>
        <div class="sl-inputfield-select-wrapper">
          <select id="nx-input-exp-opt-for" @change=${this.handleChange}> </select>
        </div>
      </div>
    `;
  }
}

customElements.define('sl-select', SlSelect);
customElements.define('sl-input', SlInput);
