const ServiceError = require('../../utils/ServiceError');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
}));

jest.mock('../../models/Patient', () => {
  const Patient = jest.fn();
  Patient.findOne = jest.fn();
  Patient.findById = jest.fn();
  return Patient;
});

const Patient = require('../../models/Patient');
const authService = require('../../services/authService');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register throws when required fields are missing', async () => {
    await expect(authService.register({ name: '', email: '', password: '' }))
      .rejects
      .toBeInstanceOf(ServiceError);

    await expect(authService.register({ name: '', email: '', password: '' }))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'Name, email, and password are required' });
  });

  test('register throws when password is too short', async () => {
    await expect(authService.register({ name: 'A', email: 'a@mail.com', password: '123' }))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'Password must be at least 6 characters' });
  });

  test('register throws when email already exists', async () => {
    Patient.findOne.mockResolvedValue({ _id: 'p1' });

    await expect(authService.register({ name: 'A', email: 'a@mail.com', password: '123456' }))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'Email is already registered' });
  });

  test('login throws on invalid email/password', async () => {
    Patient.findOne.mockResolvedValue(null);

    await expect(authService.login({}, { email: 'none@mail.com', password: '123456' }))
      .rejects
      .toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
  });

  test('changePassword throws when required fields are missing', async () => {
    await expect(authService.changePassword('patient-1', { currentPassword: '', newPassword: '' }))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'currentPassword and newPassword are required' });
  });

  test('uploadProfileImage throws when file is missing', async () => {
    await expect(authService.uploadProfileImage({}, 'patient-1', null))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'Please upload an image (field name: image)' });
  });

  test('getProfileImageDownloadPath throws when profile image is not set', async () => {
    Patient.findById.mockResolvedValue({ _id: 'patient-1', profileImage: '' });

    await expect(authService.getProfileImageDownloadPath('patient-1'))
      .rejects
      .toMatchObject({ statusCode: 404, message: 'No profile image found for this patient' });
  });

  test('getProfileImageDownloadPath throws when image file does not exist', async () => {
    Patient.findById.mockResolvedValue({ _id: 'patient-1', profileImage: 'profiles/missing.png' });

    await expect(authService.getProfileImageDownloadPath('patient-1'))
      .rejects
      .toMatchObject({ statusCode: 404, message: 'Profile image file was not found on the server' });
  });
});
