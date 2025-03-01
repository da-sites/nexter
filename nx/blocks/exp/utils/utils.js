/* eslint-disable no-bitwise */

/**
 * Convert a string to a hex color
 * @param {String} str
 * @returns hex color
 */
export function toColor(str) {
  return str === 'control' ? '--s2-orange-600' : '--s2-cyan-800';
  // let hash = 0;
  // str.split('').forEach((char) => {
  //   hash = char.charCodeAt(0) + ((hash << 5) - hash);
  // });
  // let color = '#';
  // for (let i = 0; i < 3; i += 1) {
  //   const value = (hash >> (i * 8)) & 0xff;
  //   color += value.toString(16).padStart(2, '0');
  // }
  // return color;
}

/**
 * Convert name to a 2 letter capitalized abbreviation
 * @param {String} name
 * @returns A sentence case 2 letter abbreviation
 */
export function getAbb(name) {
  const [cap, lower] = name.slice(0, 2).split('');
  return `${cap.toUpperCase()}${lower}`;
}

function getName(variant, idx) {
  if (idx === 0) return 'control';
  if (variant.url) return variant.url.split('/').pop();
  return `variant ${idx}`;
}

export function processDetails(experiment) {
  const { variants } = experiment;
  variants.forEach((variant, idx) => {
    variant.name = getName(variant, idx);
  });
  return { ...experiment, variants };
}
