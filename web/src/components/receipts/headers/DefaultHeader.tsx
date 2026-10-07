/**
 * DefaultHeader — generic receipt letterhead built from the hospital's own
 * configured profile fields (name, address, phone, etc).
 *
 * Note: main's DefaultHeader.tsx was, in practice, a specific deployed
 * hospital's hardcoded letterhead (real name, doctor, registration number,
 * phone) rather than a generic fallback — not appropriate to carry into a
 * generic product. This is a true generic default instead, matching the
 * registry's intended "no custom header configured" fallback.
 */

import type { HospitalHeaderProps } from "../ReceiptHeader"

export default function DefaultHeader({ hospital }: HospitalHeaderProps) {
  const name = hospital.displayName || hospital.name

  return (
    <div className="pb-2 mb-2 border-b-2 border-black">
      <div className="flex justify-between items-center mb-1">
        {hospital.logoUrl ? (
          <div className="w-12 h-12 flex items-center justify-center">
            <img src={hospital.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div className="w-12" />
        )}
        <div className="text-center flex-1 mx-2">
          <h1 className="text-lg font-bold leading-tight">{name}</h1>
          {hospital.address && (
            <p className="text-[10px] leading-tight mt-0.5">{hospital.address}</p>
          )}
        </div>
        <div className="w-12" />
      </div>
      <div className="flex justify-center flex-wrap gap-x-3 text-[9px]">
        {hospital.phone && <span>Ph: {hospital.phone}</span>}
        {hospital.email && <span>{hospital.email}</span>}
        {hospital.website && <span>{hospital.website}</span>}
        {hospital.registrationNo && <span>Regd. No. {hospital.registrationNo}</span>}
      </div>
    </div>
  )
}
