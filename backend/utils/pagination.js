// backend/utils/pagination.js
// Reusable pagination helpers for list endpoints

/**
 * Parse pagination params from request query
 * Supports: ?page=1&limit=10&search=foo&sort=created_at&status=active&from=date&to=date
 */
export const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  const search = (query.search || '').trim();
  const sort = query.sort || 'created_at';
  const order = (query.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const status = query.status || null;
  const from = query.from || null;
  const to = query.to || null;

  return { page, limit, offset, search, sort, order, status, from, to };
};

/**
 * Build WHERE clause from filters (safe, non-injection approach)
 * Returns { clause: string, params: Array }
 */
export const buildWhereClause = (filters = []) => {
  const clauses = filters.filter(f => f.condition).map(f => f.condition);
  const params = filters.filter(f => f.value !== undefined && f.value !== null).map(f => f.value);

  return {
    clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
};

/**
 * Execute paginated query using db pool
 * @param {object} db - mysql2 pool
 * @param {string} countSql - COUNT(*) query
 * @param {string} dataSql - Data SELECT query (with LIMIT/OFFSET)
 * @param {Array} params - Shared params (count params come before LIMIT/OFFSET)
 * @param {number} limit
 * @param {number} offset
 */
export const paginatedQuery = async (db, countSql, dataSql, params, limit, offset) => {
  const [[countRow]] = await db.execute(countSql, params);
  const total = countRow?.total || 0;

  const [rows] = await db.execute(dataSql, [...params, limit, offset]);

  return { rows, total };
};
