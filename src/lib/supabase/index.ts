// Custom ZipRide API Client (Replacing legacy DB queries)
import { apiFetch } from '@/lib/api';

if (typeof window !== 'undefined') {
  if (!sessionStorage.getItem('jwt_token') && localStorage.getItem('jwt_token')) {
    sessionStorage.setItem('jwt_token', localStorage.getItem('jwt_token')!);
  }
}

interface FilterEntry {
  column: string | null;
  operator: string;
  value: unknown;
}

interface OrderConfig {
  column: string;
  [key: string]: unknown;
}

interface QueryOptions {
  count?: string;
  head?: boolean;
  [key: string]: unknown;
}

type QueryResult = { data: any; count?: number | null; error: { message: string } | null };

class QueryBuilder {
  private table: string;
  private action: string;
  private payload: unknown;
  private selectColumns: string;
  private filters: FilterEntry[];
  private orderConfig: OrderConfig | null;
  private limitVal: number | null;
  private _isSingle: boolean;
  private _isMaybeSingle: boolean;
  private queryOptions: QueryOptions | null;

  constructor(table: string, action: string = 'select', payload: unknown = null) {
    this.table = table;
    this.action = action;
    this.payload = payload;
    this.selectColumns = '*';
    this.filters = [];
    this.orderConfig = null;
    this.limitVal = null;
    this._isSingle = false;
    this._isMaybeSingle = false;
    this.queryOptions = null;
  }

  select(columns: string = '*', options: QueryOptions = {}): this {
    this.selectColumns = columns;
    this.queryOptions = options;
    return this;
  }

  insert(payload: unknown): this {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  upsert(payload: unknown): this {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: unknown): this {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  or(filter: string): this {
    this.filters.push({ column: null, operator: 'or', value: filter });
    return this;
  }

  order(column: string, options: Record<string, unknown> = {}): this {
    this.orderConfig = { column, ...options };
    return this;
  }

  limit(val: number): this {
    this.limitVal = val;
    return this;
  }

  single(): this {
    this._isSingle = true;
    return this;
  }

  maybeSingle(): this {
    this._isMaybeSingle = true;
    return this;
  }

  async execute(): Promise<QueryResult> {
    try {
      const jwtToken = sessionStorage.getItem('jwt_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await apiFetch('/api/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          payload: this.payload,
          select: this.selectColumns,
          filters: this.filters,
          order: this.orderConfig,
          limit: this.limitVal,
          single: this._isSingle,
          maybeSingle: this._isMaybeSingle,
          options: this.queryOptions
        }),
      });

      // Capture and store the JWT session token if returned in header
      const responseToken = response.headers.get('X-JWT-Token');
      if (responseToken) {
        sessionStorage.setItem('jwt_token', responseToken);
        localStorage.setItem('jwt_token', responseToken);
      }

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Network request failed';
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson?.error?.message || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        return { data: null, error: { message: errMsg } };
      }

      const result = await response.json();
      return { data: result.data, count: result.count, error: result.error };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[API Proxy Client] Query error:', message);
      return { data: null, error: { message } };
    }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<QueryResult | TResult> {
    return this.execute().catch(onrejected);
  }
}

// Global active channels registry for mocking realtime events
const activeChannels: Record<string, { unsubscribe: () => void }> = {};

export const apiClient = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  auth: {
    async getUser() {
      try {
        const jwtToken = sessionStorage.getItem('jwt_token');
        if (!jwtToken) return { data: { user: null }, error: null };

        const res = await apiFetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        if (!res.ok) {
          sessionStorage.removeItem('jwt_token');
          return { data: { user: null }, error: null };
        }
        const data = await res.json();
        return { data: { user: data.user }, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: { user: null }, error: { message } };
      }
    },

    async signUp(options: any) {
      try {
        const payload = {
          email: options.email,
          passwordHash: options.password, // SHA-256 hash behaves as standard password input
          fullName: options.options?.data?.full_name,
          phone: options.options?.data?.phone,
          role: options.options?.data?.role || 'rider'
        };

        const endpoint = payload.role === 'driver' ? '/api/auth/register/driver' : '/api/auth/register';
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Registration failed.');
        }

        if (data.data?.token) {
          sessionStorage.setItem('jwt_token', data.data.token);
          localStorage.setItem('jwt_token', data.data.token);
        }

        return { data: { user: data.data?.user }, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: null, error: { message } };
      }
    },

    async signInWithPassword(options: any) {
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: options.email, // can accept email or username
            password: options.password,
            role: options.role || 'rider'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Login failed.');
        }

        if (data.data?.token) {
          sessionStorage.setItem('jwt_token', data.data.token);
          localStorage.setItem('jwt_token', data.data.token);
        }

        return { data: { user: data.data?.user }, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: null, error: { message } };
      }
    },

    async signOut() {
      sessionStorage.removeItem('jwt_token');
      localStorage.removeItem('jwt_token');
      sessionStorage.removeItem('rider_session');
      sessionStorage.removeItem('driver_session');
      return { error: null };
    },

    async getSession() {
      const jwtToken = sessionStorage.getItem('jwt_token');
      if (!jwtToken) return { data: { session: null }, error: null };
      return { data: { session: { access_token: jwtToken } }, error: null };
    },

    async signInWithOtp(_options: any) {
      // Mock OTP signing
      return { data: { user: {} }, error: null };
    },

    async verifyOtp(_options: any) {
      // Mock OTP verifying
      return { data: { user: {} }, error: null };
    }
  },

  storage: {
    from(bucket: string) {
      void bucket; // suppress unused warning
      return {
        async upload(filePath: string, file: File, options?: any) {
          void options;
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('filePath', filePath);

            const jwtToken = sessionStorage.getItem('jwt_token');
            const headers: Record<string, string> = {};
            if (jwtToken) {
              headers['Authorization'] = `Bearer ${jwtToken}`;
            }

            const res = await apiFetch('/api/upload', {
              method: 'POST',
              headers,
              body: formData
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data?.error?.message || 'File upload failed');
            }

            return { data: { path: data.path }, error: null };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return { data: null, error: { message } };
          }
        },

        getPublicUrl(filePath: string) {
          return {
            data: {
              publicUrl: `/uploads/${filePath.split('/').pop()}`
            }
          };
        }
      };
    }
  },

  // Mocking Realtime via HTTP polling intervals
  channel(channelName: string) {
    return {
      on(event: string, filter: any, callback: (payload: any) => void) {
        void event;
        void filter;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let lastDataStr = '';

        const startPolling = () => {
          intervalId = setInterval(async () => {
            try {
              if (channelName.startsWith('ride-tracking-')) {
                const rideId = channelName.replace('ride-tracking-', '');
                const res = await apiFetch('/api/query', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    table: 'rides',
                    action: 'select',
                    filters: [{ column: 'id', operator: 'eq', value: rideId }],
                    single: true
                  })
                });
                if (res.ok) {
                  const { data } = await res.json();
                  if (data && JSON.stringify(data) !== lastDataStr) {
                    lastDataStr = JSON.stringify(data);
                    callback({ new: data });
                  }
                }
              } else if (channelName.startsWith('driver-location-')) {
                const driverId = channelName.replace('driver-location-', '');
                const res = await apiFetch('/api/query', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    table: 'driver_profiles',
                    action: 'select',
                    filters: [{ column: 'id', operator: 'eq', value: driverId }],
                    single: true
                  })
                });
                if (res.ok) {
                  const { data } = await res.json();
                  if (data && JSON.stringify(data) !== lastDataStr) {
                    lastDataStr = JSON.stringify(data);
                    callback({ new: data });
                  }
                }
              } else if (channelName === 'pending-rides') {
                const res = await apiFetch('/api/query', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    table: 'rides',
                    action: 'select',
                    filters: [{ column: 'status', operator: 'eq', value: 'searching' }]
                  })
                });
                if (res.ok) {
                  const { data } = await res.json();
                  if (data && data.length > 0) {
                    const currentStr = JSON.stringify(data);
                    if (currentStr !== lastDataStr) {
                      const prevData: any[] = lastDataStr ? JSON.parse(lastDataStr) : [];
                      lastDataStr = currentStr;
                      const newRides = (data as any[]).filter((d: any) => !prevData.some((pd: any) => pd.id === d.id));
                      newRides.forEach((r: any) => callback({ new: r }));
                    }
                  }
                }
              }
            } catch (err) {
              console.error('[API Proxy Client] Channel polling error:', err);
            }
          }, 3000);
        };

        const channelObj = {
          subscribe() {
            startPolling();
            const token = Math.random().toString(36).substring(7);
            activeChannels[token] = {
              unsubscribe() {
                if (intervalId) clearInterval(intervalId);
              }
            };
            return {
              unsubscribe() {
                if (intervalId) clearInterval(intervalId);
              }
            };
          },
          unsubscribe() {
            if (intervalId) clearInterval(intervalId);
          }
        };

        return channelObj;
      },
      subscribe() {
        return {
          unsubscribe() {}
        };
      }
    };
  },

  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  }
};

export const supabase = apiClient;

