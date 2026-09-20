import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { randomUUID } from "node:crypto"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const now = () => new Date().toISOString()

async function upsertUser(input: {
  email: string
  password: string
  fullName: string
  phone?: string
  role: string
  department?: string
  designation?: string
}): Promise<string> {
  const { data: existing } = await supabase
    .from("User")
    .select("id")
    .eq("email", input.email)
    .maybeSingle()

  if (existing?.id) {
    console.log(`↺  User ${input.email} already exists`)
    return existing.id
  }

  const id = randomUUID()
  const passwordHash = await bcrypt.hash(input.password, 10)
  const ts = now()

  const { error } = await supabase.from("User").insert({
    id,
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    phone: input.phone ?? null,
    role: input.role,
    department: input.department ?? null,
    designation: input.designation ?? null,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  })
  if (error) throw error
  console.log(`✅ User ${input.email} (password: ${input.password})`)
  return id
}

async function ensureHospitalProfile() {
  const { data: existing } = await supabase
    .from("HospitalProfile")
    .select("id")
    .limit(1)
    .maybeSingle()
  if (existing) {
    console.log("↺  HospitalProfile already exists")
    return
  }
  const ts = now()
  const { error } = await supabase.from("HospitalProfile").insert({
    id: randomUUID(),
    name: "Docsile Eye Hospital",
    displayName: "Docsile Eye Care",
    address: JSON.stringify({
      line1: "123 Medical Lane",
      line2: "Sector 5",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500001",
    }),
    phone: "040-12345678",
    email: "info@docsileeye.com",
    website: "www.docsileeye.com",
    registrationNo: "MCI-2024-001",
    gstin: "36AAACD1234F1ZA",
    settings: JSON.stringify({
      patientIdPrefix: "OP",
      invoicePrefix: "INV",
      currency: "INR",
      currencySymbol: "₹",
    }),
    createdAt: ts,
    updatedAt: ts,
  })
  if (error) throw error
  console.log("✅ Hospital profile created")
}

async function ensureByName<T extends Record<string, unknown>>(
  table: string,
  name: string,
  build: () => T,
) {
  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("name", name)
    .maybeSingle()
  if (existing?.id) return existing.id as string
  const row = { id: randomUUID(), ...build() }
  const { data, error } = await supabase.from(table).insert(row).select("id").single()
  if (error) throw error
  return data.id as string
}

async function seedServiceTemplates(adminId: string) {
  const services = [
    { name: "General Consultation", category: "Consultation", amount: 300, sortOrder: 1 },
    { name: "Senior Consultation", category: "Consultation", amount: 500, sortOrder: 2 },
    { name: "Follow-up Consultation", category: "Consultation", amount: 150, sortOrder: 3 },
    { name: "Auto Refractometry (AR)", category: "Diagnostic", amount: 100, sortOrder: 10 },
    { name: "Visual Acuity Test", category: "Diagnostic", amount: 50, sortOrder: 11 },
    { name: "Slit Lamp Examination", category: "Diagnostic", amount: 150, sortOrder: 12 },
    { name: "Fundus Examination", category: "Diagnostic", amount: 200, sortOrder: 13 },
    { name: "IOP (Tonometry)", category: "Diagnostic", amount: 100, sortOrder: 14 },
    { name: "A-Scan Biometry", category: "Diagnostic", amount: 500, sortOrder: 15 },
    { name: "B-Scan Ultrasonography", category: "Diagnostic", amount: 600, sortOrder: 16 },
    { name: "Fundus Photography", category: "Diagnostic", amount: 400, sortOrder: 17 },
    { name: "OCT - Macula", category: "Diagnostic", amount: 1200, sortOrder: 18 },
    { name: "OCT - Optic Nerve", category: "Diagnostic", amount: 1200, sortOrder: 19 },
    { name: "Visual Field Test", category: "Diagnostic", amount: 800, sortOrder: 20 },
    { name: "Corneal Topography", category: "Diagnostic", amount: 1000, sortOrder: 21 },
    { name: "Pachymetry", category: "Diagnostic", amount: 500, sortOrder: 22 },
    { name: "Phacoemulsification + IOL", category: "Procedure", amount: 25000, sortOrder: 30 },
    { name: "Cataract Surgery (SICS)", category: "Procedure", amount: 12000, sortOrder: 31 },
    { name: "Pterygium Excision", category: "Procedure", amount: 8000, sortOrder: 32 },
    { name: "Chalazion Excision", category: "Procedure", amount: 3000, sortOrder: 33 },
    { name: "Lid Repair", category: "Procedure", amount: 5000, sortOrder: 34 },
    { name: "Syringing & Probing", category: "Procedure", amount: 500, sortOrder: 35 },
    { name: "Intravitreal Injection", category: "Procedure", amount: 15000, sortOrder: 36 },
    { name: "Laser (YAG Capsulotomy)", category: "Procedure", amount: 5000, sortOrder: 37 },
    { name: "Laser (SLT)", category: "Procedure", amount: 8000, sortOrder: 38 },
    { name: "Spectacle Prescription", category: "Optical", amount: 0, sortOrder: 40 },
    { name: "Contact Lens Trial", category: "Optical", amount: 200, sortOrder: 41 },
    { name: "Medical Certificate", category: "Other", amount: 100, sortOrder: 50 },
    { name: "Record Copy", category: "Other", amount: 50, sortOrder: 51 },
  ]

  for (const svc of services) {
    await ensureByName("ServiceTemplate", svc.name, () => {
      const ts = now()
      return {
        name: svc.name,
        category: svc.category,
        amount: svc.amount,
        sortOrder: svc.sortOrder,
        isActive: true,
        createdBy: adminId,
        createdAt: ts,
        updatedAt: ts,
      }
    })
  }
  console.log(`✅ ${services.length} service templates ensured`)
}

async function seedMedicines(adminId: string) {
  const medicines = [
    { name: "Moxifloxacin Eye Drops (0.5%)", category: "Eye Drop", defaultTiming: "4 times/day", defaultDays: "7" },
    { name: "Tobramycin Eye Drops (0.3%)", category: "Eye Drop", defaultTiming: "4 times/day", defaultDays: "7" },
    { name: "Ofloxacin Eye Drops (0.3%)", category: "Eye Drop", defaultTiming: "4 times/day", defaultDays: "7" },
    { name: "Ciprofloxacin Eye Drops (0.3%)", category: "Eye Drop", defaultTiming: "4 times/day", defaultDays: "7" },
    { name: "Prednisolone Eye Drops (1%)", category: "Eye Drop", defaultTiming: "4 times/day", defaultDays: "14" },
    { name: "Dexamethasone Eye Drops (0.1%)", category: "Eye Drop", defaultTiming: "4 times/day", defaultDays: "14" },
    { name: "Timolol Eye Drops (0.5%)", category: "Eye Drop", defaultTiming: "2 times/day", defaultDays: "30" },
    { name: "Latanoprost Eye Drops (0.005%)", category: "Eye Drop", defaultTiming: "Once at bedtime", defaultDays: "30" },
    { name: "Carboxymethylcellulose Eye Drops (0.5%)", category: "Eye Drop", defaultTiming: "As needed", defaultDays: "30" },
    { name: "Ketorolac Eye Drops (0.5%)", category: "Eye Drop", defaultTiming: "4 times/day", defaultDays: "7" },
    { name: "Atropine Eye Drops (1%)", category: "Eye Drop", defaultTiming: "2 times/day", defaultDays: "7" },
    { name: "Cyclopentolate Eye Drops (1%)", category: "Eye Drop", defaultTiming: "As directed", defaultDays: "3" },
    { name: "Betaxolol Eye Drops (0.25%)", category: "Eye Drop", defaultTiming: "2 times/day", defaultDays: "30" },
    { name: "Dorzolamide + Timolol Eye Drops", category: "Eye Drop", defaultTiming: "2 times/day", defaultDays: "30" },
    { name: "Nepafenac Eye Drops (0.1%)", category: "Eye Drop", defaultTiming: "3 times/day", defaultDays: "14" },
    { name: "Erythromycin Eye Ointment", category: "Ointment", defaultTiming: "Bedtime", defaultDays: "7" },
    { name: "Tobramycin Eye Ointment", category: "Ointment", defaultTiming: "Bedtime", defaultDays: "7" },
    { name: "Chloramphenicol Eye Ointment", category: "Ointment", defaultTiming: "Bedtime", defaultDays: "7" },
    { name: "Hydrocortisone Eye Ointment", category: "Ointment", defaultTiming: "Bedtime", defaultDays: "5" },
    { name: "Paracetamol 500mg", category: "Tablet", defaultTiming: "3 times/day", defaultDays: "5" },
    { name: "Ibuprofen 400mg", category: "Tablet", defaultTiming: "3 times/day", defaultDays: "5" },
    { name: "Amoxicillin 500mg", category: "Tablet", defaultTiming: "3 times/day", defaultDays: "7" },
    { name: "Ciprofloxacin 500mg", category: "Tablet", defaultTiming: "2 times/day", defaultDays: "7" },
    { name: "Metronidazole 400mg", category: "Tablet", defaultTiming: "3 times/day", defaultDays: "5" },
    { name: "Methylprednisolone 4mg", category: "Tablet", defaultTiming: "As directed", defaultDays: "7" },
    { name: "Acetazolamide 250mg", category: "Tablet", defaultTiming: "4 times/day", defaultDays: "3" },
    { name: "Vitamin C 500mg", category: "Tablet", defaultTiming: "Once daily", defaultDays: "30" },
    { name: "Vitamin E 400IU", category: "Tablet", defaultTiming: "Once daily", defaultDays: "30" },
    { name: "Lutein + Zeaxanthin", category: "Tablet", defaultTiming: "Once daily", defaultDays: "90" },
    { name: "Bevacizumab (Avastin) 1.25mg - Intravitreal", category: "Injection", defaultTiming: "Single dose", defaultDays: "1" },
    { name: "Ranibizumab (Lucentis) - Intravitreal", category: "Injection", defaultTiming: "Single dose", defaultDays: "1" },
  ]

  for (let i = 0; i < medicines.length; i++) {
    const m = medicines[i]
    await ensureByName("MedicineMaster", m.name, () => {
      const ts = now()
      return {
        name: m.name,
        category: m.category,
        defaultTiming: m.defaultTiming,
        defaultDays: m.defaultDays,
        isActive: true,
        sortOrder: i + 1,
        createdBy: adminId,
        createdAt: ts,
        updatedAt: ts,
      }
    })
  }
  console.log(`✅ ${medicines.length} medicines ensured`)
}

async function seedInvestigations(adminId: string): Promise<Map<string, string>> {
  const investigations = [
    { name: "Complete Blood Picture (CBP)", category: "Lab Test" },
    { name: "Random Blood Sugar (RBS)", category: "Lab Test" },
    { name: "Fasting Blood Sugar (FBS)", category: "Lab Test" },
    { name: "HbA1c", category: "Lab Test" },
    { name: "Blood Pressure", category: "General" },
    { name: "HIV Test", category: "Lab Test" },
    { name: "HBsAg Test", category: "Lab Test" },
    { name: "ECG", category: "General" },
    { name: "Chest X-Ray", category: "Imaging" },
    { name: "OCT Macula", category: "Eye Test" },
    { name: "OCT Optic Nerve Head", category: "Eye Test" },
    { name: "Visual Field (Perimetry)", category: "Eye Test" },
    { name: "Corneal Topography", category: "Eye Test" },
    { name: "A-Scan Biometry", category: "Eye Test" },
    { name: "B-Scan Ultrasonography", category: "Eye Test" },
    { name: "Fundus Photography", category: "Eye Test" },
    { name: "Fluorescein Angiography (FFA)", category: "Eye Test" },
    { name: "ERG (Electroretinogram)", category: "Eye Test" },
  ]

  const map = new Map<string, string>()
  for (let i = 0; i < investigations.length; i++) {
    const inv = investigations[i]
    const id = await ensureByName("InvestigationMaster", inv.name, () => {
      const ts = now()
      return {
        name: inv.name,
        category: inv.category,
        isActive: true,
        sortOrder: i + 1,
        createdBy: adminId,
        createdAt: ts,
        updatedAt: ts,
      }
    })
    map.set(inv.name, id)
  }
  console.log(`✅ ${investigations.length} investigations ensured`)
  return map
}

async function seedDropdownOptions(adminId: string) {
  const data: { fieldName: string; values: string[] }[] = [
    {
      fieldName: "presentComplaint",
      values: [
        "Diminution of vision", "Pain in eye", "Redness of eye", "Watering from eye",
        "Double vision", "Foreign body sensation", "Glare and halos", "Night blindness",
        "Headache", "Discharge from eye", "Itching in eye", "Swelling of eyelid",
        "Drooping of eyelid", "Flashes of light", "Floaters in vision",
      ],
    },
    {
      fieldName: "diagnosis",
      values: [
        "Immature senile cataract", "Mature senile cataract", "Nuclear sclerosis",
        "Posterior subcapsular cataract", "Primary open angle glaucoma", "Narrow angle glaucoma",
        "Angle closure glaucoma", "Diabetic macular edema", "Proliferative diabetic retinopathy",
        "Non-proliferative diabetic retinopathy", "Age-related macular degeneration (dry)",
        "Age-related macular degeneration (wet)", "Rhegmatogenous retinal detachment", "Pterygium",
        "Conjunctivitis (viral)", "Conjunctivitis (bacterial)", "Corneal ulcer", "Keratoconus",
        "Anterior uveitis", "Optic neuritis", "Central retinal artery occlusion",
        "Central retinal vein occlusion", "Chalazion", "Stye (hordeolum)", "Dacryocystitis",
        "Blepharitis", "Amblyopia", "Squint (esotropia)", "Squint (exotropia)", "Myopia",
        "Hypermetropia", "Astigmatism", "Presbyopia",
      ],
    },
    {
      fieldName: "previousHistory",
      values: [
        "No significant history", "Hypertension on medication", "Diabetes mellitus (Type 2)",
        "Previous cataract surgery - RE", "Previous cataract surgery - LE",
        "Previous glaucoma surgery", "Previous LASIK", "Previous corneal transplant",
        "Family history of glaucoma", "Thyroid disorder", "Drug allergy",
      ],
    },
  ]

  let count = 0
  for (const { fieldName, values } of data) {
    for (const value of values) {
      const { data: existing } = await supabase
        .from("DropdownOption")
        .select("id")
        .eq("fieldName", fieldName)
        .eq("value", value)
        .maybeSingle()
      if (existing) continue
      const { error } = await supabase.from("DropdownOption").insert({
        id: randomUUID(),
        fieldName,
        value,
        createdBy: adminId,
        createdAt: now(),
      })
      if (error) throw error
      count++
    }
  }
  console.log(`✅ ${count} dropdown options inserted`)
}

async function seedPredefinedTemplates(adminId: string) {
  const templates = [
    {
      code: "CAT01",
      name: "Cataract - Standard",
      presentComplaint: "Diminution of vision",
      provisionalDiagnosis: "Immature senile cataract",
      medicines: JSON.stringify([
        { name: "Moxifloxacin Eye Drops (0.5%)", days: "7", timing: "4 times/day" },
        { name: "Prednisolone Eye Drops (1%)", days: "14", timing: "4 times/day" },
        { name: "Ketorolac Eye Drops (0.5%)", days: "7", timing: "4 times/day" },
      ]),
      investigations: JSON.stringify(["A-Scan Biometry", "CBP", "RBS", "HbA1c", "HIV Test", "HBsAg Test"]),
    },
    {
      code: "GLAUC01",
      name: "Glaucoma - Initial",
      presentComplaint: "Elevated IOP found on routine check",
      provisionalDiagnosis: "Primary open angle glaucoma",
      medicines: JSON.stringify([
        { name: "Timolol Eye Drops (0.5%)", days: "30", timing: "2 times/day" },
        { name: "Latanoprost Eye Drops (0.005%)", days: "30", timing: "Once at bedtime" },
      ]),
      investigations: JSON.stringify(["Visual Field (Perimetry)", "OCT Optic Nerve Head", "Corneal Topography"]),
    },
    {
      code: "CONJ01",
      name: "Conjunctivitis - Bacterial",
      presentComplaint: "Redness and discharge from eye",
      provisionalDiagnosis: "Conjunctivitis (bacterial)",
      medicines: JSON.stringify([
        { name: "Tobramycin Eye Drops (0.3%)", days: "7", timing: "4 times/day" },
        { name: "Erythromycin Eye Ointment", days: "7", timing: "Bedtime" },
      ]),
      investigations: JSON.stringify([]),
    },
  ]

  for (const tmpl of templates) {
    const { data: existing } = await supabase
      .from("PredefinedTemplate")
      .select("id")
      .eq("code", tmpl.code)
      .maybeSingle()
    if (existing) continue
    const ts = now()
    const { error } = await supabase.from("PredefinedTemplate").insert({
      id: randomUUID(),
      ...tmpl,
      isActive: true,
      createdBy: adminId,
      createdAt: ts,
      updatedAt: ts,
    })
    if (error) throw error
  }
  console.log(`✅ ${templates.length} predefined templates ensured`)
}

async function seedLabsAndMappings(invMap: Map<string, string>) {
  const labsData = [
    { name: "Pathology Lab", description: "Blood tests and lab investigations", location: "Ground Floor, Room 5" },
    { name: "Radiology", description: "Imaging and scans", location: "First Floor, Room 12" },
    { name: "Eye Diagnostics", description: "Ophthalmic diagnostic tests", location: "Ground Floor, Room 3" },
  ]

  const labIds = new Map<string, string>()
  for (const lab of labsData) {
    const id = await ensureByName("Lab", lab.name, () => {
      const ts = now()
      return { ...lab, isActive: true, createdAt: ts, updatedAt: ts }
    })
    labIds.set(lab.name, id)
  }
  console.log(`✅ ${labsData.length} labs ensured`)

  const mappings: { labName: string; invName: string; amount: number }[] = [
    { labName: "Pathology Lab", invName: "Complete Blood Picture (CBP)", amount: 500 },
    { labName: "Pathology Lab", invName: "Random Blood Sugar (RBS)", amount: 200 },
    { labName: "Pathology Lab", invName: "Fasting Blood Sugar (FBS)", amount: 250 },
    { labName: "Pathology Lab", invName: "HbA1c", amount: 800 },
    { labName: "Pathology Lab", invName: "HIV Test", amount: 500 },
    { labName: "Pathology Lab", invName: "HBsAg Test", amount: 400 },
    { labName: "Radiology", invName: "Chest X-Ray", amount: 500 },
    { labName: "Radiology", invName: "ECG", amount: 300 },
    { labName: "Radiology", invName: "B-Scan Ultrasonography", amount: 600 },
    { labName: "Radiology", invName: "A-Scan Biometry", amount: 500 },
    { labName: "Eye Diagnostics", invName: "OCT Macula", amount: 1200 },
    { labName: "Eye Diagnostics", invName: "OCT Optic Nerve Head", amount: 1200 },
    { labName: "Eye Diagnostics", invName: "Visual Field (Perimetry)", amount: 1000 },
    { labName: "Eye Diagnostics", invName: "Corneal Topography", amount: 800 },
    { labName: "Eye Diagnostics", invName: "Fundus Photography", amount: 400 },
    { labName: "Eye Diagnostics", invName: "Fluorescein Angiography (FFA)", amount: 2000 },
    { labName: "Eye Diagnostics", invName: "ERG (Electroretinogram)", amount: 1500 },
  ]

  let created = 0
  for (const m of mappings) {
    const labId = labIds.get(m.labName)
    const investigationId = invMap.get(m.invName)
    if (!labId || !investigationId) continue

    const { data: existing } = await supabase
      .from("LabInvestigation")
      .select("id")
      .eq("labId", labId)
      .eq("investigationId", investigationId)
      .maybeSingle()
    if (existing) continue

    const { error } = await supabase.from("LabInvestigation").insert({
      id: randomUUID(),
      labId,
      investigationId,
      amount: m.amount,
      isDefault: true,
      isActive: true,
    })
    if (error) throw error
    created++
  }
  console.log(`✅ ${created} lab-investigation mappings created (${mappings.length - created} already existed)`)
}

async function main() {
  console.log("🌱 Seeding Docsile HMS database (Supabase)...\n")

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
  }

  const adminId = await upsertUser({
    email: "admin@docsile.com",
    password: "admin123",
    fullName: "Dr. Admin",
    phone: "9999999999",
    role: "ADMIN",
    department: "Administration",
    designation: "Hospital Administrator",
  })

  await upsertUser({
    email: "doctor@docsile.com",
    password: "doctor123",
    fullName: "Dr. Rajesh Kumar",
    phone: "9888888888",
    role: "DOCTOR",
    department: "Ophthalmology",
    designation: "Senior Ophthalmologist",
  })

  await upsertUser({
    email: "reception@docsile.com",
    password: "reception123",
    fullName: "Priya Sharma",
    phone: "9777777777",
    role: "RECEPTIONIST",
    designation: "Front Desk",
  })

  await ensureHospitalProfile()
  await seedServiceTemplates(adminId)
  await seedMedicines(adminId)
  const invMap = await seedInvestigations(adminId)
  await seedDropdownOptions(adminId)
  await seedPredefinedTemplates(adminId)
  await seedLabsAndMappings(invMap)

  console.log("\n🎉 Seeding complete!\n")
  console.log("Login credentials:")
  console.log("  Admin:       admin@docsile.com     / admin123")
  console.log("  Doctor:      doctor@docsile.com    / doctor123")
  console.log("  Reception:   reception@docsile.com / reception123")
}

main().catch((e) => {
  console.error("❌ Seed failed:", e)
  process.exit(1)
})
