import { useQuery } from '@tanstack/react-query';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import { integrationsApi, type GatewayStatus, type SmtpStatus } from '@/services/sdk/integrations';

const QUERY_KEY = ['integrations', 'status'];

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {ok ? 'Active' : 'Not Configured'}
    </span>
  );
}

function IntegrationCard({
  status,
  extra,
}: {
  status: GatewayStatus | SmtpStatus;
  extra?: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm font-semibold">{status.name}</p>
          {status.extra && (
            <div className="mt-1 space-y-0.5">
              {Object.entries(status.extra).map(([k, v]) => (
                <p key={k} className="text-muted-foreground text-xs">
                  {k}: <span className="font-medium">{String(v ?? '—')}</span>
                </p>
              ))}
            </div>
          )}
          {extra}
        </div>
        <StatusBadge ok={status.enabled && status.configured} />
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-foreground mb-3 mt-6 text-base font-semibold first:mt-0">{children}</h2>
  );
}

function LastEventRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="border-border flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-xs font-medium">{value ?? '—'}</span>
    </div>
  );
}

export function IntegrationsPage() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => integrationsApi.getStatus(),
    refetchInterval: 30_000,
  });

  if (query.isError) {
    return (
      <AdminErrorState
        message="Unable to load integrations status."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Integrations"
        description="Third-party gateway, email, and analytics integration status."
      />

      {query.isLoading && (
        <div className="grid animate-pulse grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-muted h-24 rounded-lg" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-1">
          <SectionHeading>Payment Gateways</SectionHeading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(data.gateways).map((gw) => (
              <IntegrationCard key={gw.name} status={gw} />
            ))}
          </div>

          <SectionHeading>Email / SMTP</SectionHeading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <IntegrationCard
              status={data.smtp}
              extra={
                data.smtp.verified !== undefined ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Connection:{' '}
                    <span
                      className={
                        data.smtp.verified
                          ? 'font-medium text-green-600'
                          : 'font-medium text-red-600'
                      }
                    >
                      {data.smtp.verified ? 'Verified' : 'Failed'}
                    </span>
                  </p>
                ) : null
              }
            />
          </div>

          <SectionHeading>Analytics</SectionHeading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <IntegrationCard status={data.analytics.meta} />
            <IntegrationCard status={data.analytics.tiktok} />
          </div>

          <SectionHeading>Recent Activity</SectionHeading>
          <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
            <LastEventRow
              label="Last successful webhook"
              value={
                data.lastWebhook
                  ? `${data.lastWebhook.gateway} — ${new Date(data.lastWebhook.receivedAt).toLocaleString()}`
                  : null
              }
            />
            <LastEventRow
              label="Last email sent"
              value={
                data.lastEmail
                  ? `${data.lastEmail.subject} → ${data.lastEmail.to} — ${new Date(data.lastEmail.sentAt).toLocaleString()}`
                  : null
              }
            />
            <LastEventRow
              label="Last analytics event"
              value={
                data.lastAnalyticsEvent
                  ? `${data.lastAnalyticsEvent.provider}:${data.lastAnalyticsEvent.eventName} — ${new Date(data.lastAnalyticsEvent.sentAt).toLocaleString()}`
                  : null
              }
            />
          </div>
        </div>
      )}
    </PageMotion>
  );
}
