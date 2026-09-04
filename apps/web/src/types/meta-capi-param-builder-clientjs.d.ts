declare module 'meta-capi-param-builder-clientjs' {
  export function processAndCollectAllParams(
    url?: string | null,
    getIpFn?: (() => string | Promise<string>) | null,
  ): Promise<Record<string, string | null | undefined>>;
  export function getFbc(): string;
  export function getFbp(): string;
  export function getClientIpAddress(): string;
  export function getNormalizedAndHashedPII(piiValue: string, dataType: string): string | null;

  const clientParamBuilder: {
    processAndCollectAllParams: typeof processAndCollectAllParams;
    getFbc: typeof getFbc;
    getFbp: typeof getFbp;
    getClientIpAddress: typeof getClientIpAddress;
    getNormalizedAndHashedPII: typeof getNormalizedAndHashedPII;
  };

  export default clientParamBuilder;
}
