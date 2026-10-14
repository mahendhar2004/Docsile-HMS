/**
 * whatsapp-button.tsx
 *
 * Icon button that opens a pre-filled WhatsApp chat (wa.me deep link) with
 * the given phone number and message. Ported verbatim from main's
 * src/app/(hospital)/dues-followups/components/WhatsAppButton.tsx — identical
 * number-normalization (bare 10-digit Indian numbers get the "91" country
 * code prefix) and message-prefill behavior.
 */

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface WhatsAppButtonProps {
  phone: string
  message: string
}

export function WhatsAppButton({ phone, message }: WhatsAppButtonProps) {
  function handleClick() {
    const cleaned = phone.replace(/\D/g, "")
    const number = cleaned.length === 10 ? `91${cleaned}` : cleaned
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
      title="Send WhatsApp message"
      aria-label="Send WhatsApp message"
      onClick={handleClick}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}
