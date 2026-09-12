/** Uniform success envelope. Clients can rely on `{ ok, data, meta }` for every 2xx. */
export function ok(res, data, { status = 200, meta } = {}) {
  return res.status(status).json(meta ? { ok: true, data, meta } : { ok: true, data });
}

export function created(res, data, meta) {
  return ok(res, data, { status: 201, meta });
}

export function noContent(res) {
  return res.status(204).end();
}

/** Paginated list helper — keeps `meta` identical across every collection endpoint. */
export function paged(res, items, { page, limit, total, extra } = {}) {
  return ok(res, items, {
    meta: {
      ...(extra || {}),
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
    },
  });
}
