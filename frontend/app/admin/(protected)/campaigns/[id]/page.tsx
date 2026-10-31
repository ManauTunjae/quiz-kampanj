import { Suspense } from 'react'
import { CampaignDashboard } from '@/components/admin/campaign-dashboard'

// Admin: /admin/campaigns/<id>. Inloggningen kontrolleras i (protected)/layout.tsx.
// Med Cache Components måste "await params" ligga inuti en <Suspense>.
export default function CampaignDashboardPage(props: PageProps<'/admin/campaigns/[id]'>) {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-blush-300">
          Laddar…
        </p>
      }
    >
      <DashboardFromParams params={props.params} />
    </Suspense>
  )
}

async function DashboardFromParams({
  params,
}: {
  params: PageProps<'/admin/campaigns/[id]'>['params']
}) {
  const { id } = await params
  return <CampaignDashboard campaignId={id} />
}
