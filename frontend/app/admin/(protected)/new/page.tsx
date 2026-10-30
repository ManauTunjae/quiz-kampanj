'use client'

import { useState } from 'react'
import { CampaignForm } from '@/components/admin/campaign-form'

export default function NewCampaignPage() {
  // Ändrar vi "key" startar formuläret om från början (används av "Skapa en till")
  const [formKey, setFormKey] = useState(0)

  return (
    <>
      <h1 className="text-3xl text-blush-100">Ny kampanj</h1>
      <p className="mt-2 mb-8 text-blush-300">Skapa ett quiz med 3–5 frågor. Ett svar per fråga är rätt.</p>
      <CampaignForm key={formKey} onCreateAnother={() => setFormKey((k) => k + 1)} />
    </>
  )
}
