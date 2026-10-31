// Samtyckestexten (GDPR). Den här exakta texten:
//   1) visas för besökaren (frontend får den från servern, den skrivs inte om där), och
//   2) sparas i databasen tillsammans med varje lead (kolumnen consent_text).
// Ändrar du texten sparas den nya texten för nya leads. Gamla leads behåller den text de godkände.
export const CONSENT_TEXT =
  'Jag godkänner att mitt namn och min e-postadress sparas av den som skapat quizet, så att de kan kontakta mig. Jag kan be om att få mina uppgifter raderade när som helst.'
