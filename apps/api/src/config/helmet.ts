import type { HelmetOptions } from 'helmet';
import { appConfig } from '@/config/app.config';

/**
 * Secure HTTP headers via Helmet.
 * CSP is relaxed in development for Swagger UI.
 */
export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: appConfig.app.isDev
    ? false
    : {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: appConfig.app.isProd
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  ...(appConfig.app.isProd
    ? {
        permissionsPolicy: {
          features: {
            camera: [],
            microphone: [],
            geolocation: [],
            payment: ['self'],
          },
        },
      }
    : {}),
};
