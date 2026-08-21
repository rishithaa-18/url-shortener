// Centralized error handler.
// Why: without this, every controller would need its own try/catch that
// formats errors consistently. Instead, controllers call next(err) and
// this single place decides the HTTP response shape.

function errorHandler(err, req, res, next) {
  // express.json() throws a SyntaxError (via body-parser) for malformed
  // request bodies, tagged with type 'entity.parse.failed'. It already
  // carries the right HTTP status (400), but its message is the raw
  // parser's internal error text ("Unexpected token..."), and it has no
  // `code` our frontend can match on — so without this branch it would
  // fall through to a generic INTERNAL_ERROR with a leaked parser message
  // as the "friendly" text. Give it its own clean, specific shape instead.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' },
    });
  }

  // AppError instances (thrown deliberately in services) carry their own
  // status code and machine-readable code — use those directly.
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (statusCode === 500) {
    // Only log unexpected errors loudly — expected 4xx errors (bad input,
    // not found, etc.) are normal application flow, not bugs.
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message: statusCode === 500 ? 'Something went wrong' : err.message,
    },
  });
}

module.exports = errorHandler;
