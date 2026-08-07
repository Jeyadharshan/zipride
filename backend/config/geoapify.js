import dotenv from 'dotenv';
dotenv.config();

export const geoapifyConfig = {
  apiKey: process.env.GEOAPIFY_API_KEY || 'czcmkgvwuhxjrxgcxhkvdfgylnpeefhhgjxf',
  baseUrl: 'https://api.geoapify.com/v1'
};

if (!geoapifyConfig.apiKey) {
  console.warn('[Geoapify Config] GEOAPIFY_API_KEY is not defined. Geoapify maps integrations will fall back to public APIs.');
}
