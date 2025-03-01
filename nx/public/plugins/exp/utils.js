import { getMetadata } from '../../../scripts/nexter.js';

export function getExpDetails() {
  const name = getMetadata('experiment');

  const variants = [{ url: window.location.href }];

  const challengers = getMetadata('experiment-variants')?.split(',')
    .map((path) => ({ url: path.trim() }));
  if (challengers?.length) variants.push(...challengers);
  return { name, variants };
}

export function makeDraggable(el) {
  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;

  function closeDragElement() {
    // Remove event listeners when done dragging
    document.onmouseup = null;
    document.onmousemove = null;
  }

  function elementDrag(e) {
    e.preventDefault();

    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set parent element's new position
    el.style.top = `${el.offsetTop - pos2}px`;
    el.style.left = `${el.offsetLeft - pos1}px`;
  }

  function dragMouseDown(e) {
    e.preventDefault();
    // Get mouse position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Add event listeners for mouse movement and release
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  el.querySelector('#aem-sidekick-exp-handle').onmousedown = dragMouseDown;
}
