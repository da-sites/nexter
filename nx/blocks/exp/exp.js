// eslint-disable-next-line import/no-unresolved
import { html, LitElement, nothing } from 'da-lit';
import { getConfig, loadStyle } from '../../scripts/nexter.js';
import getStyle from '../../utils/styles.js';
import getSvg from '../../utils/svg.js';
import {
  deleteExperiment,
  getIsAllowed,
  getDefaultData,
  getErrors,
  observeDetailsEdited,
  processDetails,
  saveDetails,
} from './utils.js';

// Super Lite
import '../../public/sl/components.js';

// Sub-components
import './views/login.js';
import './views/view.js';
import './views/edit.js';

const { nxBase } = getConfig();

document.body.style = 'height: 600px; overflow: hidden;';
const sl = await getStyle(`${nxBase}/public/sl/styles.css`);
const exp = await getStyle(import.meta.url);

const ICONS = [`${nxBase}/public/icons/S2_Icon_Add_20_N.svg`];

class NxExp extends LitElement {
  static properties = {
    port: { attribute: false },
    _ims: { state: true },
    _isAllowed: { state: true },
    _view: { state: true },
    _page: { state: true },
    _details: { state: true },
    _errors: { state: true },
    _status: { state: true },
    _modified: { state: true },
    _alertMessage: { state: true, type: Object },
  };

  async connectedCallback() {
    super.connectedCallback();
    getSvg({ parent: this.shadowRoot, paths: ICONS });
    this.shadowRoot.adoptedStyleSheets = [sl, exp];
  }

  /**
   * Handle the profile web component loading.
   *
   * We should show nothing until this data is loaded.
   *
   * @param {Event} e the event
   */
  async handleProfileLoad(e) {
    // This will have the entire profile or be anon.
    this._ims = e.detail;

    const { ok } = await getIsAllowed(this._page);
    this._isAllowed = ok;
  }

  async handleMessage({ data }) {
    const { page, experiment } = data;
    if (page) {
      // Only load the profile (and IMS) after we get the page data
      await import('../profile/profile.js');
      this._page = data.page;
    }
    if (experiment) {
      const expData = experiment.name ? experiment : getDefaultData(this._page);
      const details = processDetails(expData);
      this._details = observeDetailsEdited(details, () => { this._modified = true; });
      this._view = expData.name ? 'view' : 'edit';
    }
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

  setStatus(text, type) {
    if (!text) {
      this._status = null;
    } else {
      this._status = { text, type };
    }
    this.requestUpdate();
  }

  async handleNewExp() {
    const experiment = getDefaultData(this._page);
    this._details = processDetails(experiment);
    this.requestUpdate();
  }

  async handleNewVariant(e) {
    e.preventDefault();
    this._details.variants.push({});
    this._details = processDetails(this._details);
    this.requestUpdate();
  }

  handleOpen(e, idx) {
    e.preventDefault();
    this._details.variants.forEach((variant, index) => {
      variant.open = idx === index ? !variant.open : false;
    });
    this.requestUpdate();
  }

  handleDelete(idx) {
    if (idx === 0) return;
    this._details.variants.splice(idx, 1);
    this.fixPercentages(null, false);
    this.requestUpdate();
  }

  handleDeleteExperiment() {
    this._alertMessage = {
      title: 'Confirm deletion',
      message: 'Are you sure you want to delete this experiment? This will remove the data and re-publish the page.',
      onConfirm: () => {
        this._alertMessage = null;
        deleteExperiment(this._page, this._details, this.setStatus.bind(this)).then(() => {
          this._details = null;
        });
      },
      onCancel: () => { this._alertMessage = null; },
    };
  }

  handleNameInput(e) {
    this._details.name = e.target.value.replaceAll(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    this.requestUpdate();
  }

  handleSelectChange(e, prop) {
    this._details[prop] = e.target.value;
  }

  fixPercentages(editedIndex, isIncrease) {
    // make sure the percentages add up to 100%
    const usedInput = this._details.variants[editedIndex];
    const otherInputs = this._details.variants.filter((v, i) => i !== editedIndex);
    const percentToDistribute = 100 - (usedInput?.percent ?? 0);
    const otherInputsPercent = otherInputs.reduce((acc, input) => acc + input.percent, 0);

    otherInputs.forEach((variant) => {
      const variantShare = (Math.max(variant.percent, 1) / Math.max(otherInputsPercent, 1))
        * percentToDistribute;
      variant.percent = Math.round(variantShare / 5) * 5;
    });

    const totalPercent = this._details.variants.reduce((acc, input) => acc + input.percent, 0);

    const findMin = (acc, input) => (input.percent < acc.percent ? input : acc);
    const findMax = (acc, input) => (input.percent > acc.percent ? input : acc);
    const variantToEdit = isIncrease ? otherInputs.reduce(findMin) : otherInputs.reduce(findMax);
    variantToEdit.percent += 100 - totalPercent;
  }

  handlePercentInput(e, idx) {
    const increase = e.target.value > this._details.variants[idx].percent;
    this._details.variants[idx].percent = parseInt(e.target.value, 10);
    this.fixPercentages(idx, increase);

    this.requestUpdate();
  }

  handleUrlInput(e, idx) {
    this._details.variants[idx].url = e.target.value;
    this.requestUpdate();
  }

  handleDateChange(e, name) {
    this._details[name] = e.target.value;
  }

  async handleSave(e, status, forcePublish = false) {
    e.preventDefault();
    this._errors = getErrors(this._details);
    if (this._errors) {
      this.setStatus('Please fix errors.', 'error');
      return;
    }

    const onConfirm = async () => {
      this._alertMessage = null;
      // Set the experiment status based on the button clicked
      this._details.status = status;

      // Bind to this so it can be called outside the class
      const setStatus = this.setStatus.bind(this);
      const result = await saveDetails(this._page, this._details, setStatus, forcePublish);
      if (result.status !== 'ok') return;
      this.port.postMessage({ reload: true });
    };

    this._alertMessage = {
      title: 'Confirm action',
      message: `Moving the experiment to ${status} status will also update the page to include any other changes since the last modification. Do you wish to continue?`,
      onConfirm,
    };
  }

  handleLink(e, href) {
    e.preventDefault();
    window.open(href, '_blank');
  }

  handlePreview(e, param) {
    e.preventDefault();

    if (!this._modified) {
      this.port.postMessage({ preview: param });
      return;
    }

    this._alertMessage = {
      title: 'Unsaved Changes',
      message: 'You have unsaved changes in the experimentation plugin. Simulating an experiment will discard these changes. Do you wish to continue?',
      onConfirm: () => {
        this._alertMessage = null;
        this.port.postMessage({ preview: param });
      },
      onCancel: () => {
        this._alertMessage = null;
      },
    };
  }

  handleViewAction(e) {
    if (e.detail.action === 'delete') {
      // delete
      return;
    }
    if (e.detail.action === 'edit') {
      this._view = 'edit';
      return;
    }
    if (e.detai.action === 'pause') {
      // pause
    }
  }

  get _placeholder() {
    return `${this._page.origin}/experiments/
      ${this._details.name ? `${this._details.name}/` : ''}...`;
  }

  renderHeader() {
    return html`
      <div class="nx-exp-header">
        <h1>Experimentation</h1>
        <nx-profile loginPopup="true" @loaded=${this.handleProfileLoad}></nx-profile>
      </div>
    `;
  }

  renderLogin() {
    return html`
      <div class="nx-new-wrapper">
        <div class="nx-new">
          <img
              alt=""
              src="${nxBase}/img/icons/S2IconLogin20N-icon.svg"
              class="nx-new-icon nx-space-bottom-200" />
          <p class="sl-heading-m nx-space-bottom-100">${title}</p>
          <p class="sl-body-xs nx-space-bottom-300">${message}</p>
        </div>
      </div>
    `;
  }

  renderReady() {
    // Do nothing until we have some value.
    if (this._isAllowed === undefined) return nothing;

    // Show the switch profile screen.
    if (this._isAllowed === false) return '<h1>Not allowed.</h1>';

    // If allowed, allow stuff...
    if (this._isAllowed) {
      // If someone set the view to edit, use it.
      if (this._view === 'edit') {
        return html`
          <nx-exp-edit .details=${this._details}>
          </nx-exp-edit>`;
      }

      // Default to the view screen with details.
      if (this._details) {
        return html`
          <nx-exp-view
            .details=${this._details}
            @action=${this.handleViewAction}>
          </nx-exp-view>
        `;
      }
    }
    return nothing;
  }

  render() {
    return html`
      ${this.renderHeader()}
      ${this._ims?.anonymous ? html`<nx-exp-login></nx-exp-login>` : this.renderReady()}
    `;
  }
}

customElements.define('nx-exp', NxExp);

export default async function init() {
  await loadStyle(`${nxBase}/public/sl/styles.css`);
  const expCmp = document.createElement('nx-exp');
  document.body.append(expCmp);

  window.addEventListener('message', (e) => {
    if (e.data?.includes?.('from_ims=true')) window.location.reload();
    if (e.data && e.data.ready) [expCmp.port] = e.ports;
  });

  window.onbeforeunload = () => {
    expCmp.port.postMessage({ reset: true });
  };
}
