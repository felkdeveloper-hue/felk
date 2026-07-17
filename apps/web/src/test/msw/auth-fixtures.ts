import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api/v1';

export const mockAuthUser = {
  id: 'user_test',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  roleKey: 'customer',
  emailVerified: true,
};

export const mockCustomerProfile = {
  id: 'cust_test',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+15550100',
  profilePhotoUrl: null,
  dateOfBirth: null,
  gender: null,
};

export const mockAddresses = [
  {
    id: 'addr_1',
    fullName: 'Test User',
    phone: '+15550100',
    line1: '123 Market Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
    label: 'home',
    isDefaultShipping: true,
    isDefaultBilling: true,
  },
];

export const mockPreferences = {
  preferences: {
    language: 'en',
    currency: 'USD',
    newsletter: true,
    marketingEmails: false,
  },
  notificationPreferences: {
    orderUpdates: true,
    promotions: false,
    wishlistAlerts: true,
    stockAlerts: false,
    referralUpdates: false,
  },
};

export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === 'unverified@example.com') {
      return HttpResponse.json(
        {
          success: false,
          error: { message: 'Verify your email first', code: 'EMAIL_NOT_VERIFIED' },
        },
        { status: 401 },
      );
    }

    if (body.password !== 'Password1!') {
      return HttpResponse.json(
        {
          success: false,
          error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'access_test',
        refreshToken: 'refresh_test',
        expiresIn: 900,
        user: mockAuthUser,
      },
    });
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string; firstName: string; lastName: string };
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          ...mockAuthUser,
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          emailVerified: false,
        },
        message: 'Registration successful. Please verify your email.',
      },
    });
  }),

  http.post(`${API}/auth/forgot-password`, () =>
    HttpResponse.json({
      success: true,
      data: { message: 'If the email exists, a reset link was sent.' },
    }),
  ),

  http.post(`${API}/auth/reset-password`, async ({ request }) => {
    const body = (await request.json()) as { token: string; password: string };
    if (body.token === 'expired') {
      return HttpResponse.json(
        { success: false, error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } },
        { status: 400 },
      );
    }
    if (body.token === 'invalid') {
      return HttpResponse.json(
        { success: false, error: { message: 'Invalid token', code: 'INVALID_TOKEN' } },
        { status: 400 },
      );
    }
    return HttpResponse.json({ success: true, data: { message: 'Password reset successful' } });
  }),

  http.post(`${API}/auth/verify-email`, async ({ request }) => {
    const body = (await request.json()) as { token: string };
    if (body.token === 'expired') {
      return HttpResponse.json(
        { success: false, error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } },
        { status: 400 },
      );
    }
    if (body.token === 'invalid') {
      return HttpResponse.json(
        { success: false, error: { message: 'Invalid token', code: 'INVALID_TOKEN' } },
        { status: 400 },
      );
    }
    return HttpResponse.json({ success: true, data: { message: 'Email verified' } });
  }),

  http.post(`${API}/auth/resend-verification`, () =>
    HttpResponse.json({ success: true, data: { message: 'Verification email sent' } }),
  ),

  http.post(`${API}/auth/change-password`, () =>
    HttpResponse.json({ success: true, data: { message: 'Password changed' } }),
  ),

  http.post(`${API}/auth/logout`, () => HttpResponse.json({ success: true, data: null })),
  http.post(`${API}/auth/logout-all`, () => HttpResponse.json({ success: true, data: null })),

  http.get(`${API}/auth/me`, () => HttpResponse.json({ success: true, data: mockAuthUser })),

  http.get(`${API}/customers/me`, () =>
    HttpResponse.json({ success: true, data: mockCustomerProfile }),
  ),

  http.patch(`${API}/customers/me`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...mockCustomerProfile, ...(body as object) },
    });
  }),

  http.get(`${API}/customers/me/preferences`, () =>
    HttpResponse.json({ success: true, data: mockPreferences }),
  ),

  http.patch(`${API}/customers/me/preferences`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        preferences: {
          ...mockPreferences.preferences,
          ...(body as { preferences?: object }).preferences,
        },
        notificationPreferences: {
          ...mockPreferences.notificationPreferences,
          ...(body as { notificationPreferences?: object }).notificationPreferences,
        },
      },
    });
  }),

  http.get(`${API}/customers/me/addresses`, () =>
    HttpResponse.json({ success: true, data: mockAddresses }),
  ),

  http.post(`${API}/customers/me/addresses`, async ({ request }) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({
      success: true,
      data: { id: 'addr_new', ...body },
    });
  }),

  http.patch(`${API}/customers/me/addresses/:addressId`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...mockAddresses[0], id: params.addressId, ...(body as object) },
    });
  }),

  http.delete(`${API}/customers/me/addresses/:addressId`, () =>
    HttpResponse.json({ success: true, data: { message: 'Address removed' } }),
  ),
];
