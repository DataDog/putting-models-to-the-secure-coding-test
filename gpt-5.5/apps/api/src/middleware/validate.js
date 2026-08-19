// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

export function validate(schema, source = 'body') {
  return function validateMiddleware(req, _res, next) {
    const parsed = schema.parse(req[source]);
    req[source] = parsed;
    next();
  };
}
