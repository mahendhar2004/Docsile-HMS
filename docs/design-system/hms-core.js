(function () {
  const KEY = 'hms_state_v3';
  const ICONS = {"users":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M16%2021v-2a4%204%200%200%200-4-4H6a4%204%200%200%200-4%204v2%22%2F%3E%3Cpath%20d%3D%22M16%203.128a4%204%200%200%201%200%207.744%22%2F%3E%3Cpath%20d%3D%22M22%2021v-2a4%204%200%200%200-3-3.87%22%2F%3E%3Ccircle%20cx%3D%229%22%20cy%3D%227%22%20r%3D%224%22%2F%3E%3C%2Fsvg%3E","eye":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M2.062%2012.348a1%201%200%200%201%200-.696%2010.75%2010.75%200%200%201%2019.876%200%201%201%200%200%201%200%20.696%2010.75%2010.75%200%200%201-19.876%200%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%223%22%2F%3E%3C%2Fsvg%3E","stethoscope":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M11%202v2%22%2F%3E%3Cpath%20d%3D%22M5%202v2%22%2F%3E%3Cpath%20d%3D%22M5%203H4a2%202%200%200%200-2%202v4a6%206%200%200%200%2012%200V5a2%202%200%200%200-2-2h-1%22%2F%3E%3Cpath%20d%3D%22M8%2015a6%206%200%200%200%2012%200v-3%22%2F%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2210%22%20r%3D%222%22%2F%3E%3C%2Fsvg%3E","bed-double":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M2%2020v-8a2%202%200%200%201%202-2h16a2%202%200%200%201%202%202v8%22%2F%3E%3Cpath%20d%3D%22M4%2010V6a2%202%200%200%201%202-2h12a2%202%200%200%201%202%202v4%22%2F%3E%3Cpath%20d%3D%22M12%204v6%22%2F%3E%3Cpath%20d%3D%22M2%2018h20%22%2F%3E%3C%2Fsvg%3E","pill":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m10.5%2020.5%2010-10a4.95%204.95%200%201%200-7-7l-10%2010a4.95%204.95%200%201%200%207%207Z%22%2F%3E%3Cpath%20d%3D%22m8.5%208.5%207%207%22%2F%3E%3C%2Fsvg%3E","glasses":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Ccircle%20cx%3D%226%22%20cy%3D%2215%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%2215%22%20r%3D%224%22%2F%3E%3Cpath%20d%3D%22M14%2015a2%202%200%200%200-2-2%202%202%200%200%200-2%202%22%2F%3E%3Cpath%20d%3D%22M2.5%2013%205%207c.7-1.3%201.4-2%203-2%22%2F%3E%3Cpath%20d%3D%22M21.5%2013%2019%207c-.7-1.3-1.5-2-3-2%22%2F%3E%3C%2Fsvg%3E","flask-conical":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M14%202v6a2%202%200%200%200%20.245.96l5.51%2010.08A2%202%200%200%201%2018%2022H6a2%202%200%200%201-1.755-2.96l5.51-10.08A2%202%200%200%200%2010%208V2%22%2F%3E%3Cpath%20d%3D%22M6.453%2015h11.094%22%2F%3E%3Cpath%20d%3D%22M8.5%202h7%22%2F%3E%3C%2Fsvg%3E","phone":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M13.832%2016.568a1%201%200%200%200%201.213-.303l.355-.465A2%202%200%200%201%2017%2015h3a2%202%200%200%201%202%202v3a2%202%200%200%201-2%202A18%2018%200%200%201%202%204a2%202%200%200%201%202-2h3a2%202%200%200%201%202%202v3a2%202%200%200%201-.8%201.6l-.468.351a1%201%200%200%200-.292%201.233%2014%2014%200%200%200%206.392%206.384%22%2F%3E%3C%2Fsvg%3E","shield":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2013c0%205-3.5%207.5-7.66%208.95a1%201%200%200%201-.67-.01C7.5%2020.5%204%2018%204%2013V6a1%201%200%200%201%201-1c2%200%204.5-1.2%206.24-2.72a1.17%201.17%200%200%201%201.52%200C14.51%203.81%2017%205%2019%205a1%201%200%200%201%201%201z%22%2F%3E%3C%2Fsvg%3E","clipboard-list":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20width%3D%228%22%20height%3D%224%22%20x%3D%228%22%20y%3D%222%22%20rx%3D%221%22%20ry%3D%221%22%2F%3E%3Cpath%20d%3D%22M16%204h2a2%202%200%200%201%202%202v14a2%202%200%200%201-2%202H6a2%202%200%200%201-2-2V6a2%202%200%200%201%202-2h2%22%2F%3E%3Cpath%20d%3D%22M12%2011h4%22%2F%3E%3Cpath%20d%3D%22M12%2016h4%22%2F%3E%3Cpath%20d%3D%22M8%2011h.01%22%2F%3E%3Cpath%20d%3D%22M8%2016h.01%22%2F%3E%3C%2Fsvg%3E","wallet":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M19%207V4a1%201%200%200%200-1-1H5a2%202%200%200%200%200%204h15a1%201%200%200%201%201%201v4h-3a2%202%200%200%200%200%204h3a1%201%200%200%200%201-1v-2a1%201%200%200%200-1-1%22%2F%3E%3Cpath%20d%3D%22M3%205v14a2%202%200%200%200%202%202h15a1%201%200%200%200%201-1v-4%22%2F%3E%3C%2Fsvg%3E","bar-chart-3":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M3%203v16a2%202%200%200%200%202%202h16%22%2F%3E%3Cpath%20d%3D%22M18%2017V9%22%2F%3E%3Cpath%20d%3D%22M13%2017V5%22%2F%3E%3Cpath%20d%3D%22M8%2017v-3%22%2F%3E%3C%2Fsvg%3E","file-bar-chart":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%2022a2%202%200%200%201-2-2V4a2%202%200%200%201%202-2h8a2.4%202.4%200%200%201%201.704.706l3.588%203.588A2.4%202.4%200%200%201%2020%208v12a2%202%200%200%201-2%202z%22%2F%3E%3Cpath%20d%3D%22M14%202v5a1%201%200%200%200%201%201h5%22%2F%3E%3Cpath%20d%3D%22M8%2018v-2%22%2F%3E%3Cpath%20d%3D%22M12%2018v-4%22%2F%3E%3Cpath%20d%3D%22M16%2018v-6%22%2F%3E%3C%2Fsvg%3E","database-zap":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cellipse%20cx%3D%2212%22%20cy%3D%225%22%20rx%3D%229%22%20ry%3D%223%22%2F%3E%3Cpath%20d%3D%22M3%205V19A9%203%200%200%200%2015%2021.84%22%2F%3E%3Cpath%20d%3D%22M21%205V8%22%2F%3E%3Cpath%20d%3D%22M21%2012L18%2017H22L19%2022%22%2F%3E%3Cpath%20d%3D%22M3%2012A9%203%200%200%200%2014.59%2014.87%22%2F%3E%3C%2Fsvg%3E","scroll-text":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M15%2012h-5%22%2F%3E%3Cpath%20d%3D%22M15%208h-5%22%2F%3E%3Cpath%20d%3D%22M19%2017V5a2%202%200%200%200-2-2H4%22%2F%3E%3Cpath%20d%3D%22M8%2021h12a2%202%200%200%200%202-2v-1a1%201%200%200%200-1-1H11a1%201%200%200%200-1%201v1a2%202%200%201%201-4%200V5a2%202%200%201%200-4%200v2a1%201%200%200%200%201%201h3%22%2F%3E%3C%2Fsvg%3E","user-cog":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M10%2015H6a4%204%200%200%200-4%204v2%22%2F%3E%3Cpath%20d%3D%22m14.305%2016.53.923-.382%22%2F%3E%3Cpath%20d%3D%22m15.228%2013.852-.923-.383%22%2F%3E%3Cpath%20d%3D%22m16.852%2012.228-.383-.923%22%2F%3E%3Cpath%20d%3D%22m16.852%2017.772-.383.924%22%2F%3E%3Cpath%20d%3D%22m19.148%2012.228.383-.923%22%2F%3E%3Cpath%20d%3D%22m19.53%2018.696-.382-.924%22%2F%3E%3Cpath%20d%3D%22m20.772%2013.852.924-.383%22%2F%3E%3Cpath%20d%3D%22m20.772%2016.148.924.383%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%2215%22%20r%3D%223%22%2F%3E%3Ccircle%20cx%3D%229%22%20cy%3D%227%22%20r%3D%224%22%2F%3E%3C%2Fsvg%3E","settings":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M9.671%204.136a2.34%202.34%200%200%201%204.659%200%202.34%202.34%200%200%200%203.319%201.915%202.34%202.34%200%200%201%202.33%204.033%202.34%202.34%200%200%200%200%203.831%202.34%202.34%200%200%201-2.33%204.033%202.34%202.34%200%200%200-3.319%201.915%202.34%202.34%200%200%201-4.659%200%202.34%202.34%200%200%200-3.32-1.915%202.34%202.34%200%200%201-2.33-4.033%202.34%202.34%200%200%200%200-3.831A2.34%202.34%200%200%201%206.35%206.051a2.34%202.34%200%200%200%203.319-1.915%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%223%22%2F%3E%3C%2Fsvg%3E"};
  const MODS = [['Patients','users','P'],['Refraction','eye','R'],['Doctor','stethoscope','D'],['In-Patients','bed-double','I'],['Pharmacy','pill','H'],['Optical','glasses','O'],['Labs','flask-conical','L'],['Call Logs','phone','C'],['Insurance','shield','S'],['Dues & Follow-Ups','clipboard-list','F'],['Expenses','wallet','E'],['Analytics','bar-chart-3','A'],['Reports','file-bar-chart','T'],['Data Export','database-zap','X'],['Licenses','scroll-text','N'],['Staff','user-cog','U']];
  const DOCTORS = ['Dr. Suresh Menon', 'Dr. Ramesh Iyer', 'Dr. Anand Prakash'];
  const DOC_DEPT = { 'Dr. Suresh Menon': 'Ophthalmology', 'Dr. Ramesh Iyer': 'Retina', 'Dr. Anand Prakash': 'Cornea' };
  const DEPTS = ['Ophthalmology', 'Cornea', 'Retina', 'Glaucoma'];
  const REFS = ['Self', 'Dr. Anand Prakash', 'Dr. Ramesh Iyer'];
  const CATS = ['Regular', 'Senior Citizen', 'Staff'];
  const STATUSES = [['REGISTERED','Registered','info'],['IN_WORKUP','In Workup','warning'],['WORKUP_DONE','Workup Done','warning'],['WITH_DOCTOR','With Doctor','info'],['VISITED','Visited','success'],['COMPLETED','Completed','success'],['MEDICAL_ONLY','Medical Only','info'],['MOVED','Moved','neutral'],['CANCELLED','Cancelled','error'],['NO_SHOW','No Show','error']];
  const SERVICES = [['s1','OPD Consultation','Consultation',500,0],['s2','Follow-up Consultation','Consultation',300,0],['s3','Refraction','Diagnostic',200,0],['s4','Tonometry (NCT)','Diagnostic',250,0],['s5','OCT Scan','Diagnostic',1200,100],['s6','Visual Field Test','Diagnostic',900,0],['s7','Fundus Photography','Diagnostic',800,0],['s8','Dilatation','Procedure',100,0],['s9','Minor Procedure','Procedure',1500,0]].map(([id,name,category,amount,discount]) => ({ id, name, category, amount, discount }));
  const SCATS = ['All', 'Consultation', 'Diagnostic', 'Procedure', 'Medicine', 'Other'];
  const PAYMODES = ['Cash', 'UPI', 'Card', 'Cheque', 'Online', 'NEFT'];
  const REG_FEE = { enabled: true, amount: 200 };
  const SURGERIES = [
    { id: 'sg1', name: 'Phaco + IOL', department: 'Ophthalmology', doctors: ['Dr. Suresh Menon'], onDuty: ['Dr. Anand Prakash'], diag: 'Cataract', proc: 'Phacoemulsification with foldable IOL implantation', details: '' },
    { id: 'sg2', name: 'Vitrectomy', department: 'Retina', doctors: ['Dr. Ramesh Iyer'], onDuty: ['Dr. Anand Prakash'], diag: 'Vitreous haemorrhage', proc: 'Pars plana vitrectomy', details: '' },
    { id: 'sg3', name: 'Trabeculectomy', department: 'Glaucoma', doctors: ['Dr. Suresh Menon', 'Dr. Ramesh Iyer'], onDuty: [], diag: 'Uncontrolled glaucoma', proc: 'Trabeculectomy with MMC', details: '' },
    { id: 'sg4', name: 'DCR', department: 'Ophthalmology', doctors: ['Dr. Ramesh Iyer'], onDuty: [], diag: 'Nasolacrimal duct obstruction', proc: 'Dacryocystorhinostomy', details: '' }
  ];
  const PACKAGES = [
    { id: 'pk1', name: 'Cataract · Basic', discount: 0, inc: [['Surgery', 12000], ['Room (1 day)', 3000], ['Medicines', 2000], ['Standard IOL', 1000]] },
    { id: 'pk2', name: 'Cataract · Premium', discount: 1000, inc: [['Surgery', 15000], ['Room (1 day)', 4000], ['Medicines', 2500], ['Premium IOL', 12000]] },
    { id: 'pk3', name: 'Vitrectomy', discount: 2000, inc: [['Surgery', 35000], ['Room (2 days)', 8000], ['Medicines', 5000]] }
  ];
  const AMT_TYPES = ['Advance', 'Partial', 'Final', 'Refund', 'Insurance'];
  const IPAY_MODES = ['Cash', 'UPI', 'Both', 'Insurance'];

  const p2 = n => String(n).padStart(2, '0');
  const isoOfDate = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const todayISO = () => isoOfDate(new Date());
  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOfDate(new Date(y, m - 1, d + n)); };
  const fmtDate = iso => { if (!iso) return '—'; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const fmtTime = ts => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const inr = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');
  const calcAge = dob => { if (!dob) return ''; const [y, m, d] = dob.split('-').map(Number), t = new Date(); let a = t.getFullYear() - y; if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--; return a; };
  const tsAt = (iso, h, m) => { const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d, h, m).getTime(); };
  const tone = t => ({ sb: 'var(--color-' + t + '-soft)', sf: 'var(--color-' + t + '-soft-foreground)' });
  const SM = {}; STATUSES.forEach(([k, l, t]) => { SM[k] = { l, t }; });
  const clone = d => JSON.parse(JSON.stringify(d));
  const has = (q, arr) => { q = (q || '').trim().toLowerCase(); if (!q) return true; const qd = q.replace(/\D/g, ''); return arr.some(x => String(x || '').toLowerCase().includes(q) || (qd.length > 2 && String(x || '').replace(/\D/g, '').includes(qd))); };
  const phoneFmt = v => { const d = String(v).replace(/\D/g, '').slice(0, 10); return d; };

  function seed() {
    const T = todayISO(), Y = addDays(T, -1);
    let ri = 1;
    const rx = (date, items, discount, paid, mode, dx) => { const sub = items.reduce((s, i) => s + i.a, 0), total = sub - discount; return { id: 'rx' + ri, no: 'RX-' + String(ri++).padStart(4, '0'), date, items, discount, total, paid, due: total - paid, mode, payments: paid ? [{ amt: paid, mode }] : [], diagnosis: dx || '' }; };
    const it = (d, c, a) => ({ d, c, q: 1, u: a, a });
    const P = (n, first, last, age, g, phone, status, date, h, m, doc, ref, rxs, dept) => ({ id: 'pat-' + n, patientId: 'P-' + String(n).padStart(4, '0'), firstName: first, lastName: last, phone: '+91' + phone, email: '', gender: g, dob: '', age, address: '', guardian: '', doctorName: doc || '', department: dept || '', category: 'Regular', type: 'OPD', date, createdAt: tsAt(date, h, m), status, referredBy: ref || '', notes: '', rx: rxs || [] });
    return {
      addresses: ['Bengaluru', 'Chennai', 'Jaipur', 'Ahmedabad'], pseq: 15, ipseq: 5, rseq: ri + 10,
      patients: [
        P(1, 'Rajesh', 'Kumar', 45, 'Male', '9876543210', 'REGISTERED', T, 8, 45, '', ''),
        P(2, 'Priya', 'Sharma', 31, 'Female', '9845678901', 'IN_WORKUP', T, 9, 0, 'Dr. Suresh Menon', 'Dr. Anand Prakash', [rx(T, [it('OPD Consultation', 'Consultation', 500)], 0, 500, 'UPI')], 'Ophthalmology'),
        P(3, 'Arun', 'Singh', 53, 'Male', '7654321098', 'WORKUP_DONE', T, 9, 30, 'Dr. Ramesh Iyer', '', [rx(T, [it('OPD Consultation', 'Consultation', 500), it('Refraction', 'Diagnostic', 200)], 0, 700, 'Cash')], 'Ophthalmology'),
        P(4, 'Meena', 'Patel', 38, 'Female', '9123456789', 'WITH_DOCTOR', T, 10, 0, 'Dr. Suresh Menon', 'Dr. Ramesh Iyer', [rx(T, [it('OPD Consultation', 'Consultation', 500)], 0, 500, 'Cash')], 'Ophthalmology'),
        P(5, 'Suresh', 'Reddy', 61, 'Male', '8976543210', 'VISITED', T, 10, 30, 'Dr. Suresh Menon', '', [rx(T, [it('OPD Consultation', 'Consultation', 500)], 0, 500, 'Cash', 'Dry eye')], 'Ophthalmology'),
        P(6, 'Anjali', 'Nair', 27, 'Female', '9988776655', 'COMPLETED', T, 11, 0, 'Dr. Ramesh Iyer', 'Self', [rx(T, [it('OPD Consultation', 'Consultation', 500), it('Tonometry (NCT)', 'Diagnostic', 250), it('Refraction', 'Diagnostic', 200)], 150, 800, 'UPI', 'Refractive error')], 'Ophthalmology'),
        P(7, 'Vikram', 'Rao', 49, 'Male', '9090909090', 'COMPLETED', T, 11, 30, 'Dr. Suresh Menon', '', [rx(T, [it('OPD Consultation', 'Consultation', 500), it('OCT Scan', 'Diagnostic', 1200)], 200, 1000, 'Card', 'Macular oedema')], 'Retina'),
        P(8, 'Kavitha', 'S', 29, 'Female', '9791033045', 'NO_SHOW', T, 12, 0, 'Dr. Ramesh Iyer', '', []),
        P(9, 'Joseph', 'Thomas', 66, 'Male', '9444011873', 'COMPLETED', Y, 9, 15, 'Dr. Ramesh Iyer', '', [rx(Y, [it('Follow-up Consultation', 'Consultation', 300)], 0, 300, 'Cash')]),
        P(10, 'Deepa', 'Venkat', 8, 'Female', '9841190027', 'COMPLETED', Y, 10, 5, 'Dr. Suresh Menon', 'Self', [rx(Y, [it('OPD Consultation', 'Consultation', 500), it('Refraction', 'Diagnostic', 200)], 0, 700, 'UPI')]),
        P(11, 'Ramesh', 'Kumar', 71, 'Male', '9840072266', 'COMPLETED', Y, 11, 20, 'Dr. Ramesh Iyer', '', [rx(Y, [it('OPD Consultation', 'Consultation', 500)], 0, 500, 'Cash')])
      ],
      ipd: [
        { id: 'ip1', ip: 'IP-0001', patientId: 'P-0011', name: 'Ramesh Kumar', age: 71, gender: 'MALE', phone: '+919840072266', doctors: ['Dr. Ramesh Iyer'], onDuty: ['Dr. Anand Prakash'], op: 'Vitrectomy', opDate: '', dept: 'Retina', diag: 'Vitreous haemorrhage', adm: tsAt(addDays(T, -2), 10, 0), disc: '', status: 'admitted', inc: [{ name: 'Surgery', amount: 35000 }, { name: 'Room (2 days)', amount: 8000 }], discount: 2000, payments: [{ date: addDays(T, -2), type: 'Advance', mode: 'UPI', amount: 20000 }], notes: '' },
        { id: 'ip2', ip: 'IP-0002', patientId: '', name: 'M. Begum', age: 63, gender: 'FEMALE', phone: '+919845012345', doctors: ['Dr. Suresh Menon'], onDuty: [], op: 'Phaco + IOL', opDate: '', dept: 'Ophthalmology', diag: 'Cataract', adm: tsAt(T, 8, 30), disc: '', status: 'admitted', inc: [{ name: 'Surgery', amount: 12000 }, { name: 'Room (1 day)', amount: 3000 }, { name: 'Medicines', amount: 2000 }, { name: 'Standard IOL', amount: 1000 }], discount: 0, payments: [{ date: T, type: 'Advance', mode: 'Cash', amount: 10000 }], notes: '' },
        { id: 'ip3', ip: 'IP-0003', patientId: '', name: 'T. Joseph', age: 58, gender: 'MALE', phone: '+919444000111', doctors: ['Dr. Suresh Menon', 'Dr. Ramesh Iyer'], onDuty: [], op: 'Trabeculectomy', opDate: '', dept: 'Glaucoma', diag: 'Uncontrolled glaucoma', adm: tsAt(addDays(T, -4), 9, 0), disc: Y, status: 'discharged', inc: [{ name: 'Surgery', amount: 26000 }], discount: 0, payments: [{ date: Y, type: 'Final', mode: 'Cash', amount: 26000 }], notes: '' },
        { id: 'ip4', ip: 'IP-0004', patientId: '', name: 'K. Anand', age: 47, gender: 'MALE', phone: '+919000011122', doctors: ['Dr. Suresh Menon'], onDuty: [], op: '', opDate: '', dept: 'Ophthalmology', diag: '', adm: tsAt(addDays(T, -1), 14, 0), disc: '', status: 'admitted', inc: [{ name: 'Observation', amount: 4500 }], discount: 0, payments: [], notes: '' }
      ]
    };
  }
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.patients && s.ipd) { if (!s.addresses) s.addresses = ['Bengaluru', 'Chennai', 'Jaipur', 'Ahmedabad']; return s; } } catch (e) {} return seed(); };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  const ipTotals = ip => { const pk = ip.inc.reduce((s, i) => s + (Number(i.amount) || 0), 0), net = pk - (Number(ip.discount) || 0), rec = ip.payments.reduce((s, r) => s + (Number(r.amount) || 0), 0); return { pk, net, rec, bal: net - rec }; };
  const learnAddr = (d, a) => { a = String(a || '').trim(); if (!a) return; d.addresses = d.addresses || []; if (!d.addresses.some(x => x.toLowerCase() === a.toLowerCase())) d.addresses.push(a); };
  const fullName = p => (p.firstName + ' ' + (p.lastName || '')).trim();

  class Ctl {
    constructor(host, dev) {
      this.h = host; this.dev = dev; this.g = false;
      this.s = { aOpen: '', view: 'home', q: '', tab: 'opd', date: todayISO(), sq: '', lq: '', page: 1, menu: '', detail: '', dtab: 'info', expRx: '', ilq: '', isq: '', ifilter: 'all', idetail: '', toast: null, data: load(), reg: null, edit: null, del: '', stats: false, addSvc: null, pay: null, print: null, idel: '', adm: null, newDate: '', moveOpen: false };
    }
    set(p) { Object.assign(this.s, p); this.h.forceUpdate(); }
    get d() { return this.s.data; }
    commit(data) { this.s.data = data; save(data); }
    mount() { this.kd = e => this.key(e); window.addEventListener('keydown', this.kd); }
    unmount() { window.removeEventListener('keydown', this.kd); clearTimeout(this.tt); }
    toast(msg) { clearTimeout(this.tt); this.set({ toast: msg }); this.tt = setTimeout(() => this.set({ toast: null }), 3500); }
    focus(sel) { setTimeout(() => { const el = document.querySelector(sel); el && el.focus(); }, 40); }
    anyModal() { const s = this.s; return s.reg || s.edit || s.del || s.stats || s.addSvc || s.print || s.idel || s.adm || s.idetail; }
    closeTop() { const s = this.s; if (s.print) return this.set({ print: null }); if (s.addSvc) return this.set({ addSvc: null }); if (s.edit) return this.set({ edit: null }); if (s.del) return this.set({ del: '' }); if (s.stats) return this.set({ stats: false }); if (s.idel) return this.set({ idel: '' }); if (s.adm) return this.set({ adm: null }); if (s.reg) return this.closeReg(); if (s.idetail) return this.set({ idetail: '' }); }
    go(v) { this.set({ view: v, tab: 'opd', q: '', sq: '', lq: '', page: 1, menu: '', detail: '', ilq: '', isq: '', ifilter: 'all', date: todayISO() }); }
    key(e) {
      const s = this.s, tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === 'Escape') { if (this.anyModal()) return this.closeTop(); if (s.menu) return this.set({ menu: '' }); if (typing) return e.target.blur(); if (s.detail) return this.set({ detail: '' }); if (s.view !== 'home') this.go('home'); return; }
      if (this.anyModal() || e.metaKey || e.ctrlKey || e.altKey || typing) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); this.focus('[data-hms="search"]'); return; }
      if (this.g) { this.g = false; const m = MODS.find(x => x[2].toLowerCase() === k); if (m) this.go(m[0]); return; }
      if (k === 'g') { this.g = true; setTimeout(() => { this.g = false; }, 1200); return; }
      if (s.view === 'Patients' && !s.detail && k === 'n') { e.preventDefault(); return this.openAdd(); }
      if (s.view === 'In-Patients' && k === 'a') { e.preventDefault(); return this.openAdm(); }
    }
    // ───── patients data
    patientRows() {
      const s = this.s, d = this.d, day = d.patients.filter(p => p.date === s.date);
      const order = day.slice().sort((a, b) => a.createdAt - b.createdAt), tok = {}; order.forEach((p, i) => { tok[p.id] = i + 1; });
      const list = day.filter(p => has(s.lq, [fullName(p), p.phone, p.patientId])).sort((a, b) => b.createdAt - a.createdAt);
      return { list, tok, total: day.length };
    }
    openAdd() { if (this.s.tab === 'ipd' || this.s.view === 'In-Patients') this.openAdm(); else this.openReg(); }
    // ───── registration wizard
    openReg() {
      const ld = k => { try { return localStorage.getItem('docsile_default_' + k) || ''; } catch (e) { return ''; } };
      const d = this.d;
      this.set({ reg: { step: 1, createdId: '', err: '', f: { date: this.s.date, pid: 'P-' + String(d.pseq).padStart(4, '0'), name: '', guardian: '', dob: '', age: '', gender: '', phone: '', email: '', address: '', category: 'Regular', doctor: ld('doctorName'), dept: ld('department'), ref: ld('referredBy') }, defs: { doctor: ld('doctorName'), dept: ld('department'), ref: ld('referredBy') }, svcs: [], regFee: REG_FEE.enabled, discount: 0, paid: 0, paidTouched: false, mode: 'Cash', cat: 'All', ss: '', custom: false, cu: { name: '', cat: 'Consultation', amt: '' }, receipt: null } });
      this.syncRegFee(); this.focus('[data-hms="rname"]');
    }
    closeReg() { this.set({ reg: null }); }
    regSvcs() { const r = this.s.reg; return (r.regFee ? [{ id: '__reg', d: 'Registration Fee', c: 'Registration', q: 1, u: REG_FEE.amount, a: REG_FEE.amount }] : []).concat(r.svcs); }
    syncRegFee() { const r = this.s.reg; if (r && !r.paidTouched) r.paid = this.regTotals().total; }
    regTotals() { const r = this.s.reg, sub = this.regSvcs().reduce((a, i) => a + i.a, 0), total = Math.max(0, sub - (Number(r.discount) || 0)); return { sub, total, bal: total - (Number(r.paid) || 0) }; }
    setRegAge(v) { const r = this.s.reg, a = String(v).replace(/\D/g, '').slice(0, 3); r.f.age = a; if (a) r.f.dob = (new Date().getFullYear() - parseInt(a, 10)) + '-01-01'; this.h.forceUpdate(); }
    setRegDob(v) { const r = this.s.reg; r.f.dob = v; r.f.age = v ? String(calcAge(v)) : ''; this.h.forceUpdate(); }
    toggleDefault(k, formKey) { const r = this.s.reg, v = r.f[formKey]; if (!v) return; const cur = r.defs[k === 'doctorName' ? 'doctor' : k === 'department' ? 'dept' : 'ref']; const key = k === 'doctorName' ? 'doctor' : k === 'department' ? 'dept' : 'ref'; const clearing = cur === v; r.defs[key] = clearing ? '' : v; try { clearing ? localStorage.removeItem('docsile_default_' + k) : localStorage.setItem('docsile_default_' + k, v); } catch (e) {} this.toast(clearing ? 'Default cleared' : '"' + v + '" set as default'); }
    regNext() {
      const r = this.s.reg, f = r.f;
      const err = !f.name.trim() ? 'Full name is required' : !f.gender ? 'Gender is required' : !f.phone.trim() ? 'Phone is required' : f.phone.length < 10 ? 'Enter a valid 10-digit phone number' : !f.date ? 'Appointment date is required' : '';
      r.fe = { name: !f.name.trim() ? 'Required' : '', gender: !f.gender ? 'Required' : '', phone: !f.phone.trim() ? 'Required' : f.phone.length < 10 ? 'Enter 10 digits' : '', date: !f.date ? 'Required' : '' };
      if (err) { r.err = err; return this.h.forceUpdate(); }
      r.fe = null;
      const d = clone(this.d), parts = f.name.trim().split(/\s+/);
      const rec = { firstName: parts[0], lastName: parts.slice(1).join(' '), phone: '+91' + f.phone, email: f.email, gender: f.gender, dob: f.dob, age: f.age ? +f.age : '', address: f.address, guardian: f.guardian, doctorName: f.doctor, department: f.dept, category: f.category || 'Regular', type: 'OPD', date: f.date, referredBy: f.ref };
      learnAddr(d, f.address);
      if (r.createdId) { Object.assign(d.patients.find(p => p.id === r.createdId), rec); }
      else { const n = d.pseq++; const id = 'pat-' + n; d.patients.push(Object.assign({ id, patientId: f.pid, createdAt: Date.now(), status: 'REGISTERED', notes: '', rx: [] }, rec)); r.createdId = id; }
      this.commit(d); r.err = ''; r.step = 2; this.syncRegFee(); this.h.forceUpdate();
    }
    regRegister() {
      const r = this.s.reg, items = this.regSvcs();
      if (!items.length) { r.err = 'Add at least one service'; return this.h.forceUpdate(); }
      const t = this.regTotals(), d = clone(this.d), p = d.patients.find(x => x.id === r.createdId), n = d.rseq++;
      const paid = Math.min(Number(r.paid) || 0, t.total);
      const rx = { id: 'rx' + n, no: 'RX-' + String(n).padStart(4, '0'), date: r.f.date, items: items.map(i => ({ d: i.d, c: i.c, q: i.q, u: i.u, a: i.a })), discount: Number(r.discount) || 0, total: t.total, paid, due: t.total - paid, mode: r.mode, payments: paid ? [{ amt: paid, mode: r.mode }] : [], diagnosis: '' };
      p.rx.push(rx); this.commit(d);
      r.receipt = { no: rx.no, name: r.f.name.trim().toUpperCase(), pid: r.f.pid, items: rx.items, sub: t.sub, discount: rx.discount, total: rx.total, paid, due: rx.due, mode: r.mode, doctor: r.f.doctor, date: r.f.date };
      r.err = ''; r.step = 3; this.h.forceUpdate();
    }
    toggleSvc(t) {
      const r = this.s.reg, i = r.svcs.findIndex(x => x.id === t.id);
      if (i >= 0) { r.svcs.splice(i, 1); r.discount = Math.max(0, r.discount - t.discount); }
      else { r.svcs.push({ id: t.id, d: t.name, c: t.category, q: 1, u: t.amount, a: t.amount }); r.discount += t.discount; }
      this.syncRegFee(); this.h.forceUpdate();
    }
    updSvc(id, k, v) { const it = this.s.reg.svcs.find(x => x.id === id); if (!it) return; it[k] = Math.max(0, parseFloat(v) || 0); it.a = it.q * it.u; this.syncRegFee(); this.h.forceUpdate(); }
    addCustom() { const r = this.s.reg, c = r.cu, a = parseFloat(c.amt); if (!c.name.trim() || !a) return; r.svcs.push({ id: 'c' + Date.now(), d: c.name.trim(), c: c.cat, q: 1, u: a, a }); r.cu = { name: '', cat: 'Consultation', amt: '' }; r.custom = false; this.syncRegFee(); this.h.forceUpdate(); }
    // ───── patient mutations
    mutP(id, fn, msg) { const d = clone(this.d), p = d.patients.find(x => x.id === id); if (!p) return; fn(p, d); this.commit(d); this.toast(msg); this.h.forceUpdate(); }
    saveEdit() {
      const e = this.s.edit, f = e.f;
      if (!f.first.trim()) { e.err = 'First name is required'; return this.h.forceUpdate(); }
      if (f.phone.replace(/\D/g, '').length < 7) { e.err = 'Valid phone number required'; return this.h.forceUpdate(); }
      this.mutP(e.id, (p, dd) => { learnAddr(dd, f.address); Object.assign(p, { firstName: f.first.trim(), lastName: f.last.trim(), phone: f.phone, email: f.email, gender: f.gender, dob: f.dob, address: f.address, type: f.type, date: f.date, referredBy: f.ref }); }, 'Patient updated');
      this.set({ edit: null });
    }
    delPatient() { const id = this.s.del, d = clone(this.d); d.patients = d.patients.filter(p => p.id !== id); this.commit(d); this.set({ del: '', detail: '', menu: '' }); this.toast('Patient deleted'); }
    addService() {
      const a = this.s.addSvc, t = SERVICES.find(x => x.id === a.svc);
      if (!t) { a.err = 'Select a service'; return this.h.forceUpdate(); }
      const amt = a.amt === '' ? t.amount : parseFloat(a.amt) || 0, pid = a.id;
      this.mutP(pid, (p, d) => {
        const day = p.date; let rx = p.rx.find(r => r.date === day);
        if (!rx) { const n = d.rseq++; rx = { id: 'rx' + n, no: 'RX-' + String(n).padStart(4, '0'), date: day, items: [], discount: 0, total: 0, paid: 0, due: 0, mode: a.mode, payments: [], diagnosis: '' }; p.rx.push(rx); }
        rx.items.push({ d: t.name, c: t.category, q: 1, u: t.amount, a: t.amount });
        rx.total = rx.items.reduce((s, i) => s + i.a, 0) - rx.discount; const pay = Math.min(amt, rx.total - rx.paid);
        if (pay > 0) { rx.paid += pay; rx.payments.push({ amt: pay, mode: a.mode }); }
        rx.due = rx.total - rx.paid; rx.mode = a.mode;
      }, 'Service added');
      this.set({ addSvc: null });
    }
    recordPay() {
      const pay = this.s.pay, amt = parseFloat(pay.amt) || 0;
      if (amt <= 0 || amt > pay.due) { pay.err = 'Enter an amount up to ' + inr(pay.due); return this.h.forceUpdate(); }
      this.mutP(this.s.detail, p => { const rx = p.rx.find(r => r.id === pay.rx); rx.paid += amt; rx.due = rx.total - rx.paid; rx.payments.push({ amt, mode: pay.mode }); rx.mode = pay.mode; }, 'Payment recorded · ' + inr(amt));
      this.set({ pay: null });
    }
    // ───── in-patients
    ipRows() {
      const s = this.s, d = this.d, base = d.ipd.filter(x => has(s.isq, [x.name, x.ip, x.phone, x.op]));
      return base.filter(x => s.ifilter === 'all' || x.status === s.ifilter).slice().sort((a, b) => b.adm - a.adm);
    }
    openAdm() {
      const d = this.d;
      this.set({ adm: { step: 1, err: '', ipno: 'IP-' + String(d.ipseq).padStart(4, '0'), eq: '', eOpen: false, sq: '', sOpen: false, sApplied: false, pq: '', pOpen: false, pApplied: false, f: { opPid: '', adm: this.nowLocal(), disc: '', name: '', age: '', gender: '', dob: '', phone: '', address: '', guardian: '', ref: '', notes: '', opDate: '', op: '', dept: '', diag: '', doctors: [''], onDuty: [''], proc: '', details: '', inc: [{ name: '', amount: '' }], discount: '', pays: [] } } });
      this.focus('[data-hms="eq"]');
    }
    nowLocal() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
    admTotals() { const f = this.s.adm.f, pk = f.inc.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0), net = pk - (parseFloat(f.discount) || 0), rec = f.pays.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0); return { pk, net, rec, bal: net - rec }; }
    admNext() {
      const a = this.s.adm, f = a.f;
      if (a.step === 1) { a.fe = { name: !f.name.trim() ? 'Required' : '', age: !f.age ? 'Required' : '', gender: !f.gender ? 'Required' : '', phone: !f.phone.trim() ? 'Required' : '' }; const err = !f.name.trim() ? 'Full name is required' : !f.age ? 'Age is required' : !f.gender ? 'Gender is required' : !f.phone.trim() ? 'Phone is required' : ''; if (err) { a.err = err; return this.h.forceUpdate(); } }
      if (a.step === 2) { a.fe = { op: !f.op.trim() ? 'Required' : '', doctors: !f.doctors.some(x => x.trim()) ? 'Add one' : '' }; const err = !f.op.trim() ? 'Operation name is required' : !f.doctors.some(x => x.trim()) ? 'Add at least one doctor' : ''; if (err) { a.err = err; return this.h.forceUpdate(); } }
      a.err = ''; a.fe = null; a.step = Math.min(3, a.step + 1); this.h.forceUpdate();
    }
    admSubmit() {
      const a = this.s.adm, f = a.f;
      if (!f.inc.some(i => i.name.trim())) { a.err = 'Add at least one package inclusion'; return this.h.forceUpdate(); }
      const d = clone(this.d), n = d.ipseq++; learnAddr(d, f.address);
      d.ipd.push({ id: 'ip' + n + Date.now(), ip: a.ipno, patientId: f.opPid, name: f.name.trim(), age: +f.age, gender: f.gender, phone: '+91' + f.phone, doctors: f.doctors.filter(x => x.trim()), onDuty: f.onDuty.filter(x => x.trim()), op: f.op, opDate: f.opDate, dept: f.dept, diag: f.diag, adm: new Date(f.adm).getTime() || Date.now(), disc: f.disc, status: 'admitted', inc: f.inc.filter(i => i.name.trim()).map(i => ({ name: i.name.trim(), amount: parseFloat(i.amount) || 0 })), discount: parseFloat(f.discount) || 0, payments: f.pays.map(r => ({ date: r.date, type: r.type, mode: r.mode, amount: parseFloat(r.amount) || 0 })), notes: f.notes });
      this.commit(d); this.set({ adm: null }); this.toast('Patient admitted'); 
    }
    setIpStatus(id, status) { const d = clone(this.d), x = d.ipd.find(i => i.id === id); x.status = status; x.disc = status === 'discharged' ? todayISO() : ''; this.commit(d); this.toast('Status updated'); this.h.forceUpdate(); }
    delIp() { const d = clone(this.d); d.ipd = d.ipd.filter(i => i.id !== this.s.idel); this.commit(d); this.set({ idel: '', idetail: '' }); this.toast('Inpatient record deleted'); }
    pickExisting(p) { const f = this.s.adm.f; f.opPid = p.patientId; f.name = fullName(p); f.age = p.age ? String(p.age) : f.age; f.gender = (p.gender || '').toUpperCase(); f.phone = String(p.phone).replace('+91', ''); f.address = p.address || f.address; f.guardian = p.guardian || f.guardian; f.dob = p.dob || f.dob; this.s.adm.eq = fullName(p) + ' · ' + p.patientId; this.s.adm.eOpen = false; this.h.forceUpdate(); }
    applySurgery(t) { const a = this.s.adm, f = a.f; f.op = t.name; f.dept = t.department; f.doctors = t.doctors.length ? t.doctors.slice() : ['']; f.onDuty = t.onDuty.length ? t.onDuty.slice() : ['']; f.diag = t.diag; f.proc = t.proc; f.details = t.details; a.sq = t.name; a.sOpen = false; a.sApplied = true; this.h.forceUpdate(); }
    applyPackage(t) { const a = this.s.adm, f = a.f; f.inc = t.inc.map(([name, amount]) => ({ name, amount: String(amount) })); f.discount = t.discount ? String(t.discount) : ''; a.pq = t.name; a.pOpen = false; a.pApplied = true; this.h.forceUpdate(); }
    // ───── view model
    getIn(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), this.s); }
    setIn(path, val) { const ks = path.split('.'); let o = this.s; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; this.h.forceUpdate(); }
    fld(path, tf, after) { return { v: this.getIn(path) == null ? '' : this.getIn(path), on: e => { this.setIn(path, tf ? tf(e.target.value) : e.target.value); after && after(); } }; }
    pills(arr, cur, pick, lab) { return arr.map(x => { const on = cur === x; return { l: lab ? lab(x) : x, bg: on ? 'var(--color-accent)' : 'var(--color-card)', fg: on ? 'var(--color-accent-foreground)' : 'var(--color-foreground)', ring: on ? '0 0 0 1.5px var(--color-primary)' : '0 0 0 1px var(--color-border)', pick: () => pick(x) }; }); }
    vals() {
      const t = this, s = this.s, d = this.d, v = s.view, q = s.q.trim().toLowerCase();
      const all = MODS.map(([l, ic, k]) => ({ l, k, u: ICONS[ic], open: () => t.go(l) }));
      const tiles = all.filter(m => !q || m.l.toLowerCase().includes(q));
      const O = o => o.map(x => ({ v: x, l: x }));
      const out = {
        isHome: v === 'home', isOther: v !== 'home' && v !== 'Patients' && v !== 'In-Patients', isPatients: v === 'Patients' && !s.detail, isDetail: v === 'Patients' && !!s.detail, isInpatients: v === 'In-Patients',
        cur: all.find(m => m.l === v) || { l: '', u: '' }, tiles, noMatch: tiles.length === 0, q: s.q, onQ: e => t.set({ q: e.target.value }), goHome: () => t.go('home'),
        toastOn: !!s.toast, toastMsg: s.toast || '', dismiss: () => t.set({ toast: null }),
        docOpts: O(DOCTORS), deptOpts: O(DEPTS), refOpts: O(REFS), catOpts: O(CATS), modeOpts: O(PAYMODES), svcCats: SCATS, genderOpts: O(['Male', 'Female', 'Other']), typeOpts: O(['OPD', 'Walk-in', 'Referral']), amtTypeOpts: O(AMT_TYPES), ipayOpts: O(IPAY_MODES), igOpts: [{ v: 'MALE', l: 'Male' }, { v: 'FEMALE', l: 'Female' }, { v: 'OTHER', l: 'Other' }]
      };
      // ── Patients page
      out.tabs = [['opd', 'Out-Patients'], ['ipd', 'In-Patients']].map(([k, l]) => ({ l, bg: s.tab === k ? 'var(--color-card)' : 'transparent', fg: s.tab === k ? 'var(--color-foreground)' : 'var(--color-muted-foreground)', sh: s.tab === k ? 'var(--shadow-card)' : 'none', w: s.tab === k ? 600 : 500, pick: () => t.set({ tab: k, menu: '', page: 1 }) }));
      out.tabOpd = s.tab === 'opd'; out.tabIpd = s.tab === 'ipd';
      out.refresh = () => t.toast('Refreshed'); out.openStats = () => t.set({ stats: true }); out.openAdd = () => t.openAdd();
      out.addLabel = 'Add Patient';
      const pr = this.patientRows(), PS = 8, pages = Math.max(1, Math.ceil(pr.list.length / PS)), pg = Math.min(s.page, pages);
      const isToday = s.date === todayISO();
      out.dateLabel = fmtDate(s.date); out.isToday = isToday; out.notToday = !isToday;
      out.prevDay = () => t.set({ date: addDays(s.date, -1), page: 1 }); out.nextDay = () => t.set({ date: addDays(s.date, 1), page: 1 }); out.goToday = () => t.set({ date: todayISO(), page: 1 });
      out.sq = { v: s.sq, on: e => t.set({ sq: e.target.value }) };
      out.sKey = e => { if (e.key === 'Enter') { e.preventDefault(); t.set({ lq: s.sq, page: 1 }); } };
      const sugs = s.sq.trim().length >= 2 ? d.patients.filter(p => has(s.sq, [fullName(p), p.phone, p.patientId])).slice(0, 6).map(p => ({ name: fullName(p), sub: p.patientId + ' · ' + p.phone, open: () => t.set({ view: 'Patients', detail: p.id, dtab: 'info', sq: '', sOpenOff: true }) })) : [];
      out.sugs = sugs; out.sugOn = sugs.length > 0; out.filterNote = !!s.lq; out.filterText = s.lq; out.clearFilter = () => t.set({ lq: '', sq: '', page: 1 });
      const rows = pr.list.slice((pg - 1) * PS, pg * PS).map(p => {
        const rx = p.rx.slice().sort((a, b) => b.id.localeCompare(a.id))[0], items = rx ? rx.items : [], st = SM[p.status] || { l: p.status, t: 'neutral' };
        return Object.assign({ id: p.id, token: pr.tok[p.id], time: fmtTime(p.createdAt), pid: p.patientId, name: fullName(p), ageG: (p.age || (p.dob ? calcAge(p.dob) : '—')) + ' / ' + p.gender, phone: p.phone, doctor: p.doctorName ? (p.doctorName.startsWith('Dr') ? p.doctorName : 'Dr. ' + p.doctorName) : '—', type: p.type, status: st.l, svcHas: items.length > 0, svcFirst: items[0] ? items[0].d : '', svcExtra: items.length > 1 ? '+' + (items.length - 1) : '', svcMore: items.length > 1, recHas: !!rx, rec: rx ? inr(rx.total) : '—', due: rx ? 'Due: ' + inr(rx.due) : '', hasDue: !!rx && rx.due > 0, ref: p.referredBy || '—', canPrint: p.status === 'COMPLETED', quick: e => { e.stopPropagation(); t.toast('Printing receipt for ' + fullName(p)); }, open: () => t.set({ detail: p.id, dtab: 'info', menu: '', pay: null, expRx: '' }), menuOn: s.menu === p.id, toggleMenu: e => { e.stopPropagation(); t.set({ menu: s.menu === p.id ? '' : p.id }); }, edit: e => { e.stopPropagation(); t.set({ menu: '', edit: { id: p.id, err: '', f: { first: p.firstName, last: p.lastName || '', phone: p.phone, email: p.email || '', gender: p.gender, dob: p.dob || '', address: p.address || '', type: p.type, date: p.date, ref: p.referredBy || '' } } }); }, del: e => { e.stopPropagation(); t.set({ menu: '', del: p.id }); } }, tone(st.t));
      });
      out.rows = rows; out.empty = rows.length === 0; out.emptyMsg = s.lq ? 'No patients match “' + s.lq + '”.' : 'No patients registered for ' + fmtDate(s.date) + '.';
      out.pageInfo = pr.list.length ? ((pg - 1) * PS + 1) + '–' + Math.min(pg * PS, pr.list.length) + ' of ' + pr.list.length : '0 patients';
      out.hasPrev = pg > 1; out.hasNext = pg < pages; out.prevPage = () => t.set({ page: pg - 1 }); out.nextPage = () => t.set({ page: pg + 1 }); out.closeMenu = () => t.set({ menu: '' }); out.prevOp = pg > 1 ? 1 : 0.4; out.nextOp = pg < pages ? 1 : 0.4; out.svcCatOpts = SCATS.filter(x => x !== 'All').map(x => ({ v: x, l: x })); out.ixStatusOpts = [{ v: 'admitted', l: 'Admitted' }, { v: 'discharged', l: 'Discharged' }];
      // ── In-patients (tab + page)
      const ipr = this.ipRows();
      out.irows = ipr.map(x => { const T2 = ipTotals(x), st = x.status === 'admitted' ? { l: 'Admitted', t: 'info' } : { l: 'Discharged', t: 'success' }; return Object.assign({ id: x.id, ip: x.ip, name: x.name, sub: x.age + 'y · ' + x.gender.charAt(0) + ' · ' + x.phone.replace('+91', ''), doctors: x.doctors.join(', ') || '—', op: x.op || 'Not assigned', hasOp: !!x.op, adm: fmtDate(isoOfDate(new Date(x.adm))), status: st.l, bal: inr(T2.bal), balc: T2.bal > 0 ? 'var(--color-warning-soft-foreground)' : 'var(--color-success-soft-foreground)', open: () => t.set({ idetail: x.id }) }, tone(st.t)); });
      out.iempty = out.irows.length === 0;
      out.admittedN = d.ipd.filter(x => x.status === 'admitted').length; out.dischargedN = d.ipd.filter(x => x.status === 'discharged').length;
      out.ifilters = [['all', 'All'], ['admitted', 'Admitted'], ['discharged', 'Discharged']].map(([k, l]) => ({ l, bg: s.ifilter === k ? 'var(--color-card)' : 'transparent', fg: s.ifilter === k ? 'var(--color-foreground)' : 'var(--color-muted-foreground)', sh: s.ifilter === k ? 'var(--shadow-card)' : 'none', w: s.ifilter === k ? 600 : 500, pick: () => t.set({ ifilter: k }) }));
      out.isq = { v: s.isq, on: e => t.set({ isq: e.target.value }) };
      out.openAdm = () => t.openAdm();
      // ── detail
      const dp = s.detail && d.patients.find(p => p.id === s.detail);
      out.hasDetail = !!dp;
      if (dp) {
        const rxs = dp.rx.slice().sort((a, b) => b.id.localeCompare(a.id)), billed = rxs.filter(r => r.total > 0), due = billed.reduce((a, r) => a + r.due, 0), st = SM[dp.status] || { l: dp.status, t: 'neutral' };
        const age = dp.age || (dp.dob ? calcAge(dp.dob) : '—');
        out.dp = Object.assign({ name: fullName(dp), initials: (dp.firstName[0] || '') + ((dp.lastName || '')[0] || ''), pid: dp.patientId, phone: dp.phone, ageG: age + ' yrs · ' + dp.gender, doctor: dp.doctorName, hasDoctor: !!dp.doctorName, status: st.l, balHas: billed.length > 0, hasDue: due > 0, noDue: billed.length > 0 && due === 0, due: inr(due), canPrint: billed.length > 0, bar: 'var(--color-' + (st.t === 'neutral' ? 'primary' : st.t) + ')' }, tone(st.t));
        out.back = () => t.set({ detail: '', pay: null });
        out.dtabs = [['info', 'Info'], ['receipts', 'Receipts'], ['history', 'History']].map(([k, l]) => ({ l, bg: s.dtab === k ? 'var(--color-card)' : 'transparent', fg: s.dtab === k ? 'var(--color-foreground)' : 'var(--color-muted-foreground)', sh: s.dtab === k ? 'var(--shadow-card)' : 'none', w: s.dtab === k ? 600 : 500, pick: () => t.set({ dtab: k }) }));
        out.dInfo = s.dtab === 'info'; out.dRec = s.dtab === 'receipts'; out.dHist = s.dtab === 'history';
        const addr = dp.address || '';
        out.fields = [['Phone', dp.phone], ['Age / Gender', age + ' / ' + dp.gender], ['Date of Birth', dp.dob ? fmtDate(dp.dob) : '—'], ['Appointment', fmtDate(dp.date)], ['Doctor', dp.doctorName || '—'], ['Department', dp.department || '—'], ['Referred By', dp.referredBy || '—'], ['Guardian', dp.guardian || '—'], ['Patient Type', dp.category || 'Regular']].map(([l, val]) => ({ l, val }));
        out.addrHas = !!addr; out.addr = addr; out.notesHas = !!dp.notes; out.notes = dp.notes;
        out.rcpts = billed.map(r => ({ no: r.no, date: fmtDate(r.date), items: r.items.map(i => ({ d: i.d, a: inr(i.a) })), total: inr(r.total + r.discount), hasDisc: r.discount > 0, disc: '-' + inr(r.discount), paid: inr(r.paid), mode: r.mode, due: r.due > 0, tag: r.due > 0 ? 'Due: ' + inr(r.due) : 'Paid', tb: r.due > 0 ? 'var(--color-error-soft)' : 'var(--color-success-soft)', tf: r.due > 0 ? 'var(--color-error-soft-foreground)' : 'var(--color-success-soft-foreground)', print: () => t.set({ print: { tab: 'cash', id: dp.id } }) }));
        out.noRcpts = billed.length === 0;
        out.hist = rxs.map(r => ({ title: r.total > 0 ? 'Billed' : 'Visit', no: r.no, date: fmtDate(r.date), amt: r.total > 0 ? inr(r.total) : '', hasDue: r.due > 0, due: 'Due: ' + inr(r.due) }));
        out.noHist = rxs.length === 0; out.hasEye = false;
        out.bills = billed.map(r => { const open = s.expRx === r.id, pay = s.pay && s.pay.rx === r.id; return { no: r.no, total: inr(r.total), open, summary: 'Total ' + inr(r.total) + ' · Paid ' + inr(r.paid), tag: r.due > 0 ? 'Due: ' + inr(r.due) : 'Paid', tc: r.due > 0 ? 'var(--color-error-soft-foreground)' : 'var(--color-success-soft-foreground)', canPay: r.due > 0 && !pay, paying: pay, toggle: () => t.set({ expRx: open ? '' : r.id }), startPay: () => t.set({ pay: { rx: r.id, due: r.due, amt: String(r.due), mode: 'Cash', err: '' } }) }; });
        out.noBills = billed.length === 0; out.billDue = due > 0; out.billDueText = 'Due: ' + inr(due);
        out.pay = s.pay ? { amt: t.fld('pay.amt', v => v.replace(/[^\d.]/g, '')), mode: t.fld('pay.mode'), err: s.pay.err, hasErr: !!s.pay.err, submit: () => t.recordPay(), cancel: () => t.set({ pay: null }) } : { amt: { v: '', on: null }, mode: { v: '', on: null }, err: '', hasErr: false };
        out.openAddSvc = () => t.set({ addSvc: { id: dp.id, svc: '', mode: 'Cash', amt: '', err: '' } });
        out.statusSel = { v: dp.status, on: e => t.mutP(dp.id, p => { p.status = e.target.value; }, 'Status updated') };
        out.statusOpts = STATUSES.map(([k, l]) => ({ v: k, l }));
        out.moveOpen = s.moveOpen; out.moveClosed = !s.moveOpen; out.curDate = fmtDate(dp.date); out.startMove = () => t.set({ moveOpen: true, newDate: dp.date });
        out.newDate = t.fld('newDate'); out.cancelMove = () => t.set({ moveOpen: false });
        out.doMove = () => { if (!s.newDate) return; t.mutP(dp.id, p => { p.date = s.newDate; }, 'Appointment moved to ' + fmtDate(s.newDate)); t.set({ moveOpen: false }); };
        out.askDelete = () => t.set({ del: dp.id }); out.openPrint = () => t.set({ print: { tab: 'cash', id: dp.id } });
      }
      // ── reg modal
      const r = s.reg;
      out.regOn = !!r; out.rs1 = !!r && r.step === 1; out.rs2 = !!r && r.step === 2; out.rs3 = !!r && r.step === 3;
      out.closeReg = () => t.closeReg();
      if (r) {
        out.steps = [[1, 'Patient Info'], [2, 'Services & Payment'], [3, 'Receipt']].map(([n, l]) => ({ n: r.step > n ? '✓' : n, l, bg: r.step === n ? 'var(--color-primary)' : r.step > n ? 'var(--color-accent)' : 'transparent', fg: r.step === n ? '#fff' : r.step > n ? 'var(--color-accent-foreground)' : 'var(--color-muted-foreground)' }));
        out.rerr = r.err; out.rhasErr = !!r.err;
        const F = k => t.fld('reg.f.' + k);
        out.rf = { date: F('date'), pid: F('pid'), name: t.fld('reg.f.name', x => x.toUpperCase()), guardian: F('guardian'), dob: t.fld('reg.f.dob', x => x, null), age: F('age'), phone: t.fld('reg.f.phone', phoneFmt), email: F('email'), address: F('address'), category: F('category'), doctor: t.fld('reg.f.doctor', null, () => { const dd = DOC_DEPT[r.f.doctor]; if (dd) r.f.dept = dd; t.h.forceUpdate(); }), dept: F('dept'), ref: F('ref') };
        out.rf.dob.on = e => t.setRegDob(e.target.value); out.rf.age.on = e => t.setRegAge(e.target.value);
        out.rGender = t.pills(['Male', 'Female', 'Other'], r.f.gender, g => { r.f.gender = g; t.h.forceUpdate(); });
        const star = (k, fk, key) => { const on = !!r.defs[key] && r.defs[key] === r.f[fk]; return { ch: on ? '★' : '☆', c: on ? 'var(--color-warning)' : 'var(--color-muted-foreground)', toggle: () => t.toggleDefault(k, fk) }; };
        out.stDoc = star('doctorName', 'doctor', 'doctor'); out.stDept = star('department', 'dept', 'dept'); out.stRef = star('referredBy', 'ref', 'ref');
        out.regNext = () => t.regNext(); out.regBack = () => { r.step = 1; r.err = ''; t.h.forceUpdate(); };
        // step 2
        out.regFeeBg = r.regFee ? 'var(--color-accent)' : 'transparent'; out.regFeeCb = r.regFee ? 'var(--color-primary)' : 'transparent'; out.regFeeCk = r.regFee ? '✓' : ''; out.regFeeShow = REG_FEE.enabled; out.regFeeOn = r.regFee; out.regFeeAmt = inr(REG_FEE.amount); out.toggleRegFee = () => { r.regFee = !r.regFee; t.syncRegFee(); t.h.forceUpdate(); };
        const sv = t.regSvcs(), tot = t.regTotals();
        out.svcAdded = sv.map(i => ({ d: i.d, c: i.c, amt: inr(i.a), fee: i.id === '__reg', q: { v: i.q, on: e => t.updSvc(i.id, 'q', e.target.value) }, u: { v: i.u, on: e => t.updSvc(i.id, 'u', e.target.value) }, remove: () => { if (i.id === '__reg') { r.regFee = false; t.syncRegFee(); t.h.forceUpdate(); } else { const tp = SERVICES.find(x => x.id === i.id); if (tp) t.toggleSvc(tp); else { r.svcs = r.svcs.filter(z => z.id !== i.id); t.syncRegFee(); t.h.forceUpdate(); } } } }));
        out.svcAddedHas = sv.length > 0; out.svcAddedN = sv.length; out.subtotalT = inr(tot.sub);
        out.svcSearch = t.fld('reg.ss');
        out.svcCatPills = t.pills(SCATS, r.cat, c => { r.cat = c; t.h.forceUpdate(); });
        const flt = SERVICES.filter(x => (r.cat === 'All' || x.category === r.cat) && (!r.ss || x.name.toLowerCase().includes(r.ss.toLowerCase())));
        out.svcList = flt.map(x => { const on = r.svcs.some(z => z.id === x.id); return { name: x.name, cat: x.category, amt: inr(x.amount), hasDisc: x.discount > 0, disc: '-' + inr(x.discount), on, bg: on ? 'var(--color-accent)' : 'transparent', dot: on ? 'var(--color-primary)' : 'transparent', dotb: on ? 'var(--color-primary)' : 'var(--color-border)', pick: () => t.toggleSvc(x) }; });
        out.svcNone = flt.length === 0; out.clearSvcFilter = () => { r.cat = 'All'; r.ss = ''; t.h.forceUpdate(); };
        out.custOpen = r.custom; out.custClosed = !r.custom; out.openCust = () => { r.custom = true; t.h.forceUpdate(); }; out.closeCust = () => { r.custom = false; t.h.forceUpdate(); };
        out.cu = { name: t.fld('reg.cu.name'), cat: t.fld('reg.cu.cat'), amt: t.fld('reg.cu.amt', x => x.replace(/[^\d.]/g, '')) }; out.addCust = () => t.addCustom();
        out.hasSvcs = sv.length > 0;
        out.disc = t.fld('reg.discount', x => parseFloat(x) || 0, () => t.syncRegFee()); out.paidF = t.fld('reg.paid', x => parseFloat(x) || 0, () => { r.paidTouched = true; }); out.modeF = t.fld('reg.mode');
        out.totalT = inr(tot.total); out.balT = inr(tot.bal); out.balRed = tot.bal > 0 ? 'var(--color-error-soft-foreground)' : 'var(--color-foreground)';
        out.regRegister = () => t.regRegister(); out.regBtn = 'Register';
        // step 3
        const rc = r.receipt; out.rcOn = !!rc;
        if (rc) out.rc = { no: rc.no, name: rc.name, pid: rc.pid, date: fmtDate(rc.date), doctor: rc.doctor || '—', items: rc.items.map(i => ({ d: i.d, a: inr(i.a) })), sub: inr(rc.sub), hasDisc: rc.discount > 0, disc: '-' + inr(rc.discount), total: inr(rc.total), paid: inr(rc.paid), mode: rc.mode, due: inr(rc.due), hasDue: rc.due > 0 };
        out.printRc = () => t.toast('Receipt sent to printer'); out.doneReg = () => { t.closeReg(); t.toast('Patient registered · ' + (r.f.pid)); };
      }
      // ── edit / delete / stats / add svc / print
      const e = s.edit;
      out.editOn = !!e;
      if (e) { const F = k => t.fld('edit.f.' + k); out.ef = { first: F('first'), last: F('last'), phone: F('phone'), email: F('email'), gender: F('gender'), dob: F('dob'), address: F('address'), type: F('type'), date: F('date'), ref: F('ref') }; out.eerr = e.err; out.ehasErr = !!e.err; out.editPid = (d.patients.find(p => p.id === e.id) || {}).patientId; out.saveEdit = () => t.saveEdit(); out.closeEdit = () => t.set({ edit: null }); }
      const dl = s.del && d.patients.find(p => p.id === s.del);
      out.delOn = !!dl; out.delText = dl ? 'Delete ' + fullName(dl) + ' (' + dl.patientId + ')? This cannot be undone.' : ''; out.delGo = () => t.delPatient(); out.delCancel = () => t.set({ del: '' });
      out.statsOn = s.stats; out.closeStats = () => t.set({ stats: false });
      { const day = d.patients.filter(p => p.date === s.date), IN = ['IN_WORKUP', 'WORKUP_DONE', 'WITH_DOCTOR'], VI = ['VISITED', 'COMPLETED', 'MEDICAL_ONLY'];
        let rev = 0, bal = 0; const by = {}; day.forEach(p => p.rx.forEach(x => { rev += x.paid; bal += x.due; x.payments.forEach(y => { by[y.mode] = (by[y.mode] || 0) + y.amt; }); }));
        out.stDate = fmtDate(s.date);
        out.stTiles = [['Total Patients', day.length, 'var(--color-muted)', 'var(--color-foreground)'], ['Registered', day.filter(p => p.status === 'REGISTERED').length, 'var(--color-accent)', 'var(--color-primary)'], ['In Progress', day.filter(p => IN.includes(p.status)).length, 'var(--color-warning-soft)', 'var(--color-warning-soft-foreground)'], ['Visited', day.filter(p => VI.includes(p.status)).length, 'var(--color-success-soft)', 'var(--color-success-soft-foreground)']].map(([l, n, bg, fg]) => ({ l, n, bg, fg }));
        out.stRev = inr(rev); out.stBal = inr(bal); out.stModes = Object.keys(by).sort((a, b) => by[b] - by[a]).map(k => ({ k, v: inr(by[k]) })); out.stHasModes = out.stModes.length > 0; }
      const as = s.addSvc, ap = as && d.patients.find(p => p.id === as.id);
      out.addSvcOn = !!as;
      if (as) { out.asName = ap ? fullName(ap) + ' (' + ap.patientId + ')' : ''; out.asSvc = { v: as.svc, on: ev => { as.svc = ev.target.value; const tp = SERVICES.find(x => x.id === as.svc); as.amt = tp ? String(tp.amount) : ''; as.err = ''; t.h.forceUpdate(); } }; out.asOpts = [{ v: '', l: 'Select service template' }].concat(SERVICES.map(x => ({ v: x.id, l: x.name + ' — ' + inr(x.amount) }))); out.asMode = t.fld('addSvc.mode'); out.asAmt = t.fld('addSvc.amt', x => x.replace(/[^\d.]/g, '')); out.asErr = as.err; out.asHasErr = !!as.err; out.asSubmit = () => t.addService(); out.asClose = () => t.set({ addSvc: null }); }
      const pm = s.print, pp = pm && d.patients.find(p => p.id === pm.id);
      out.printOn = !!pm;
      if (pm && pp) {
        const rx = pp.rx.slice().sort((a, b) => b.id.localeCompare(a.id)).filter(x => x.total > 0)[0];
        out.pTabs = [['cash', 'Cash Receipt'], ['rx', 'Prescription'], ['read', 'Readings & Findings'], ['rep', 'Report']].map(([k, l]) => ({ l, bg: pm.tab === k ? 'var(--color-card)' : 'transparent', fg: pm.tab === k ? 'var(--color-foreground)' : 'var(--color-muted-foreground)', sh: pm.tab === k ? 'var(--shadow-card)' : 'none', w: pm.tab === k ? 600 : 500, pick: () => t.set({ print: { tab: k, id: pm.id } }) }));
        out.pCash = pm.tab === 'cash'; out.pRx = pm.tab === 'rx'; out.pRead = pm.tab === 'read'; out.pRep = pm.tab === 'rep';
        out.pTitle = 'Print Receipts — ' + fullName(pp); out.pName = fullName(pp); out.pPid = pp.patientId; out.pPhone = pp.phone; out.pAge = (pp.age || '—') + ' / ' + pp.gender; out.pDoctor = pp.doctorName || '—';
        out.pHasRx = !!rx; out.pNoRx = !rx;
        if (rx) { out.pNo = rx.no; out.pDate = fmtDate(rx.date); out.pItems = rx.items.map(i => ({ d: i.d, a: inr(i.a) })); out.pSub = inr(rx.total + rx.discount); out.pDisc = '-' + inr(rx.discount); out.pHasDisc = rx.discount > 0; out.pTotal = inr(rx.total); out.pPaid = inr(rx.paid); out.pDue = inr(rx.due); out.pMode = rx.mode; out.pDx = rx.diagnosis || 'Not recorded'; }
        out.pPrint = () => t.toast('Sent to printer'); out.pClose = () => t.set({ print: null });
      }
      // ── in-patient detail sheet
      const ix = s.idetail && d.ipd.find(i => i.id === s.idetail);
      out.idOn = !!ix;
      if (ix) { const T2 = ipTotals(ix); out.ix = { ip: ix.ip, name: ix.name, status: ix.status === 'admitted' ? 'Admitted' : 'Discharged', sb: ix.status === 'admitted' ? 'var(--color-info-soft)' : 'var(--color-success-soft)', sf: ix.status === 'admitted' ? 'var(--color-info-soft-foreground)' : 'var(--color-success-soft-foreground)', fields: [['IP Number', ix.ip], ['Patient ID', ix.patientId || '—'], ['Patient Name', ix.name], ['Phone', ix.phone], ['Admission Date', fmtDate(isoOfDate(new Date(ix.adm)))], ['Discharge Date', ix.disc ? fmtDate(ix.disc) : '—'], ['Ward', '—'], ['Bed', '—'], ['Operation', ix.op || '—'], ['Department', ix.dept || '—'], ['Package', inr(T2.pk)], ['Net / Balance', inr(T2.net) + ' / ' + inr(T2.bal)]].map(([l, val]) => ({ l, val })), duty: ix.onDuty.map(x => ({ x })), hasDuty: ix.onDuty.length > 0 };
        out.ixStatus = { v: ix.status, on: ev => t.setIpStatus(ix.id, ev.target.value) }; out.ixClose = () => t.set({ idetail: '' }); out.ixAskDel = () => t.set({ idel: ix.id }); }
      const idl = s.idel && d.ipd.find(i => i.id === s.idel);
      out.idelOn = !!idl; out.idelText = idl ? 'Delete inpatient record ' + idl.ip + '? This cannot be undone.' : ''; out.idelGo = () => t.delIp(); out.idelCancel = () => t.set({ idel: '' });
      // ── admission wizard
      const a = s.adm;
      out.admOn = !!a; out.as1 = !!a && a.step === 1; out.as2 = !!a && a.step === 2; out.as3 = !!a && a.step === 3;
      if (a) {
        const f = a.f, AF = k => t.fld('adm.f.' + k);
        out.asteps = [[1, 'Patient Details'], [2, 'Hospital Information'], [3, 'Payment & Package']].map(([n, l]) => ({ n: a.step > n ? '✓' : n, l, bg: a.step === n ? 'var(--color-primary)' : a.step > n ? 'var(--color-accent)' : 'transparent', fg: a.step === n ? '#fff' : a.step > n ? 'var(--color-accent-foreground)' : 'var(--color-muted-foreground)' }));
        out.aerr = a.err; out.ahasErr = !!a.err; out.ipno = a.ipno; out.admClose = () => t.set({ adm: null });
        out.af = { adm: AF('adm'), disc: AF('disc'), name: AF('name'), age: t.fld('adm.f.age', x => x.replace(/\D/g, '').slice(0, 3)), gender: AF('gender'), dob: AF('dob'), phone: t.fld('adm.f.phone', phoneFmt), address: AF('address'), guardian: AF('guardian'), ref: AF('ref'), notes: AF('notes'), opDate: AF('opDate'), op: AF('op'), dept: AF('dept'), diag: AF('diag'), proc: AF('proc'), details: AF('details'), discount: t.fld('adm.f.discount', x => x.replace(/[^\d.]/g, '')) };
        out.af.dob.on = e2 => { f.dob = e2.target.value; if (f.dob) f.age = String(calcAge(f.dob)); t.h.forceUpdate(); };
        out.aeq = { v: a.eq, on: e2 => { a.eq = e2.target.value; a.eOpen = true; t.h.forceUpdate(); } };
        out.eFocus = () => { a.eOpen = true; t.h.forceUpdate(); };
        const eres = a.eq.trim().length >= 2 && a.eOpen ? d.patients.filter(p => has(a.eq, [fullName(p), p.phone, p.patientId])).slice(0, 6) : [];
        out.eres = eres.map(p => ({ n: fullName(p), sub: p.patientId + ' · ' + p.phone + (p.age ? ' · ' + p.age + 'y' : ''), pick: () => t.pickExisting(p) })); out.eresOn = eres.length > 0;
        out.asq = { v: a.sq, on: e2 => { a.sq = e2.target.value; a.sOpen = true; a.sApplied = false; t.h.forceUpdate(); } }; out.sFocus = () => { a.sOpen = true; t.h.forceUpdate(); };
        const sres = a.sOpen ? SURGERIES.filter(x => !a.sq.trim() || x.name.toLowerCase().includes(a.sq.toLowerCase()) || x.department.toLowerCase().includes(a.sq.toLowerCase())) : [];
        out.sres = sres.map(x => ({ n: x.name, sub: x.department + ' · ' + x.doctors.length + ' doctor' + (x.doctors.length !== 1 ? 's' : ''), pick: () => t.applySurgery(x) })); out.sresOn = sres.length > 0; out.sApplied = a.sApplied;
        out.sReset = () => { Object.assign(f, { op: '', dept: '', diag: '', proc: '', details: '', doctors: [''], onDuty: [''] }); a.sq = ''; a.sApplied = false; t.h.forceUpdate(); };
        out.apq = { v: a.pq, on: e2 => { a.pq = e2.target.value; a.pOpen = true; a.pApplied = false; t.h.forceUpdate(); } }; out.pFocus = () => { a.pOpen = true; t.h.forceUpdate(); };
        const pres = a.pOpen ? PACKAGES.filter(x => !a.pq.trim() || x.name.toLowerCase().includes(a.pq.toLowerCase())) : [];
        out.pres = pres.map(x => ({ n: x.name, sub: x.inc.length + ' inclusions · ' + inr(x.inc.reduce((z, i) => z + i[1], 0)), pick: () => t.applyPackage(x) })); out.presOn = pres.length > 0; out.pApplied = a.pApplied;
        out.pReset = () => { f.inc = [{ name: '', amount: '' }]; f.discount = ''; a.pq = ''; a.pApplied = false; t.h.forceUpdate(); };
        const rowsOf = (key, ph) => f[key].map((val, i) => ({ ph: ph + ' ' + (i + 1), val: { v: val, on: e2 => { f[key][i] = e2.target.value; t.h.forceUpdate(); } }, rm: () => { if (f[key].length > 1) { f[key].splice(i, 1); t.h.forceUpdate(); } } }));
        out.docRows = rowsOf('doctors', 'Doctor'); out.dutyRows = rowsOf('onDuty', 'On-duty doctor'); out.addDoc = () => { f.doctors.push(''); t.h.forceUpdate(); }; out.addDuty = () => { f.onDuty.push(''); t.h.forceUpdate(); };
        out.incRows = f.inc.map((i, ix2) => ({ name: { v: i.name, on: e2 => { i.name = e2.target.value; t.h.forceUpdate(); } }, amt: { v: i.amount, on: e2 => { i.amount = e2.target.value.replace(/[^\d.]/g, ''); t.h.forceUpdate(); } }, rm: () => { if (f.inc.length > 1) { f.inc.splice(ix2, 1); t.h.forceUpdate(); } } }));
        out.addInc = () => { f.inc.push({ name: '', amount: '' }); t.h.forceUpdate(); };
        out.payRows = f.pays.map((r2, i) => ({ date: { v: r2.date, on: e2 => { r2.date = e2.target.value; t.h.forceUpdate(); } }, type: { v: r2.type, on: e2 => { r2.type = e2.target.value; t.h.forceUpdate(); } }, mode: { v: r2.mode, on: e2 => { r2.mode = e2.target.value; t.h.forceUpdate(); } }, amt: { v: r2.amount, on: e2 => { r2.amount = e2.target.value.replace(/[^\d.]/g, ''); t.h.forceUpdate(); } }, rm: () => { f.pays.splice(i, 1); t.h.forceUpdate(); } }));
        out.payNone = f.pays.length === 0; out.addPay = () => { f.pays.push({ date: todayISO(), type: 'Advance', mode: 'Cash', amount: '' }); t.h.forceUpdate(); };
        const AT = t.admTotals(); out.aPk = inr(AT.pk); out.aNet = inr(AT.net); out.aRec = inr(AT.rec); out.aBal = inr(AT.bal); out.aBalC = AT.bal > 0 ? 'var(--color-warning-soft-foreground)' : 'var(--color-success-soft-foreground)';
        out.admNext = () => t.admNext(); out.admBack = () => { a.step = Math.max(1, a.step - 1); a.err = ''; t.h.forceUpdate(); }; out.admSubmit = () => t.admSubmit(); out.admNotFirst = a.step > 1;
        out.aGender = t.pills(['MALE', 'FEMALE', 'OTHER'], f.gender, g => { f.gender = g; t.h.forceUpdate(); }, g => g.charAt(0) + g.slice(1).toLowerCase());
      }
      const addrS = path => { const val = String(t.getIn(path) || '').trim().toLowerCase(), list = (d.addresses || []).filter(x => x.toLowerCase().includes(val) && x.toLowerCase() !== val); return { on: s.aOpen === path && list.length > 0, list: list.slice(0, 6).map(x => ({ n: x, pick: () => { t.setIn(path, x); t.s.aOpen = ''; t.h.forceUpdate(); } })) }; };
      out.aS = { reg: addrS('reg.f.address'), edit: addrS('edit.f.address'), adm: addrS('adm.f.address') };
      out.addrFocus = { reg: () => t.set({ aOpen: 'reg.f.address' }), edit: () => t.set({ aOpen: 'edit.f.address' }), adm: () => t.set({ aOpen: 'adm.f.address' }) };
      out.addrBlur = () => setTimeout(() => t.set({ aOpen: '' }), 150);
      out.fe = Object.assign({ name: '', gender: '', phone: '', date: '' }, (s.reg && s.reg.fe) || {});
      out.afe = Object.assign({ name: '', age: '', gender: '', phone: '', op: '', doctors: '' }, (s.adm && s.adm.fe) || {});
      out.pageDown = e => { t.px = e.clientX; }; out.pageUp = e => { if (t.px != null && t.px < 56 && e.clientX - t.px > 110) { if (t.anyModal()) t.closeTop(); else if (s.detail) t.set({ detail: '' }); else if (s.view !== 'home') t.go('home'); } t.px = null; };
      return out;
    }
  }
  window.HMS = { Ctl, ICONS };
})();
