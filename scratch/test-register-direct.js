import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const { AuthController } = await import('../backend/controllers/authController.js');

const req = {
  body: {
    email: `test_${Date.now()}@zipride.com`,
    phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    fullName: 'Test Rider',
    username: '',
    dob: '',
    gender: '',
    passwordHash: ''
  },
  ip: '127.0.0.1'
};

const res = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    console.log('STATUS CODE:', this.statusCode || 200);
    console.log('RESPONSE:', JSON.stringify(data, null, 2));
    process.exit(0);
  }
};

const next = (err) => {
  console.error('SERVER ERROR (500):', err);
  process.exit(1);
};

console.log('Testing AuthController.register with payload:', req.body);
await AuthController.register(req, res, next);
