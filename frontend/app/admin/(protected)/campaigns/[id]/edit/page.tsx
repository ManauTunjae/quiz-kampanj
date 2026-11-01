import { Suspense } from 'react'
import { CampaignEditForm } from '@/components/admin/campaign-edit-form'

// Admin: /admin/campaigns/<id>/edit. Inloggningen kontrolleras i (protected)/layout.tsx.
// Med Cache Components måste "await params" ligga inuti en <Suspense>.
export default function EditCampaignPage(props: PageProps<'/admin/campaigns/[id]/edit'>) {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-blush-300">
          Laddar…
        </p>
      }
    >
      <EditFromParams params={props.params} />
    </Suspense>
  )
}

async function EditFromParams({ params }: { params: PageProps<'/admin/campaigns/[id]/edit'>['params'] }) {
  const { id } = await params
  return <CampaignEditForm campaignId={id} />
}
