process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth', () => (req, res, next) => {
  req.patient = { id: 'patient-1' };
  next();
});

jest.mock('../../services/authService', () => ({
  register: jest.fn(),
  login: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  uploadProfileImage: jest.fn(),
  getProfileImageDownloadPath: jest.fn(),
  profileImageUpload: {
    single: jest.fn(() => (req, res, next) => next()),
  },
}));

const authRouter = require('../../routes/auth');
const authService = require('../../services/authService');
const errorHandler = require('../../middleware/errorHandler');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.download = (filePath) => res.status(200).json({ download: filePath });
    next();
  });
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
};

describe('Auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/register', async () => {
    authService.register.mockResolvedValue({ message: 'Registration successful' });

    const app = createApp();
    const payload = { name: 'Ali', email: 'ali@mail.com', password: '123456' };
    const response = await request(app).post('/api/auth/register').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Registration successful' });
    expect(authService.register).toHaveBeenCalledWith(payload);
  });

  test('POST /api/auth/login', async () => {
    authService.login.mockResolvedValue({ message: 'Login successful', token: 'abc' });

    const app = createApp();
    const payload = { email: 'ali@mail.com', password: '123456' };
    const response = await request(app).post('/api/auth/login').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.token).toBe('abc');
    expect(authService.login).toHaveBeenCalled();
  });

  test('GET /api/auth/profile', async () => {
    authService.getProfile.mockResolvedValue({ message: 'Profile retrieved successfully', patient: { id: 'patient-1' } });

    const app = createApp();
    const response = await request(app).get('/api/auth/profile');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Profile retrieved successfully');
    expect(authService.getProfile).toHaveBeenCalledWith(expect.any(Object), 'patient-1');
  });

  test('PUT /api/auth/profile', async () => {
    authService.updateProfile.mockResolvedValue({ message: 'Profile updated successfully', patient: { id: 'patient-1' } });

    const app = createApp();
    const payload = { name: 'Updated Name' };
    const response = await request(app).put('/api/auth/profile').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Profile updated successfully');
    expect(authService.updateProfile).toHaveBeenCalledWith(expect.any(Object), 'patient-1', payload);
  });

  test('PUT /api/auth/change-password', async () => {
    authService.changePassword.mockResolvedValue({ message: 'Password changed successfully' });

    const app = createApp();
    const payload = { currentPassword: '123456', newPassword: '1234567' };
    const response = await request(app).put('/api/auth/change-password').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password changed successfully');
    expect(authService.changePassword).toHaveBeenCalledWith('patient-1', payload);
  });

  test('POST /api/auth/profile/image', async () => {
    authService.uploadProfileImage.mockResolvedValue({ message: 'Profile image uploaded successfully', patient: { id: 'patient-1' } });

    const app = createApp();
    const response = await request(app)
      .post('/api/auth/profile/image')
      .attach('image', Buffer.from('fake-image'), 'avatar.png');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Profile image uploaded successfully');
    expect(authService.uploadProfileImage).toHaveBeenCalledWith(expect.any(Object), 'patient-1', undefined);
  });

  test('GET /api/auth/profile/image', async () => {
    authService.getProfileImageDownloadPath.mockResolvedValue('/tmp/profile.png');

    const app = createApp();
    const response = await request(app).get('/api/auth/profile/image');

    expect(response.status).toBe(200);
    expect(response.body.download).toBe('/tmp/profile.png');
    expect(authService.getProfileImageDownloadPath).toHaveBeenCalledWith('patient-1');
  });
});
