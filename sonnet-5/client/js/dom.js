// Tiny DOM builder. Deliberately has no way to inject raw HTML strings —
// text content is always set via textContent, never innerHTML, so
// user-supplied strings (titles, comments, names) can never execute as
// markup regardless of what they contain.
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  node.innerHTML = '';
}

export function showMessage(container, message, kind = 'info') {
  clear(container);
  container.appendChild(el('div', { className: `banner banner-${kind}` }, message));
}
