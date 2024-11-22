import { LitElement, html } from '../../../deps/lit/lit-core.min.js';
import { getConfig } from '../../../scripts/nexter.js';
import getStyle from '../../../utils/styles.js';
import { daFetch } from '../../../utils/daFetch.js';

const { nxBase } = getConfig();
const style = await getStyle(import.meta.url);
const buttons = await getStyle(`${nxBase}/styles/buttons.js`);

class NxLocDashboard extends LitElement {
  static properties = {
    _view: { attribute: false },
    _projects: { attribute: false },
  };

  async getProjects() {
    const siteBase = window.location.hash.replace('#', '');
    console.log(`siteBase: ${siteBase}`);
    const resp = await daFetch(`https://admin.da.live/list${siteBase}/.da/translation/projects/active`);
    if (!resp.ok) return;
    const projectList = await resp.json();
    // console.log(`Project JSON : ${JSON.stringify(projectList)`);
    this._projects = await Promise.all(projectList.map(async (project) => {
      const projResp = await daFetch(`https://admin.da.live/source${project.path}`);
      const projJson = await projResp.json();
      console.log(projJson);
      project.title = projJson.title;
      // console.log(project);
      return project;
    }));
  }

  create() {
    this._view = 'create';
  }

  connectedCallback() {
    this.getProjects();
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style, buttons];
  }

  render() {
    return html`
      ${this._view !== 'create' ? html`
      <h1>Dashboard</h1>
      <button class='accent' @click=${this.create}>Create Project</button>
      ${this._projects ? html`
      <ul>
      ${this._projects.map((project) => html`
      <li>
        <a href="#${project.path.replace('.json', '')}">${project.title}</a>
      </li>`)}
      </ul>
      ` : html`<p>Loading...</p>`}
      `
    : html`<nx-loc-setup></nx-loc-setup>`}
    `;
  }
}

customElements.define('nx-loc-dashboard', NxLocDashboard);
