const routes = {
  '/': 'documents',
  '/login': 'login',
  '/register': 'register',
  '/forgot-password': 'forgot-password',
  '/reset-password': 'reset-password',
  '/documents': 'documents',
  '/documents/:id': 'document-detail',
  '/upload': 'upload',
  '/profile': 'profile',
  '/admin': 'admin',
};

export function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(query || ''));

  for (const [pattern, name] of Object.entries(routes)) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) continue;

    const routeParams = {};
    let match = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        routeParams[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { name, params: routeParams, query: params };
    }
  }

  return { name: 'documents', params: {}, query: params };
}

export function navigate(path) {
  window.location.hash = path;
}

export function onRouteChange(callback) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}
