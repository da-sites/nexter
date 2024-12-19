/* eslint-disable max-len */

let globalDntConfig;
const ALT_TEXT_PLACEHOLDER = '*alt-placeholder*';

const getHtmlSelector = (blockscope, blockConfig) => {
  const getChildSelector = (indexStr) => {
    if (indexStr === '*' || Number.isNaN(indexStr)) {
      return ' > div';
    }
    const index = Number(indexStr);
    return index > 0 ? ` > div:nth-child(${index})` : ` > div:nth-last-child(${Math.abs(index)})`;
  };

  if (blockscope === 'noblock') {
    return 'body > div';
  }
  const blockSelector = `.${blockscope.toLowerCase().replace(/\s+/g, ' ').trim().replaceAll(' ', '-')}`;
  const column = blockConfig.column.trim();
  const row = blockConfig.row.trim();
  if (column === '*' && row === '*') {
    return blockSelector;
  }
  const rowSelector = getChildSelector(row);
  const columnSelector = getChildSelector(column);
  return `${blockSelector}${rowSelector}${columnSelector}`;
};

const extractPattern = (rule) => {
  const { pattern } = rule;
  let condition = 'exists';
  let match = '*';
  if (pattern && pattern.length > 0) {
    if (pattern !== '*' && pattern.includes('(') && pattern.includes(')')) {
      condition = pattern.substring(0, pattern.indexOf('(')).trim();
      match = (pattern.substring(pattern.indexOf('(') + 1, pattern.indexOf(')')).split('||')).map((item) => item.trim());
    }
  }
  return { condition, match };
};

const parseDntConfig = (config) => {
  if (globalDntConfig) return globalDntConfig;

  const dntConfig = new Map();

  // Docx Rule Set
  dntConfig.set('docRules', new Map());

  // Get empty map
  const docRules = dntConfig.get('docRules');

  // Iterate through config doc rules
  config['dnt-doc-rules'].data.forEach((blockRule) => {
    const blockScopeArray = blockRule.block_scope.split(',');
    blockScopeArray.forEach((blockScope) => {
      const selector = getHtmlSelector(blockScope.trim(), blockRule);
      const patternInfo = extractPattern(blockRule);
      const blockConfig = { ...patternInfo, action: blockRule.action };
      if (docRules.has(selector)) {
        docRules.get(selector).push(blockConfig);
      } else {
        docRules.set(selector, [blockConfig]);
      }
    });
  });

  // Docx Content Set
  dntConfig.set('contentRules', []);

  const docContent = dntConfig.get('contentRules');

  config['dnt-content-rules'].data.forEach((contentRule) => {
    docContent.push(contentRule.content);
  });

  // Sheet Rule Set
  dntConfig.set('sheetRules', []);
  const sheetRules = dntConfig.get('sheetRules');
  config['dnt-sheet-rules'].data.forEach((sheetRule) => {
    sheetRules.push(extractPattern(sheetRule));
  });

  globalDntConfig = dntConfig;
  return globalDntConfig;
};

function removeDntAttributes(document) {
  const dntEls = document.querySelectorAll('[translate="no"]');
  dntEls.forEach((el) => { el.removeAttribute('translate'); });
}

const setDntAttribute = (el) => {
  el.setAttribute('translate', 'no');
};

const addDntAttribute = (selector, operations, document) => {
  document.querySelectorAll(selector).forEach((element) => {
    operations.forEach((operation) => {
      const dntElement = operation.action === 'dnt-row' ? element.parentNode : element;
      if (operation.condition === 'exists') {
        setDntAttribute(dntElement);
      } else {
        const matchTexts = operation.match;
        const elementText = element.textContent;
        if (
          (operation.condition === 'equals' && matchTexts.includes(elementText)) ||
          (operation.condition === 'beginsWith' && matchTexts.some((matchText) => elementText.startsWith(matchText))) ||
          (operation.condition === 'has' && matchTexts.every((matchText) => element.querySelector(matchText)))
        ) {
          setDntAttribute(dntElement);
        }
      }
    });
  });
};

const addDntWrapper = (node, dntContent) => {
  node.innerHTML = node.innerHTML.replaceAll(dntContent, `<span translate="no" class="dnt-text">${dntContent}</span>`);
};

const findAndAddDntWrapper = (document, dntContent) => {
  const contentMatches = document.evaluate(`//text()[contains(., "${dntContent}")]/..`, document, null, 0, null);
  // eslint-disable-next-line no-underscore-dangle
  contentMatches?._value?.nodes.forEach((node) => {
    addDntWrapper(node, dntContent);
  });
};

const processAltText = (document) => {
  const hasPipe = (text) => text && text.includes('|');
  const hasUrl = (text) => text && ['http://', 'https://'].some((matchText) => text.startsWith(matchText));
  const getAltTextDntInfo = (text) => {
    const textHasUrl = hasUrl(text);
    const textHasPipe = hasPipe(text);
    if (textHasUrl && !textHasPipe) {
      return { alt: null, dnt: text };
    }
    if (textHasUrl && textHasPipe) {
      const urlAndAltText = text.split('|');
      if (urlAndAltText.length >= 2) {
        const altText = urlAndAltText[1].trim();
        const altPlaceholder = urlAndAltText[1].replace(altText, ALT_TEXT_PLACEHOLDER);
        const suffix = urlAndAltText.length > 2 ? `|${urlAndAltText.slice(2, urlAndAltText.length).join('|')}` : '';
        return { alt: altText, dnt: `${urlAndAltText[0]}|${altPlaceholder}${suffix}` };
      }
    }
    return { alt: text, dnt: null };
  };

  document.querySelectorAll('a').forEach((element) => {
    const elementText = element.textContent;
    const { alt, dnt } = getAltTextDntInfo(element.textContent);
    if (dnt) {
      if (alt) {
        addDntWrapper(element, elementText.substring(0, dnt.indexOf(ALT_TEXT_PLACEHOLDER)));
        const altTextSuffix = elementText.substring(dnt.indexOf(ALT_TEXT_PLACEHOLDER) + alt.length);
        if (altTextSuffix) {
          addDntWrapper(element, altTextSuffix);
        }
      } else setDntAttribute(element);
    }
  });

  document.querySelectorAll('img').forEach((img) => {
    const { alt, dnt } = getAltTextDntInfo(img.getAttribute('alt'));
    if (dnt) {
      img.setAttribute('dnt-alt-content', dnt);
      if (alt) img.setAttribute('alt', alt);
      else img.removeAttribute('alt');
    }
  });
};

const addDntInfoToHtml = (html) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');

  // Match existing content sent to GLaaS
  document.querySelector('header')?.remove();
  document.querySelector('footer')?.remove();

  globalDntConfig.get('docRules').forEach((operations, selector) => {
    addDntAttribute(selector, operations, document);
  });
  globalDntConfig.get('contentRules').forEach((content) => {
    findAndAddDntWrapper(document, content);
  });

  processAltText(document);
  return document.documentElement.outerHTML;
};

const unwrapDntContent = (document) => {
  document.querySelectorAll('.dnt-text').forEach((dntSpan) => {
    const spanParent = dntSpan.parentNode;
    const textBefore = document.createTextNode(dntSpan.textContent);
    const textAfter = document.createTextNode('');

    spanParent.replaceChild(textAfter, dntSpan);
    spanParent.insertBefore(textBefore, textAfter);
    spanParent.normalize();
  });
};

const resetAltText = (document) => {
  document.querySelectorAll('img[dnt-alt-content]').forEach((img) => {
    img.setAttribute('alt', `${img.getAttribute('dnt-alt-content').replace(ALT_TEXT_PLACEHOLDER, img.getAttribute('alt'))}`);
    img.removeAttribute('dnt-alt-content');
  });
};

function makeImagesRelative(document) {
  const imgs = document.querySelectorAll('img[src*="media_"]');
  imgs.forEach((img) => {
    const { src } = img;
    const url = new URL(src);
    img.setAttribute('src', `.${url.pathname}`);
  });
}

export function removeDnt(html) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  unwrapDntContent(document);
  makeImagesRelative(document);
  resetAltText(document);
  removeDntAttributes(document);
  return document.documentElement.outerHTML;
}

export function addDnt(suppliedHtml, config) {
  parseDntConfig(config);
  return addDntInfoToHtml(suppliedHtml);
}