const routes = [];

export function registerRoute(pattern, render) {
  // pattern like '/documents/:id' -> regex with named group capture
  const paramNames = [];
  const regexStr = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/?]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, render });
}

function parseHash() {
  const raw = window.location.hash.slice(1) || '/';
  const [path, queryString] = raw.split('?');
  const query = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [key, value] = pair.split('=');
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }
  return { path: path || '/', query };
}

export function navigate(path) {
  window.location.hash = path;
}

let notFoundRender = () => '<p>Page not found.</p>';

export function setNotFound(render) {
  notFoundRender = render;
}

export async function renderCurrentRoute(mountEl) {
  const { path, query } = parseHash();

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      mountEl.innerHTML = '';
      await route.render(mountEl, { params, query });
      return;
    }
  }

  mountEl.innerHTML = '';
  await notFoundRender(mountEl);
}

export function startRouter(mountEl) {
  window.addEventListener('hashchange', () => renderCurrentRoute(mountEl));
  return renderCurrentRoute(mountEl);
}
