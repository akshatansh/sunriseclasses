import { loadResultsPortalData } from './src/lib/resultsPortal.ts';
loadResultsPortalData().then(data => console.log(JSON.stringify(data.students.filter(s => s.fatherName || s.parentPhone), null, 2)));
