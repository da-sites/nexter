import {
  unified,
  remarkParse,
  remarkGridTable,
  toHtml,
  mdast2hast,
  defaultHandlers,
  raw,
  mdast2hastGridTablesHandler,
} from '../deps/mdast/dist/index.js';

function toBlockCSSClassNames(text) {
  if (!text) return [];
  const names = [];
  const idx = text.lastIndexOf('(');
  if (idx >= 0) {
    names.push(text.substring(0, idx));
    names.push(...text.substring(idx + 1).split(','));
  } else {
    names.push(text);
  }

  return names.map((name) => name
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, ''))
    .filter((name) => !!name);
}

function convertBlocks(editor) {
  const tables = editor.querySelectorAll('body > table');

  tables.forEach((table) => {
    const rows = [...table.querySelectorAll(':scope > tbody > tr, :scope > thead > tr')];
    const nameRow = rows.shift();
    const divs = rows.map((row) => {
      const cols = row.querySelectorAll(':scope > td, :scope > th');
      // eslint-disable-next-line no-shadow
      const divs = [...cols].map((col) => {
        const { innerHTML } = col;
        const div = document.createElement('div');
        div.innerHTML = innerHTML;
        return div;
      });
      const div = document.createElement('div');
      div.append(...divs);
      return div;
    });

    const div = document.createElement('div');
    div.className = toBlockCSSClassNames(nameRow.textContent).join(' ');
    div.append(...divs);
    table.parentElement.replaceChild(div, table);
  });
}

function makeSections(editor) {
  const children = editor.body.querySelectorAll(':scope > *');

  const section = document.createElement('div');
  const sections = [...children].reduce((acc, child) => {
    if (child.nodeName === 'HR') {
      child.remove();
      acc.push(document.createElement('div'));
    } else {
      acc[acc.length - 1].append(child);
    }
    return acc;
  }, [section]);

  editor.body.append(...sections);
}

// Generic docs have table blocks and HRs, but not ProseMirror decorations
export function docDomToAemHtml(dom) {
  convertBlocks(dom);
  makeSections(dom);
  return dom.body.innerHTML;
}

function makeHast(mdast) {
  const handlers = { ...defaultHandlers, gridTable: mdast2hastGridTablesHandler() };
  const hast = mdast2hast(mdast, { handlers, allowDangerousHtml: true });
  return raw(hast);
}

function removeImageSizeHash(dom) {
  const imgs = dom.querySelectorAll('[src*="#width"]');
  imgs.forEach((img) => {
    img.setAttribute('src', img.src.split('#width')[0]);
  });
}

export function mdToDocDom(md) {
  // convert linebreaks
  const converted = md.replace(/(\r\n|\n|\r)/gm, '\n');

  // convert to mdast
  const mdast = unified()
    .use(remarkParse)
    .use(remarkGridTable)
    .parse(converted);

  const hast = makeHast(mdast);

  let htmlText = toHtml(hast);
  htmlText = htmlText.replaceAll('.hlx.page', '.hlx.live');
  htmlText = htmlText.replaceAll('.aem.page', '.aem.live');

  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlText, 'text/html');
  removeImageSizeHash(dom);

  return dom;
}
