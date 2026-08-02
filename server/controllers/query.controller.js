import { QueryRepository } from '../repositories/queryRepository.js';
import { signToken } from '../config/jwt.js';

export const QueryController = {
  async executeQuery(req, res, next) {
    try {
      const result = await QueryRepository.executeDynamicQuery(req.body);

      // If the query is on the profiles table with a password filter, inject a JWT
      const passFilter = req.body.filters?.find(f => f.column === 'password_hash' && f.operator === 'eq');
      if (req.body.table === 'profiles' && passFilter && result.data) {
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        if (row && row.id) {
          const token = signToken({
            id: row.id,
            role: row.role,
          });
          res.setHeader('X-JWT-Token', token);
          res.setHeader('Access-Control-Expose-Headers', 'X-JWT-Token');
        }
      }

      return res.json({
        data: result.data,
        count: result.count,
        error: result.error,
      });
    } catch (err) {
      console.error('[Query Proxy Controller] Error executing query:', err.message);
      res.status(500).json({ error: { message: err.message } });
    }
  }
};
export default QueryController;
