/* eslint-disable max-classes-per-file */
import { LitElement, html, nothing, spread } from 'da-lit';
import getStyle from '../../utils/styles.js';

const style = await getStyle(import.meta.url);

class SlInput extends LitElement {
  static properties = {
    name: { type: String },
    label: { type: String },
    type: { type: String },
    placeholder: { type: String },
  };

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  get _attrs() {
    return this.getAttributeNames().reduce((acc, name) => {
      if ((name === 'class' || name === 'label')) return acc;
      acc[name] = this.getAttribute(name);
      return acc;
    }, {});
  }

  render() {
    return html`
      <div class="sl-inputfield">
        ${this.label ? html`<label for="sl-input-${this.name}">${this.label}</label>` : nothing}
        <input class="${this.getAttribute('class')}" ${spread(this._attrs)} />
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
        ${this.label ? html`<label for="sl-input-${this.name}">${this.label}</label>` : nothing}
        <div class="sl-inputfield-select-wrapper">
          <select id="nx-input-exp-opt-for" @change=${this.handleChange}> </select>
        </div>
      </div>
    `;
  }
}

class SlButton extends LitElement {
  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  get _attrs() {
    return this.getAttributeNames().reduce((acc, name) => {
      if ((name === 'class' || name === 'label')) return acc;
      acc[name] = this.getAttribute(name);
      return acc;
    }, {});
  }

  render() {
    return html`<button class="${this.getAttribute('class')}" ${spread(this._attrs)}><slot></slot></button>`;
  }
}

customElements.define('sl-input', SlInput);
customElements.define('sl-select', SlSelect);
customElements.define('sl-button', SlButton);
