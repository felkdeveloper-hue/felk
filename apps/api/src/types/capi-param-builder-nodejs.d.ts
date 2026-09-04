declare module 'capi-param-builder-nodejs' {
  export class ParamBuilder {
    constructor(domains?: string[]);
    getNormalizedAndHashedPII(value: string, dataType: string): string | null;
    processRequest(
      host: string,
      params: Record<string, string>,
      cookies: Record<string, string>,
      referer?: string | null,
      forwardedFor?: string | null,
      remoteAddress?: string | null,
    ): unknown;
    getFbc(): string | null | undefined;
    getFbp(): string | null | undefined;
    getClientIpAddress(): string | null | undefined;
  }
}
