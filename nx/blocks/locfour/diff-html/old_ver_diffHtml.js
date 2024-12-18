/* global objectHash */

// eslint-disable-next-line import/no-unresolved
import './object_hash.js';

const MIN_LIST_ITEMS_IN_COMMON = 2;
const ADDED = 'added';
const ADDED_TAG = 'da-loc-added';
const DELETED = 'deleted';
const DELETED_TAG = 'da-loc-deleted';
const SAME = 'same';

const sectionBlock = {
  isSection: true,
  outerHTML: 'spoofedSectionHtml',
};

const isList = (block) => ['OL', 'UL'].includes(block.nodeName);

export function normalizeHTML(html) {
  return html.replace(/>\s+</g, '><').trim();
}

function getLists(result) {
  const addedLists = [];
  const deletedLists = [];
  result.forEach((item) => {
    if (item.type === ADDED && isList(item.block)) {
      addedLists.push(item);
    }
    if (item.type === DELETED && isList(item.block)) {
      deletedLists.push(item);
    }
  });
  return [addedLists, deletedLists];
}

function getListHashes(list) {
  return [...list.children].map((child) => {
    child.hash = objectHash(child.outerHTML);
    return child.hash;
  });
}

const listElToBlockMap = (listItems) => [...listItems].map((item) => ({
  hash: item.hash,
  block: item,
}));

function wrapContentWithElement(targetElement, wrapperElementTag) {
  const wrapperElement = document.createElement(wrapperElementTag);
  while (targetElement.firstChild) {
    wrapperElement.appendChild(targetElement.firstChild);
  }
  targetElement.appendChild(wrapperElement);
}

const convertToHtmlList = (mergedList) => mergedList
  .map((item) => {
    if (item.type === ADDED) {
      // LI's have the inner content wrapped, unlike other els that are wrapped outside
      wrapContentWithElement(item.block, ADDED_TAG);
    } else if (item.type === DELETED) {
      wrapContentWithElement(item.block, DELETED_TAG);
    }
    return item.block.outerHTML;
  }).join('');

function checkLists(res) {
  let result = res;
  const [addedLists, deletedLists] = getLists(result);
  // see if any of the added lists children match with any deleted list children
  addedLists.forEach((addedList) => {
    const addedItemHashes = getListHashes(addedList.block);
    deletedLists.forEach((deletedList) => {
      if (addedList.block.nodeName !== deletedList.block.nodeName) {
        return;
      }
      const deletedItemHashes = getListHashes(deletedList.block);
      const commonHashes = addedItemHashes.filter((hash) => deletedItemHashes.includes(hash));

      if (commonHashes.length >= MIN_LIST_ITEMS_IN_COMMON) {
        // lists have 2+ common listItems, so we assume that the langstore list has been modified

        // remove the deleted list
        result = result.filter((item) => item.hash !== deletedList.hash);

        const addedListItems = listElToBlockMap(addedList.block.children);
        const deletedListItems = listElToBlockMap(deletedList.block.children);

        // eslint-disable-next-line no-use-before-define
        const mergedList = blockDiff(addedListItems, deletedListItems, true);
        addedList.block.innerHTML = convertToHtmlList(mergedList);
        addedList.type = SAME;
      }
    });
  });
  return result;
}

function addToResult(result, newItem, type) {
  for (let i = 0; i < result.length; i += 1) {
    const resultItem = result[i];
    if (resultItem.hash !== newItem.hash || resultItem.type === SAME) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (resultItem.type === DELETED) {
      if (type === ADDED) {
        // remove the deleted item from the result, since it was moved
        return [...result.slice(0, i), ...result.slice(i + 1), { ...newItem, type: SAME }];
      }
      if (type === DELETED) {
        // item was deleted in both arrays
        return [...result, { ...newItem, type: DELETED }];
      }
    }
    if (resultItem.type === ADDED) {
      if (type === ADDED) {
        // item was added in both arrays
        return [...result, { ...newItem, type: ADDED }];
      }
      if (type === DELETED) {
        resultItem.type = SAME;
        return result;
      }
    }
  }
  result.push({ ...newItem, type });
  return result;
}

function blockDiff(A, B, isListCheck = false) {
  let result = [];
  const length = Math.min(A.length, B.length);
  let i = 0;
  for (i; i < length; i += 1) {
    if (A[i].hash === B[i].hash) {
      result = addToResult(result, A[i], SAME);
    } else {
      result = addToResult(result, A[i], DELETED);
      result = addToResult(result, B[i], ADDED);
    }
  }

  // Add any remaining items
  if (i < A.length) {
    for (; i < A.length; i += 1) {
      result = addToResult(result, A[i], DELETED);
    }
  }
  if (i < B.length) {
    for (; i < B.length; i += 1) {
      result = addToResult(result, B[i], ADDED);
    }
  }

  if (!isListCheck) {
    result = checkLists(result);
  }

  return result;
}

function groupBlocks(blocks) {
  const { groupedBlocks, currentGroup } = blocks.reduce((acc, block) => {
    if (block.className?.toLowerCase().startsWith('block-group-start')) {
      acc.isGrouping = true;
      acc.currentGroup.push(block);
    } else if (block.className?.toLowerCase().startsWith('block-group-end')) {
      acc.currentGroup.push(block);
      acc.groupedBlocks.push(acc.currentGroup);
      acc.currentGroup = [];
      acc.isGrouping = false;
    } else if (acc.isGrouping) {
      acc.currentGroup.push(block);
    } else {
      acc.groupedBlocks.push(block);
    }
    return acc;
  }, { groupedBlocks: [], currentGroup: [], isGrouping: false });

  if (currentGroup.length > 0) {
    groupedBlocks.push(currentGroup);
  }

  return groupedBlocks;
}

function blockGroupToStr(blockGroup) {
  return blockGroup.reduce((str, block) => {
    // eslint-disable-next-line no-param-reassign
    str += block.outerHTML || '';
    return str;
  }, '');
}

const isNotEmptyParagraphEl = (el) => !(el.nodeName === 'P' && !el.childNodes.length && el.textContent === '');

function getBlockMap(dom) {
  const sections = [...dom.querySelectorAll('main > div')];

  // flatten sections so that they are just dividers between blocks
  let blocks = sections.reduce((acc, section) => {
    const sectionBlocks = [...section.children]
      .filter(isNotEmptyParagraphEl);
    const sectionArr = acc.length ? [sectionBlock] : [];
    return [...acc, ...sectionArr, ...sectionBlocks];
  }, []);

  blocks = groupBlocks(blocks);

  return blocks.map((block) => {
    const stringToHash = normalizeHTML(block.outerHTML || blockGroupToStr(block));
    const hash = objectHash(stringToHash);
    return { block, hash };
  });
}

function getDiffArray(originalDOM, modifiedDOM) {
  const original = getBlockMap(originalDOM);
  const modified = getBlockMap(modifiedDOM);
  const diffArr = blockDiff(original, modified);
  return diffArr;
}

function wrapElement(targetElement, wrapperElementTag) {
  const wrapperElement = document.createElement(wrapperElementTag);
  wrapperElement.appendChild(targetElement);
  return wrapperElement;
}

function getGroupInnerHtml(blockGroup) {
  let htmlText = '';
  blockGroup.forEach((block) => {
    if (block.isSection) {
      htmlText += '</div><div>';
      return;
    }
    htmlText += block.outerHTML;
  });
  return htmlText;
}

function getBlockgroupHtml(blockGroup, type) {
  // Modified block groups automatically get sections at start and end
  const htmlText = getGroupInnerHtml(blockGroup);

  if (type === ADDED) {
    return `<${ADDED_TAG} class="da-group"><div>${htmlText}</div></${ADDED_TAG}>`;
  }
  if (type === DELETED) {
    return `<${DELETED_TAG} class="da-group"><div>${htmlText}</div></${DELETED_TAG}>`;
  }
  return htmlText;
}

function buildHtmlFromDiff(diff, modified) {
  let htmlText = '<div>';
  diff.forEach((item, i) => {
    let modifiedBlock = item.block;
    if (item.block.isSection && i !== 0) {
      htmlText += '</div><div>';
      return;
    }

    if (Array.isArray(item.block)) {
      htmlText += getBlockgroupHtml(item.block, item.type);
      return;
    }

    if (item.type === ADDED) {
      modifiedBlock = wrapElement(item.block, ADDED_TAG);
    } else if (item.type === DELETED) {
      modifiedBlock = wrapElement(item.block, DELETED_TAG);
    }
    htmlText += modifiedBlock.outerHTML;
  });
  htmlText += '</div>';

  modified.documentElement.querySelector('main').innerHTML = htmlText;
  return modified;
}

export const removeLocTags = (html) => {
  const locElsToRemove = html.querySelectorAll('da-loc-deleted, [loc-temp-dom]');
  locElsToRemove.forEach((el) => el.remove());

  const tags = html.querySelectorAll('da-loc-added');

  // Iterate over each tag
  tags.forEach((tag) => {
    while (tag.firstChild) {
      tag.parentNode.insertBefore(tag.firstChild, tag);
    }
    tag.parentNode.removeChild(tag);
  });
};

export async function diffHtml(original, modified) {
  const diff = getDiffArray(original, modified);
  const output = buildHtmlFromDiff(diff, modified);
  return output.body.querySelector('main');
}

export function addTableIds(html) {
  const tables = html.querySelectorAll('main > div > div');
  tables.forEach((table) => {
    const hash = objectHash(normalizeHTML(table.innerHTML));
    if (!table.dataset.id) {
      table.dataset.id = `${hash}|${Date.now()}`;
      return;
    }
    const [existingHash] = table.dataset.id.split('|');
    if (existingHash !== hash) {
      table.dataset.id = `${existingHash}|${Date.now()}`;
    }
  });
}
