import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Upload, Users, FileBarChart2, LockKeyhole, LogOut, ShieldCheck, ShieldAlert, Download, GraduationCap, ArrowUpCircle, AlertTriangle, Megaphone, IndianRupee, Bell, Settings, Phone, BookOpen, Calendar, Pencil, Eye, User, Youtube, MonitorPlay } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawPDFFooter } from '../lib/pdfUtils';
import Seo from '../components/Seo';
import {
  loadResultsPortalData,
  addStudentToDB,
  addTestResultsToDB,
  deleteStudentFromDB,
  deleteTestResultFromDB,
  updateTestResultInDB,
  updateStudentInDB,
  graduateClass10,
  promoteClass9To10,
  promoteClass8To9,
  generateRandomPin,
  type ResultsPortalData,
  type TestResultRecord,
} from '../lib/resultsPortal';
import { supabase } from '../lib/supabase';
import { getNotificationText, updateNotificationText } from '../lib/siteSettings';
import { getNotices, addNotice, deleteNotice, type NoticeRecord } from '../lib/noticePortal';
import FeeManagement from '../components/FeeManagement';
import HomeworkManagement from '../components/HomeworkManagement';
import AttendanceManagement from '../components/AttendanceManagement';
import AdminStudentProfile from '../components/AdminStudentProfile';
import YouTubeFamilyAdmin from '../components/YouTubeFamilyAdmin';
import OnlineTestAdmin from '../components/OnlineTestAdmin';
import IssueReportAdmin from '../components/IssueReportAdmin';

const ADMIN_SESSION_KEY = 'sunrise-admin-authenticated';
const ADMIN_ROLE_KEY = 'sunrise-admin-role';
const ADMIN_CLASS_KEY = 'sunrise-admin-class';

/** Normalize className string to '8th' | '9th' | '10th' | 'other' */
function normalizeClass(className?: string | null): '8th' | '9th' | '10th' | 'other' {
  if (!className) return 'other';
  const c = String(className).toLowerCase().replace(/\s+/g, '');
  if (c.includes('8')) return '8th';
  if (c.includes('9')) return '9th';
  if (c.includes('10')) return '10th';
  return 'other';
}

const getEmptyStudentForm = () => ({
  name: '',
  className: '',
  image: '',
  fatherName: '',
  parentPhone: '',
  pin: generateRandomPin(),
});

const emptyTestDetails = {
  testName: '',
  subject: '',
  testDate: '',
  totalMarks: '',
};

export default function AdminResultsPage() {
  const [data, setData] = useState<ResultsPortalData>({ students: [], results: [] });
  const [studentForm, setStudentForm] = useState(getEmptyStudentForm());
  const [testDetails, setTestDetails] = useState(emptyTestDetails);
  const [studentScores, setStudentScores] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({ name: '', className: '', fatherName: '', parentPhone: '', pin: '' });
  const [editResultId, setEditResultId] = useState<string | null>(null);
  const [editMarksValue, setEditMarksValue] = useState<string>('');
  const [loginRole, setLoginRole] = useState<string | null>(null);
  const [loginClassAccess, setLoginClassAccess] = useState<string>('all');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // For super-admin: which class is active in the upload/students panel
  const [activeUploadClass, setActiveUploadClass] = useState<'8th' | '9th' | '10th'>('10th');

  const [adminList, setAdminList] = useState<any[]>([]);
  const [newAdminForm, setNewAdminForm] = useState({ username: '', password: '', role: 'admin', class_access: 'all' });
  const [notificationText, setNotificationText] = useState('');
  const [isSavingNotification, setIsSavingNotification] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [newNoticeForm, setNewNoticeForm] = useState<{ title: string, content: string, type: 'exam' | 'holiday' | 'general' }>({ title: '', content: '', type: 'general' });
  const [activeTab, setActiveTab] = useState<'marks' | 'students' | 'fees' | 'notices' | 'homework' | 'attendance' | 'settings' | 'youtube' | 'onlinetest' | 'reports'>('marks');

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') console.log('Admin accepted install prompt');
      setDeferredPrompt(null);
    }
  };



  const fetchAdmins = async () => {
    const { data } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
    if (data) setAdminList(data);
  };

  useEffect(() => {
    loadResultsPortalData().then(setData).catch(console.error);
    if (typeof window !== 'undefined') {
      const auth = window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
      setIsAuthenticated(auth);
      if (auth) {
        const role = window.sessionStorage.getItem(ADMIN_ROLE_KEY);
        const classAccess = window.sessionStorage.getItem(ADMIN_CLASS_KEY) || 'all';
        setLoginRole(role);
        setLoginClassAccess(classAccess);
        if (role === 'superadmin') {
          fetchAdmins();
          getNotificationText().then(setNotificationText).catch(console.error);
          getNotices().then(setNotices).catch(console.error);
        }
      }
    }
  }, []);

  const sortedStudents = useMemo(() => {
    const filtered = loginClassAccess === 'all'
      ? data.students
      : data.students.filter(s => normalizeClass(s.className) === loginClassAccess);
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.students, loginClassAccess]);

  // For super-admin panels: students filtered to activeUploadClass tab
  const studentsForUpload = useMemo(() => {
    if (loginClassAccess !== 'all') return sortedStudents; // already filtered
    return sortedStudents.filter(s => normalizeClass(s.className) === activeUploadClass);
  }, [sortedStudents, loginClassAccess, activeUploadClass]);

  const sortedResults = useMemo(() => {
    const studentIds = new Set(sortedStudents.map(s => s.id));
    const filtered = loginClassAccess === 'all'
      ? data.results
      : data.results.filter(r => studentIds.has(r.studentId));
    return [...filtered].sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
  }, [data.results, sortedStudents, loginClassAccess]);

  // ── AUTO LOGOUT LOGIC (15 Minutes Inactivity) ──
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Auto logout after 15 minutes (900000 ms) of inactivity
      timeoutId = setTimeout(() => {
        handleLogout();
        alert('Session expired due to inactivity. Please login again.');
      }, 900000);
    };

    // Attach activity listeners
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Initial start
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

  const showMessage = (successMessage: string) => {
    setMessage(successMessage);
    setTimeout(() => setMessage(''), 3000);
  };

  const reloadData = async () => {
    const updatedData = await loadResultsPortalData();
    setData(updatedData);
  };

  const handleDownloadStudentList = async () => {
    if (studentsForUpload.length === 0) return;
    const className = activeUploadClass === '8th' ? 'Class 8' : activeUploadClass === '9th' ? 'Class 9' : 'Class 10';
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const description = `Student List — ${className}     Generated: ${dateStr}     Total Students: ${studentsForUpload.length}`;
    const startY = await drawPDFHeader(doc, `Student Register — ${className}`, description);

    autoTable(doc, {
      startY,
      head: [['#', 'Student Name', 'Class', "Father's Name", 'Mobile No.', 'Added On']],
      body: studentsForUpload.map((s, i) => [
        i + 1,
        s.name,
        s.className,
        s.fatherName || '—',
        s.parentPhone || '—',
        s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'
      ]),
      headStyles: { fillColor: [15, 42, 92], textColor: [245, 166, 35], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 26, halign: 'center' },
      },
      margin: { left: 12, right: 12 },
      styles: { cellPadding: 3.5, lineColor: [220, 230, 245], lineWidth: 0.2 },
    });

    drawPDFFooter(doc);
    doc.save(`Sunrise_Students_${className.replace(' ', '')}_${new Date().toISOString().split('T')[0]}.pdf`);
    showMessage('Student list PDF downloaded!');
  };


  const formatName = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.className.trim() || isAddingStudent) return;

    setIsAddingStudent(true);
    try {
      await addStudentToDB({
        name: formatName(studentForm.name),
        className: studentForm.className.trim(),
        image: studentForm.image.trim() || '/sunrise-logo.png',
        fatherName: studentForm.fatherName.trim() ? formatName(studentForm.fatherName) : null,
        parentPhone: studentForm.parentPhone.trim() || null,
        pin: studentForm.pin.trim() || generateRandomPin(),
      });

      await reloadData();
      showMessage('Student added successfully.');
      setStudentForm(getEmptyStudentForm());
    } catch (err) {
      console.error(err);
      alert("Failed to add student to database.");
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleBatchAddResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testDetails.testName.trim() || !testDetails.subject.trim() || !testDetails.testDate) {
      return;
    }

    const totalMarks = Number(testDetails.totalMarks);
    if (!Number.isFinite(totalMarks) || totalMarks <= 0) return;

    const newResults: any[] = [];

    Object.entries(studentScores).forEach(([studentId, scoreStr]) => {
      if (scoreStr.trim() !== '') {
        const marksObtained = Number(scoreStr);
        if (Number.isFinite(marksObtained) && marksObtained >= 0 && marksObtained <= totalMarks) {
          newResults.push({
            studentId,
            testName: testDetails.testName.trim(),
            subject: testDetails.subject.trim(),
            testDate: testDetails.testDate,
            marksObtained,
            totalMarks,
          });
        }
      }
    });

    if (newResults.length === 0) {
      alert("Please enter valid marks for at least one student. Marks must be between 0 and " + totalMarks);
      return;
    }

    try {
      await addTestResultsToDB(newResults);
      await reloadData();
      showMessage(`${newResults.length} test results uploaded successfully.`);
      setTestDetails(emptyTestDetails);
      setStudentScores({});
    } catch (err) {
      console.error(err);
      alert("Failed to upload test results.");
    }
  };

  const handleDownloadPDF = async () => {
    const totalMarks = Number(testDetails.totalMarks);
    if (!testDetails.testName.trim() || !testDetails.subject.trim() || !testDetails.testDate || !totalMarks) {
      alert('Please fill in test details (Name, Subject, Date, Total Marks) before downloading PDF.');
      return;
    }

    const rows: any[] = [];
    const absentRowIndices: number[] = [];
    let serial = 1;
    studentsForUpload.forEach((student) => {
      const scoreStr = studentScores[student.id];
      if (scoreStr && scoreStr.trim() !== '') {
        const marks = Number(scoreStr);
        const pct = totalMarks > 0 ? ((marks / totalMarks) * 100).toFixed(1) : '0';
        rows.push([serial++, student.name, student.className, `${marks} / ${totalMarks}`, `${pct}%`]);
      } else {
        absentRowIndices.push(rows.length);
        rows.push([serial++, student.name, student.className, 'ABSENT', '-']);
      }
    });

    if (rows.length === 0) {
      alert('Koi student nahi mila. Pehle students add kijiye.');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const dateStr = testDetails.testDate ? new Date(testDetails.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

    // === HEADER BACKGROUND ===
    doc.setFillColor(15, 42, 92);
    doc.rect(0, 0, pageW, 50, 'F');

    // Accent bottom strip on header
    doc.setFillColor(245, 166, 35);
    doc.rect(0, 47, pageW, 3, 'F');

    // === LOGO ===
    try {
      const logoRes = await fetch('/sunrise-logo.png');
      const blob = await logoRes.blob();
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          doc.addImage(base64, 'PNG', 8, 7, 30, 30);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      // logo failed to load; skip silently
    }

    // === ACADEMY NAME ===
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SUNRISE CLASSES & ACADEMY', pageW / 2, 18, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Champanagar, Purnia, Bihar - 854201  |  Mob: 9973152070', pageW / 2, 27, { align: 'center' });

    doc.setTextColor(200, 215, 255);
    doc.setFontSize(8.5);
    doc.text('Test Result Report', pageW / 2, 36, { align: 'center' });

    // === TEST INFO BOX ===
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(213, 229, 255);
    doc.roundedRect(10, 56, pageW - 20, 22, 3, 3, 'FD');

    doc.setTextColor(15, 42, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(testDetails.testName, 16, 65);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`Subject: ${testDetails.subject}`, 16, 73);
    doc.text(`Date: ${dateStr}`, 90, 73);
    doc.text(`Total Marks: ${totalMarks}`, 155, 73);

    // === TABLE ===
    autoTable(doc, {
      startY: 85,
      head: [['S.No', 'Student Name', 'Class', 'Marks', 'Percentage']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 42, 92],
        textColor: [245, 166, 35],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: { fontSize: 10, textColor: [30, 30, 30], halign: 'left' },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 10, right: 10 },
      didParseCell: (data) => {
        if (data.section === 'body' && absentRowIndices.includes(data.row.index)) {
          data.cell.styles.textColor = [200, 30, 30];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 242, 242];
        }
      },
    });

    // === FOOTER ===
    drawPDFFooter(doc);

    const safeName = testDetails.testName.replace(/\s+/g, '_');
    doc.save(`${safeName}_${testDetails.testDate}.pdf`);
  };

  const handleDownloadPastTestPDF = async (resultRecord: TestResultRecord) => {
    // Find all results that match this test's unique identifiers
    const testResults = data.results.filter(
      r => r.testName === resultRecord.testName &&
        r.testDate === resultRecord.testDate &&
        r.subject === resultRecord.subject
    );

    if (testResults.length === 0) return;

    const totalMarks = testResults[0].totalMarks;
    const dateStr = new Date(resultRecord.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Re-use the new pdfUtils header
    await drawPDFHeader(doc, 'Test Result Report');

    // === TEST INFO BOX ===
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(213, 229, 255);
    doc.roundedRect(10, 56, pageW - 20, 22, 3, 3, 'FD');

    doc.setTextColor(15, 42, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(resultRecord.testName, 16, 65);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`Subject: ${resultRecord.subject}`, 16, 73);
    doc.text(`Date: ${dateStr}`, 90, 73);
    doc.text(`Total Marks: ${totalMarks}`, 155, 73);

    // Prepare rows
    let serial = 1;
    const rows = testResults.map(r => {
      const student = data.students.find(s => s.id === r.studentId);
      const studentName = student ? student.name : 'Unknown';
      const className = student ? student.className : 'Unknown';
      const pct = totalMarks > 0 ? ((r.marksObtained / totalMarks) * 100).toFixed(1) : '0';
      return [serial++, studentName, className, `${r.marksObtained} / ${totalMarks}`, `${pct}%`];
    });

    // === TABLE ===
    autoTable(doc, {
      startY: 85,
      head: [['S.No', 'Student Name', 'Class', 'Marks', 'Percentage']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 42, 92],
        textColor: [245, 166, 35],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: { fontSize: 10, textColor: [30, 30, 30], halign: 'left' },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 10, right: 10 },
    });

    // === FOOTER ===
    drawPDFFooter(doc);

    const safeName = resultRecord.testName.replace(/\s+/g, '_');
    doc.save(`${safeName}_${resultRecord.testDate}.pdf`);
    showMessage('Test result PDF downloaded!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        setStudentForm((prev) => ({ ...prev, image: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudentFromDB(studentId);
      await reloadData();
      showMessage('Student and related results removed.');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete student.");
    }
  };

  const handleEditStudentSave = async () => {
    if (!editStudentId || !editStudentForm.name.trim()) return;
    const formatName = (n: string) => n.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    try {
      await updateStudentInDB(editStudentId, {
        name: formatName(editStudentForm.name),
        className: editStudentForm.className.trim(),
        fatherName: editStudentForm.fatherName.trim() ? formatName(editStudentForm.fatherName) : null,
        parentPhone: editStudentForm.parentPhone.trim() || null,
        pin: editStudentForm.pin.trim() || generateRandomPin(),
      });
      await reloadData();
      showMessage('Student updated successfully.');
      setEditStudentId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update student.');
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    try {
      await deleteTestResultFromDB(resultId);
      await reloadData();
      showMessage('Result deleted successfully.');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete result.");
    }
  };

  const handleUpdateResult = async (resultId: string) => {
    if (!editMarksValue.trim()) return;
    const newMarks = Number(editMarksValue);
    if (!Number.isFinite(newMarks) || newMarks < 0) return;

    try {
      await updateTestResultInDB(resultId, newMarks);
      await reloadData();
      showMessage('Result updated successfully.');
      setEditResultId(null);
      setEditMarksValue('');
    } catch (err) {
      console.error(err);
      alert("Failed to update result.");
    }
  };

  const getStudentName = (studentId: string) =>
    data.students.find((student) => student.id === studentId)?.name || 'Unknown Student';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter username and password.');
      return;
    }

    try {
      setIsLoggingIn(true);
      // Add a slight artificial delay for perceived security & anti-brute-force
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: adminData, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .single();

      if (error || !adminData) {
        setLoginError('Incorrect username or password.');
        setIsLoggingIn(false);
        return;
      }

      const classAccess = adminData.class_access || 'all';
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        window.sessionStorage.setItem(ADMIN_ROLE_KEY, adminData.role);
        window.sessionStorage.setItem(ADMIN_CLASS_KEY, classAccess);
      }
      setIsAuthenticated(true);
      setLoginRole(adminData.role);
      setLoginClassAccess(classAccess);
      setUsername('');
      setPassword('');
      if (adminData.role === 'superadmin') fetchAdmins();
      setIsLoggingIn(false);
    } catch (err) {
      console.error(err);
      setLoginError('Login failed. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      window.sessionStorage.removeItem(ADMIN_ROLE_KEY);
      window.sessionStorage.removeItem(ADMIN_CLASS_KEY);
    }
    setIsAuthenticated(false);
    setLoginRole(null);
    setLoginClassAccess('all');
    setMessage('');
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.username.trim() || !newAdminForm.password.trim()) return;

    try {
      const { error } = await supabase.from('admins').insert({
        username: newAdminForm.username.trim(),
        password: newAdminForm.password.trim(),
        role: newAdminForm.role,
        class_access: newAdminForm.class_access,
      });
      if (error) throw error;

      showMessage('New admin created successfully.');
      setNewAdminForm({ username: '', password: '', role: 'admin', class_access: 'all' });
      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert('Failed to create admin. Username might already exist.');
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin account?')) return;
    try {
      const { error } = await supabase.from('admins').delete().eq('id', id);
      if (error) throw error;
      showMessage('Admin account deleted.');
      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert('Failed to delete admin.');
    }
  };

  // ── Batch Management ──────────────────────────────────────────────────
  const [batchLoading, setBatchLoading] = useState<string | null>(null);
  const [batchConfirm, setBatchConfirm] = useState<'graduate' | 'promote' | null>(null);

  const handleDownloadCSV = (targetClass: string) => {
    const classStudents = data.students.filter(s => s.className.toLowerCase().includes(targetClass));
    if (classStudents.length === 0) {
      alert(`Koi student nahi mila Class ${targetClass} mein.`);
      return;
    }

    const studentIds = classStudents.map(s => s.id);
    const classResults = data.results.filter(r => studentIds.includes(r.studentId));

    if (classResults.length === 0) {
      alert(`Class ${targetClass} ka koi test record nahi hai.`);
      return;
    }

    const uniqueTestsMap = new Map();
    classResults.forEach(r => {
      const key = `${r.testName}_${r.testDate}`;
      if (!uniqueTestsMap.has(key)) {
        uniqueTestsMap.set(key, { testName: r.testName, testDate: r.testDate, subject: r.subject, totalMarks: r.totalMarks });
      }
    });

    const uniqueTests = Array.from(uniqueTestsMap.values()).sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());

    const testHeaders = uniqueTests.map(t => `${t.testName} (${new Date(t.testDate).toLocaleDateString('en-IN')}) [${t.subject}]`);
    const headers = ['S.No', 'Student Name', 'Class', 'Total %', ...testHeaders];

    let serial = 1;
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;

    const rows = classStudents.map(student => {
      const studentResults = classResults.filter(r => r.studentId === student.id);
      const totalObtained = studentResults.reduce((sum, r) => sum + r.marksObtained, 0);
      const totalPossible = studentResults.reduce((sum, r) => sum + r.totalMarks, 0);
      const pct = totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(1) : '0';

      const row = [
        serial++,
        escapeCSV(student.name),
        escapeCSV(student.className),
        `${pct}%`
      ];

      uniqueTests.forEach(test => {
        const result = studentResults.find(r => r.testName === test.testName && r.testDate === test.testDate);
        if (result) {
          row.push(`${result.marksObtained} / ${result.totalMarks}`);
        } else {
          row.push('Absent');
        }
      });

      return row.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sunrise_Classes_${targetClass}_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGraduateClass10 = async () => {
    setBatchLoading('graduate');
    try {
      const count = await graduateClass10();
      await reloadData();
      setBatchConfirm(null);
      showMessage(`✅ ${count} Class 10 students graduated & removed. Fresh slate ready!`);
    } catch (err) {
      console.error(err);
      alert('Failed to graduate Class 10. Try again.');
    } finally {
      setBatchLoading(null);
    }
  };

  const handlePromoteClass9 = async () => {
    setBatchLoading('promote');
    try {
      const count = await promoteClass9To10();
      await reloadData();
      setBatchConfirm(null);
      showMessage(`✅ ${count} students promoted from Class 9 → Class 10. Old results cleared.`);
    } catch (err) {
      console.error(err);
      alert('Failed to promote Class 9. Try again.');
    } finally {
      setBatchLoading(null);
    }
  };

  const handlePromoteClass8 = async () => {
    setBatchLoading('promote8to9');
    try {
      const count = await promoteClass8To9();
      await reloadData();
      setBatchConfirm(null);
      showMessage(`✅ ${count} students promoted from Class 8 → Class 9. Old results cleared.`);
    } catch (err) {
      console.error(err);
      alert('Failed to promote Class 8. Try again.');
    } finally {
      setBatchLoading(null);
    }
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotification(true);
    const success = await updateNotificationText(notificationText);
    setIsSavingNotification(false);
    if (success) {
      showMessage('✅ Notification text updated successfully!');
    } else {
      alert('Failed to update notification text. Please try again.');
    }
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeForm.title.trim() || !newNoticeForm.content.trim()) return;

    const success = await addNotice({
      ...newNoticeForm,
      date: new Date().toISOString().split('T')[0]
    });

    if (success) {
      showMessage('✅ Notice added successfully!');
      setNewNoticeForm({ title: '', content: '', type: 'general' });
      getNotices().then(setNotices);
    } else {
      alert('Failed to add notice.');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    const success = await deleteNotice(id);
    if (success) {
      showMessage('🗑️ Notice deleted.');
      setNotices(notices.filter(n => n.id !== id));
    }
  };

  return (
    <div>
      <Seo
        title="Admin Results Panel"
        description="Admin panel for uploading Sunrise Classes students and daily test results."
        keywords="admin results panel Sunrise Classes, upload student marks, daily test admin Champanagar Purnia"
        url="/admin/sunriseclasses"
      />

      {!isAuthenticated ? (
        <section className="min-h-screen flex items-center bg-[linear-gradient(180deg,_#0f2a5c_0%,_#f8fbff_40%,_#ffffff_100%)] py-10">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-white bg-white/90 p-6 sm:p-8 shadow-[0_24px_80px_rgba(15,42,92,0.08)] text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0f2a5c] text-white shadow-lg">
                <LockKeyhole size={28} />
              </div>
              <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold text-[#0f2a5c]">Admin Login</h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
                Daily test results upload karne ke liye admin password enter kijiye. Public users is panel ko access nahi kar sakte.
              </p>

              <form onSubmit={handleLogin} className="mt-8 max-w-md mx-auto space-y-4 text-left">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                    placeholder="Enter password"
                    required
                  />
                </div>

                {loginError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f2a5c] px-6 py-3 text-sm font-bold text-white hover:bg-[#173873] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                  <ShieldCheck size={16} className={isLoggingIn ? "animate-pulse" : ""} />
                  {isLoggingIn ? 'Authenticating...' : 'Login to Admin Panel'}
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
          {/* Spacer for mobile bottom nav */}
          <style>{`@media (max-width: 767px) { .admin-content{padding-bottom:5rem} }`}</style>

          {/* DESKTOP SIDEBAR */}
          <aside className="hidden md:flex flex-col w-64 bg-[#0f2a5c] text-white fixed top-0 bottom-0 left-0 z-50 shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5a623]">
                  <ShieldCheck size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-base leading-none">Admin Panel</p>
                  <p className="text-xs text-blue-200 mt-1 leading-none">
                    {loginRole === 'superadmin' ? '⭐ Super Admin' : `📘 Class ${loginClassAccess}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
              <button onClick={() => setActiveTab('marks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'marks' ? 'bg-white/10 text-[#f5a623]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                <Upload size={20} />
                <span>Marks</span>
              </button>
              {loginRole === 'superadmin' && (<>
                <button onClick={() => setActiveTab('students')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'students' ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <Users size={20} />
                  <span>Students</span>
                </button>
                <button onClick={() => setActiveTab('fees')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'fees' ? 'bg-white/10 text-green-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <IndianRupee size={20} />
                  <span>Fees</span>
                </button>
                <button onClick={() => setActiveTab('homework')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'homework' ? 'bg-white/10 text-cyan-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <BookOpen size={20} />
                  <span>Homework</span>
                </button>
                <button onClick={() => setActiveTab('attendance')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'attendance' ? 'bg-white/10 text-teal-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <Calendar size={20} />
                  <span>Attendance</span>
                </button>
                <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:bg-white/5'}`}>
                  <ShieldAlert className="h-5 w-5" /> Student Reports
                </button>
                <button onClick={() => setActiveTab('notices')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'notices' ? 'bg-white/10 text-blue-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <Bell size={20} />
                  <span>Notices</span>
                </button>
                <button onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'settings' ? 'bg-white/10 text-orange-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <Settings size={20} />
                  <span>Settings</span>
                </button>
                <button onClick={() => setActiveTab('youtube')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'youtube' ? 'bg-white/10 text-red-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <Youtube size={20} />
                  <span>YT Family</span>
                </button>
                <button onClick={() => setActiveTab('onlinetest')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'onlinetest' ? 'bg-white/10 text-pink-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <MonitorPlay size={20} />
                  <span>Online Tests</span>
                </button>
              </>)}
            </div>

            <div className="p-4 border-t border-white/10 flex flex-col gap-3">
              {deferredPrompt && (
                <button type="button" onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-lg">
                  <Download size={16} /> Install App
                </button>
              )}
              <button type="button" onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-bold transition-all">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT WRAPPER */}
          <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
            {/* MOBILE HEADER (Hidden on Desktop) */}
            <section className="md:hidden bg-[#0f2a5c] text-white shadow-xl">
              <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5a623]">
                    <ShieldCheck size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm leading-none">Admin Panel</p>
                    <p className="text-[10px] text-blue-200 mt-0.5 leading-none">
                      {loginRole === 'superadmin' ? '⭐ Super Admin' : `📘 Class ${loginClassAccess}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {deferredPrompt && (
                    <button type="button" onClick={handleInstallClick}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md">
                      <Download size={13} /> Install
                    </button>
                  )}
                  <button type="button" onClick={handleLogout}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold">
                    <LogOut size={13} /> Logout
                  </button>
                </div>
              </div>
            </section>

            <div className="max-w-5xl w-full mx-auto px-3 sm:px-6 pt-4 md:pt-8 admin-content">

              {message && (
                <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  ✅ {message}
                </div>
              )}

              {/* ── MARKS TAB ── all admins */}
              {activeTab === 'marks' && (
                <div className="space-y-4">
                  {loginRole === 'superadmin' && (
                    <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2a5c] text-white">
                          <Users size={22} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-[#0f2a5c]">Add Student</h2>
                          <p className="text-sm text-slate-500">Ek baar student details add kar dijiye</p>
                        </div>
                      </div>

                      <form onSubmit={handleAddStudent} className="space-y-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Student Name</label>
                          <input
                            value={studentForm.name}
                            onChange={(e) => setStudentForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                            placeholder="Enter full name"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Class</label>
                          <select
                            value={studentForm.className}
                            onChange={(e) => setStudentForm((prev) => ({ ...prev, className: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                            required
                          >
                            <option value="">-- Select Class --</option>
                            {(loginClassAccess === 'all' || loginClassAccess === '8th') && <option value="Class 8">Class 8</option>}
                            {(loginClassAccess === 'all' || loginClassAccess === '9th') && <option value="Class 9">Class 9</option>}
                            {(loginClassAccess === 'all' || loginClassAccess === '10th') && <option value="Class 10">Class 10</option>}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Father's Name (Optional)</label>
                            <input
                              value={studentForm.fatherName}
                              onChange={(e) => setStudentForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                              placeholder="Father's Name"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Mobile No. (Optional)</label>
                            <input
                              value={studentForm.parentPhone}
                              onChange={(e) => setStudentForm((prev) => ({ ...prev, parentPhone: e.target.value.replace(/\D/g, '') }))}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                              placeholder="10-digit number"
                              maxLength={10}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Secret PIN (For Online Test)</label>
                            <input
                              value={studentForm.pin}
                              onChange={(e) => setStudentForm((prev) => ({ ...prev, pin: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                              placeholder="e.g. 1234"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Student Photo (Optional)</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#f5a623] file:text-[#0f2a5c] hover:file:bg-[#e09010] outline-none"
                          />
                          {studentForm.image && studentForm.image !== '/sunrise-logo.png' && (
                            <div className="mt-2 flex items-center gap-2">
                              <img src={studentForm.image} alt="Preview" className="h-10 w-10 rounded-full object-cover object-top border border-slate-200" />
                              <span className="text-xs text-green-600 font-semibold">Photo attached!</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingStudent}
                          className="inline-flex items-center gap-2 rounded-full bg-[#0f2a5c] px-6 py-3 text-sm font-bold text-white hover:bg-[#173873] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} />
                          {isAddingStudent ? 'Saving...' : 'Save Student'}
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="rounded-[2rem] border border-[#ffe2ae] bg-[linear-gradient(135deg,_#fff8ea,_#ffffff)] p-6 sm:p-8 shadow-sm">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5a623] text-[#0f2a5c]">
                          <Upload size={22} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-[#0f2a5c]">Upload Test Marks</h2>
                          <p className="text-sm text-slate-500">Har daily test ka marks yahin se add hoga</p>
                        </div>
                      </div>
                      {loginClassAccess === 'all' && (
                        <div className="flex items-center gap-1 rounded-full border border-[#f5a623]/40 bg-[#fff8e6] p-1">
                          <button
                            type="button"
                            onClick={() => { setActiveUploadClass('8th'); setStudentScores({}); setTestDetails(emptyTestDetails); }}
                            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${activeUploadClass === '8th'
                              ? 'bg-[#0f2a5c] text-white shadow'
                              : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                            Class 8
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActiveUploadClass('9th'); setStudentScores({}); setTestDetails(emptyTestDetails); }}
                            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${activeUploadClass === '9th'
                              ? 'bg-[#0f2a5c] text-white shadow'
                              : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                            Class 9
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActiveUploadClass('10th'); setStudentScores({}); setTestDetails(emptyTestDetails); }}
                            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${activeUploadClass === '10th'
                              ? 'bg-[#0f2a5c] text-white shadow'
                              : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                            Class 10
                          </button>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleBatchAddResults} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Test Name</label>
                          <input
                            value={testDetails.testName}
                            onChange={(e) => setTestDetails((prev) => ({ ...prev, testName: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                            placeholder="Example: Daily Test 01"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Subject</label>
                          <input
                            value={testDetails.subject}
                            onChange={(e) => setTestDetails((prev) => ({ ...prev, subject: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                            placeholder="Math / Science / English"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Test Date</label>
                          <input
                            type="date"
                            value={testDetails.testDate}
                            onChange={(e) => setTestDetails((prev) => ({ ...prev, testDate: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Total Marks</label>
                          <input
                            type="number"
                            min="1"
                            value={testDetails.totalMarks}
                            onChange={(e) => setTestDetails((prev) => ({ ...prev, totalMarks: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                            placeholder="50"
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Enter Marks for Students
                          {loginClassAccess === 'all' && (
                            <span className="ml-2 rounded-full bg-[#0f2a5c] px-2.5 py-0.5 text-xs font-semibold text-white">
                              Class {activeUploadClass}
                            </span>
                          )}
                        </label>
                        <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-inner">
                          {studentsForUpload.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-slate-50 shadow-sm border-b border-slate-200 z-10">
                                <tr className="text-left text-slate-500">
                                  <th className="py-3 px-4 font-semibold">Student Name</th>
                                  <th className="py-3 px-4 font-semibold w-40">Marks Obtained</th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentsForUpload.map((student) => (
                                  <tr key={student.id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/80 transition-colors">
                                    <td className="py-2 px-4 text-slate-700 font-medium">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-slate-500">
                                          {student.image && student.image !== '/sunrise-logo.png' ? (
                                            <img src={student.image} alt={student.name} className="h-full w-full object-cover object-top" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                          ) : student.name.charAt(0)}
                                        </div>
                                        <span>{student.name} <span className="text-xs text-slate-400 font-normal ml-1">({student.className})</span></span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        min="0"
                                        max={testDetails.totalMarks || undefined}
                                        value={studentScores[student.id] || ''}
                                        onChange={(e) => setStudentScores(prev => ({ ...prev, [student.id]: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 bg-white"
                                        placeholder="Marks"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-6 text-sm text-slate-500 text-center">
                              {loginClassAccess === 'all'
                                ? `Pehle Class ${activeUploadClass} ke students add kijiye.`
                                : 'Please add students first to enter their marks.'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5a623] px-8 py-3 text-sm font-bold text-[#0f2a5c] hover:bg-[#e09010] shadow-sm transition-all active:scale-[0.98]"
                        >
                          <Save size={18} />
                          Upload Results for All
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadPDF}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f2a5c] px-8 py-3 text-sm font-bold text-white hover:bg-[#173873] shadow-sm transition-all active:scale-[0.98]"
                        >
                          <Download size={18} />
                          Download PDF
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )} {/* end marks tab */}

              {/* ── STUDENTS TAB ── super admin only */}
              {activeTab === 'students' && loginRole === 'superadmin' && (
                <div className="space-y-4">
                  <div className="mt-4 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 sm:p-8 shadow-sm overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-[#0f2a5c]">Students List</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          {loginClassAccess === 'all' && (
                            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1">
                              <button
                                type="button"
                                onClick={() => setActiveUploadClass('8th')}
                                className={`rounded-full px-4 py-1 text-sm font-bold transition-all ${activeUploadClass === '8th' ? 'bg-[#0f2a5c] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Class 8
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveUploadClass('9th')}
                                className={`rounded-full px-4 py-1 text-sm font-bold transition-all ${activeUploadClass === '9th' ? 'bg-[#0f2a5c] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Class 9
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveUploadClass('10th')}
                                className={`rounded-full px-4 py-1 text-sm font-bold transition-all ${activeUploadClass === '10th' ? 'bg-[#0f2a5c] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Class 10
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleDownloadStudentList}
                            disabled={studentsForUpload.length === 0}
                            className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"
                          >
                            <Download size={14} /> Download List
                          </button>
                        </div>
                      </div>
                      <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {studentsForUpload.length > 0 ? (
                          studentsForUpload.map((student) => (
                            <div key={student.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={student.image || '/sunrise-logo.png'}
                                  alt={student.name}
                                  className="h-12 w-12 rounded-xl object-cover object-top border border-slate-200 bg-white"
                                  onError={(e) => {
                                    e.currentTarget.src = '/sunrise-logo.png';
                                  }}
                                />
                                <div>
                                  <p className="font-semibold text-[#0f2a5c]">{student.name}</p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] sm:text-[11px]">
                                    <span className="font-semibold px-2 py-0.5 bg-[#0f2a5c]/5 text-[#0f2a5c] rounded-md">
                                      {student.className}
                                    </span>
                                    {student.fatherName && (
                                      <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md" title="Father's Name">
                                        <User size={10} className="text-slate-400" />
                                        <span className="font-medium truncate max-w-[100px]">{student.fatherName}</span>
                                      </span>
                                    )}
                                    {student.parentPhone && (
                                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md" title="Phone Number">
                                        <Phone size={10} className="text-blue-500" />
                                        <span className="font-medium tracking-wide">{student.parentPhone}</span>
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md" title="Secret PIN for Online Test">
                                      <LockKeyhole size={10} className="text-pink-500" />
                                      <span className="font-bold tracking-wide">PIN: {student.pin || '1234'}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {loginRole === 'superadmin' && (
                                deleteConfirmId === student.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide mr-1">Sure?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStudent(student.id)}
                                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow-sm"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 shadow-sm"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setProfileStudentId(student.id)}
                                      className="rounded-full bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 shadow-sm"
                                      title="View Profile"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditStudentId(student.id);
                                        setEditStudentForm({
                                          name: student.name || '',
                                          className: student.className || '',
                                          fatherName: student.fatherName || '',
                                          parentPhone: student.parentPhone || '',
                                          pin: student.pin || generateRandomPin()
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                    >
                                      <Pencil size={13} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(student.id)}
                                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                            Abhi koi student add nahi hua hai.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 sm:p-8 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2a5c] text-white">
                          <FileBarChart2 size={22} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-[#0f2a5c]">Uploaded Test Marks</h2>
                          <p className="text-sm text-slate-500">Latest uploaded results yahan se manage honge</p>
                        </div>
                      </div>

                      <div className="mt-6 max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-100 bg-white">
                        {sortedResults.length > 0 ? (
                          <table className="w-full min-w-[700px] text-sm relative">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
                              <tr className="text-left text-slate-500">
                                <th className="py-3 px-4 font-semibold">Student</th>
                                <th className="py-3 px-4 font-semibold">Test</th>
                                <th className="py-3 px-4 font-semibold">Subject</th>
                                <th className="py-3 px-4 font-semibold">Date</th>
                                <th className="py-3 px-4 font-semibold">Marks</th>
                                <th className="py-3 px-4 font-semibold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sortedResults.map((result) => (
                                <tr key={result.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-4 font-medium">{getStudentName(result.studentId)}</td>
                                  <td className="py-3 px-4">{result.testName}</td>
                                  <td className="py-3 px-4">{result.subject}</td>
                                  <td className="py-3 px-4">{new Date(result.testDate).toLocaleDateString('en-IN')}</td>
                                  <td className="py-3 px-4">
                                    {editResultId === result.id ? (
                                      <div className="flex items-center gap-1 w-24">
                                        <input
                                          type="number"
                                          value={editMarksValue}
                                          onChange={(e) => setEditMarksValue(e.target.value)}
                                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 text-center"
                                          autoFocus
                                        />
                                        <span className="text-slate-400">/{result.totalMarks}</span>
                                      </div>
                                    ) : (
                                      <span>{result.marksObtained} / {result.totalMarks}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {loginRole === 'superadmin' && (
                                      editResultId === result.id ? (
                                        <div className="flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateResult(result.id)}
                                            className="rounded bg-green-500 px-3 py-1 text-xs font-bold text-white hover:bg-green-600"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { setEditResultId(null); setEditMarksValue(''); }}
                                            className="rounded bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-300"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadPastTestPDF(result)}
                                            title="Download Test PDF"
                                            className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                                          >
                                            <Download size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { setEditResultId(result.id); setEditMarksValue(result.marksObtained.toString()); }}
                                            className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteResult(result.id)}
                                            className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                            Abhi tak koi test result upload nahi hua hai.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>)} {/* end students tab */}

              {/* ── FEES TAB ── super admin only */}
              {activeTab === 'fees' && loginRole === 'superadmin' && (
                <div><FeeManagement /></div>
              )}

              {/* ── HOMEWORK TAB ── super admin only */}
              {activeTab === 'homework' && loginRole === 'superadmin' && (
                <div><HomeworkManagement /></div>
              )}

              {/* ── ATTENDANCE TAB ── super admin only */}
              {activeTab === 'attendance' && loginRole === 'superadmin' && (
                <div><AttendanceManagement students={sortedStudents} /></div>
              )}

              {/* ── SETTINGS TAB ── super admin only */}
              {activeTab === 'settings' && loginRole === 'superadmin' && (
                <div className="space-y-4">
                  <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 shadow-sm">
                    <h2 className="text-2xl font-bold text-[#0f2a5c] mb-6">Manage Admins</h2>
                    <div className="grid gap-8 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New Admin</h3>
                        <form onSubmit={handleAddAdmin} className="space-y-4">
                          <input
                            type="text"
                            value={newAdminForm.username}
                            onChange={(e) => setNewAdminForm({ ...newAdminForm, username: e.target.value })}
                            placeholder="Username"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#f5a623]"
                            required
                          />
                          <input
                            type="text"
                            value={newAdminForm.password}
                            onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                            placeholder="Password"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#f5a623]"
                            required
                          />
                          <select
                            value={newAdminForm.role}
                            onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#f5a623]"
                          >
                            <option value="admin">Regular Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                          <select
                            value={newAdminForm.class_access}
                            onChange={(e) => setNewAdminForm({ ...newAdminForm, class_access: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#f5a623]"
                          >
                            <option value="all">All Classes (Default)</option>
                            <option value="8th">Class 8 Only</option>
                            <option value="9th">Class 9 Only</option>
                            <option value="10th">Class 10 Only</option>
                          </select>
                          <button type="submit" className="w-full rounded-xl bg-[#0f2a5c] py-2 text-sm font-semibold text-white hover:bg-[#173873]">
                            Add Admin
                          </button>
                        </form>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Existing Admins</h3>
                        <div className="space-y-3">
                          {adminList.map(admin => (
                            <div key={admin.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                              <div>
                                <p className="font-semibold text-slate-700">{admin.username}</p>
                                <p className="text-xs text-slate-500 uppercase">{admin.role}</p>
                                <p className="text-xs text-blue-500 mt-0.5">
                                  {admin.class_access === 'all' || !admin.class_access ? 'All Classes' : `Class ${admin.class_access} Only`}
                                </p>
                              </div>
                              {admin.username !== 'superadmin' && (
                                <button
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                  className="text-red-500 hover:bg-red-100 p-2 rounded-lg"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )} {/* end settings tab part 1 */}

              {/* ── NOTICES TAB ── super admin only */}
              {activeTab === 'notices' && loginRole === 'superadmin' && (
                <div className="mt-10 grid gap-8 lg:grid-cols-2">
                  <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white">
                        <Megaphone size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-[#0f2a5c]">Website Settings</h2>
                        <p className="text-sm text-slate-500">Global site features manage karein</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Notification Bar</h3>
                      <form onSubmit={handleSaveNotification} className="space-y-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Scrolling Text</label>
                          <input
                            type="text"
                            value={notificationText}
                            onChange={(e) => setNotificationText(e.target.value)}
                            placeholder="e.g. 10th Batch is starting On 3 May 2026. Book Your Seat Now!"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f5a623]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingNotification}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0f2a5c] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#173873] disabled:opacity-70"
                        >
                          <Save size={16} />
                          {isSavingNotification ? 'Saving...' : 'Save Notification'}
                        </button>
                        <p className="text-xs text-slate-500">Ye text website ke sabse upar scroll hota dikhega. Agar nahi dikhana hai to isko khaali (empty) karke save kar dein.</p>
                      </form>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-indigo-200 bg-white/90 p-6 sm:p-8 shadow-sm flex flex-col max-h-[600px]">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white">
                        <Megaphone size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-[#0f2a5c]">Notice Board</h2>
                        <p className="text-sm text-slate-500">Add or remove public notices</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddNotice} className="mb-6 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <input
                        type="text"
                        value={newNoticeForm.title}
                        onChange={(e) => setNewNoticeForm({ ...newNoticeForm, title: e.target.value })}
                        placeholder="Notice Title"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                        required
                      />
                      <textarea
                        value={newNoticeForm.content}
                        onChange={(e) => setNewNoticeForm({ ...newNoticeForm, content: e.target.value })}
                        placeholder="Notice Content..."
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 h-20 resize-none"
                        required
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={newNoticeForm.type}
                          onChange={(e) => setNewNoticeForm({ ...newNoticeForm, type: e.target.value as any })}
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                        >
                          <option value="general">General</option>
                          <option value="exam">Exam</option>
                          <option value="holiday">Holiday</option>
                        </select>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                        >
                          <Plus size={16} />
                          Add Notice
                        </button>
                      </div>
                    </form>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                      {notices.map((notice) => (
                        <div key={notice.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-slate-400">{notice.date}</span>
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${notice.type === 'exam' ? 'bg-red-50 text-red-600' :
                                notice.type === 'holiday' ? 'bg-green-50 text-green-600' :
                                  'bg-blue-50 text-blue-600'
                                }`}>
                                {notice.type}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-800">{notice.title}</h4>
                          </div>
                          <button
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── BATCH MANAGEMENT in settings ── */}
              {activeTab === 'settings' && loginRole === 'superadmin' && (
                <div className="mt-10 rounded-[2rem] border border-orange-200 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff)] p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
                        <AlertTriangle size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-orange-700">Year-End Batch Management</h2>
                        <p className="text-sm text-orange-600">Saal ke aakhir mein batch promote/graduate karne ke liye. Yeh action permanent hai.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadCSV('8')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm border border-orange-200 hover:bg-orange-50"
                      >
                        <Download size={14} />
                        Class 8 Backup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCSV('9')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm border border-orange-200 hover:bg-orange-50"
                      >
                        <Download size={14} />
                        Class 9 Backup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCSV('10')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm border border-orange-200 hover:bg-orange-50"
                      >
                        <Download size={14} />
                        Class 10 Backup
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">

                    {/* Card 1: Graduate Class 10 */}
                    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <GraduationCap size={28} className="text-red-500 shrink-0" />
                        <div>
                          <h3 className="font-bold text-slate-800">Graduate Class 10</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Batch pass out ho gaya? Unhe system se hata do.</p>
                        </div>
                      </div>
                      <ul className="mb-4 space-y-1 text-xs text-slate-600">
                        <li>• Class 10 ke <strong>saare students delete</strong> ho jayenge</li>
                        <li>• Unke <strong>saare test results</strong> bhi hat jayenge</li>
                        <li>• Yeh action <strong className="text-red-600">undo nahi ho sakta</strong></li>
                      </ul>
                      {batchConfirm === 'graduate' ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> Confirm karo — yeh permanent hai!
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleGraduateClass10}
                              disabled={batchLoading === 'graduate'}
                              className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {batchLoading === 'graduate' ? 'Processing...' : 'Haan, Delete Karo'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchConfirm(null)}
                              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBatchConfirm('graduate')}
                          className="w-full rounded-xl border-2 border-red-200 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                        >
                          🎓 Graduate & Remove Class 10
                        </button>
                      )}
                    </div>

                    {/* Card 2: Promote Class 9 → 10 */}
                    <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <ArrowUpCircle size={28} className="text-blue-500 shrink-0" />
                        <div>
                          <h3 className="font-bold text-slate-800">Promote Class 9 → Class 10</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Class 9 wale ab Class 10 mein aa jayenge.</p>
                        </div>
                      </div>
                      <ul className="mb-4 space-y-1 text-xs text-slate-600">
                        <li>• Class 9 ke <strong>saare students Class 10 ban jayenge</strong></li>
                        <li>• Unke <strong>purane results clear</strong> ho jayenge (naya saal, fresh start)</li>
                        <li>• Students ke naam aur photos <strong>safe rahenge</strong></li>
                      </ul>
                      {batchConfirm === 'promote' ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> Confirm karo — purane results hat jayenge!
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handlePromoteClass9}
                              disabled={batchLoading === 'promote'}
                              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {batchLoading === 'promote' ? 'Processing...' : 'Haan, Promote Karo'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchConfirm(null)}
                              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBatchConfirm('promote')}
                          className="w-full rounded-xl border-2 border-blue-200 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          ⬆️ Promote Class 9 → Class 10
                        </button>
                      )}
                    </div>

                    {/* Card 3: Promote Class 8 → 9 */}
                    <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <ArrowUpCircle size={28} className="text-indigo-500 shrink-0" />
                        <div>
                          <h3 className="font-bold text-slate-800">Promote Class 8 → Class 9</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Class 8 wale ab Class 9 mein aa jayenge.</p>
                        </div>
                      </div>
                      <ul className="mb-4 space-y-1 text-xs text-slate-600">
                        <li>• Class 8 ke <strong>saare students Class 9 ban jayenge</strong></li>
                        <li>• Unke <strong>purane results clear</strong> ho jayenge</li>
                        <li>• Students ke naam aur photos <strong>safe rahenge</strong></li>
                      </ul>
                      {batchConfirm === 'promote8to9' ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> Confirm karo — purane results hat jayenge!
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handlePromoteClass8}
                              disabled={batchLoading === 'promote8to9'}
                              className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              {batchLoading === 'promote8to9' ? 'Processing...' : 'Haan, Promote Karo'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchConfirm(null)}
                              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBatchConfirm('promote8to9')}
                          className="w-full rounded-xl border-2 border-indigo-200 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-all"
                        >
                          ⬆️ Promote Class 8 → Class 9
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {activeTab === 'youtube' && loginRole === 'superadmin' && (
                <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
                  <YouTubeFamilyAdmin />
                </div>
              )}

              {activeTab === 'onlinetest' && loginRole === 'superadmin' && (
                <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
                  <OnlineTestAdmin />
                </div>
              )}

              {activeTab === 'reports' && loginRole === 'superadmin' && (
                <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
                  <IssueReportAdmin />
                </div>
              )}

            </div> {/* end tab content */}

            {/* ── BOTTOM NAVIGATION BAR — fixed to screen bottom (Mobile Only) ── */}
            <nav className="md:hidden" style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              background: '#fff',
              borderTop: '2px solid #e2e8f0',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
              <div className="flex items-stretch overflow-x-auto max-w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`.md\\:hidden::-webkit-scrollbar { display: none; }`}</style>
                <button onClick={() => setActiveTab('marks')}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'marks' ? 'border-[#f5a623] text-[#f5a623]' : 'border-transparent text-slate-400'}`}>
                  <Upload size={20} strokeWidth={activeTab === 'marks' ? 2.5 : 1.8} />
                  <span className="text-[9px] font-bold uppercase tracking-wide">Marks</span>
                </button>
                {loginRole === 'superadmin' && (<>
                  <button onClick={() => setActiveTab('students')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'students' ? 'border-[#0f2a5c] text-[#0f2a5c]' : 'border-transparent text-slate-400'}`}>
                    <Users size={20} strokeWidth={activeTab === 'students' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Students</span>
                  </button>
                  <button onClick={() => setActiveTab('fees')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'fees' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-400'}`}>
                    <IndianRupee size={20} strokeWidth={activeTab === 'fees' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Fees</span>
                  </button>
                  <button onClick={() => setActiveTab('homework')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'homework' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-400'}`}>
                    <BookOpen size={20} strokeWidth={activeTab === 'homework' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Homework</span>
                  </button>
                  <button onClick={() => setActiveTab('attendance')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'attendance' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400'}`}>
                    <Calendar size={20} strokeWidth={activeTab === 'attendance' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Attendance</span>
                  </button>
                  <button onClick={() => setActiveTab('notices')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'notices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
                    <Bell size={20} strokeWidth={activeTab === 'notices' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Notices</span>
                  </button>
                  <button onClick={() => setActiveTab('settings')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'settings' ? 'border-slate-700 text-slate-700' : 'border-transparent text-slate-400'}`}>
                    <Settings size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Settings</span>
                  </button>
                  <button onClick={() => setActiveTab('youtube')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'youtube' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400'}`}>
                    <Youtube size={20} strokeWidth={activeTab === 'youtube' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">YT Family</span>
                  </button>
                  <button onClick={() => setActiveTab('onlinetest')}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] flex-shrink-0 py-3 transition-colors border-t-2 ${activeTab === 'onlinetest' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-400'}`}>
                    <MonitorPlay size={20} strokeWidth={activeTab === 'onlinetest' ? 2.5 : 1.8} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Tests</span>
                  </button>
                </>)}
              </div>
            </nav>

          </main>
        </div>
      )}

      {/* ── Edit Student Modal ── */}
      {editStudentId && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditStudentId(null)}>
          <div
            className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-[#0f2a5c] mb-4 flex items-center gap-2">
              <Pencil size={18} className="text-blue-500" /> Edit Student
            </h3>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">Student Name *</label>
                <input
                  type="text"
                  value={editStudentForm.name}
                  onChange={e => setEditStudentForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0f2a5c] font-semibold mt-1 text-sm"
                  placeholder="Enter student name"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">Class</label>
                <input
                  type="text"
                  value={editStudentForm.className}
                  onChange={e => setEditStudentForm(p => ({ ...p, className: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0f2a5c] font-semibold mt-1 text-sm"
                  placeholder="e.g. Class 8, Class 9, Class 10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">Father's Name</label>
                <input
                  type="text"
                  value={editStudentForm.fatherName}
                  onChange={e => setEditStudentForm(p => ({ ...p, fatherName: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0f2a5c] font-semibold mt-1 text-sm"
                  placeholder="Father's name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">Parent Phone</label>
                <input
                  type="tel"
                  value={editStudentForm.parentPhone}
                  onChange={e => setEditStudentForm(p => ({ ...p, parentPhone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0f2a5c] font-semibold mt-1 text-sm"
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">Secret PIN (Online Test Login)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={editStudentForm.pin}
                    onChange={e => setEditStudentForm(p => ({ ...p, pin: e.target.value }))}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0f2a5c] font-bold tracking-widest text-sm"
                    placeholder="e.g. 1234"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setEditStudentForm(p => ({ ...p, pin: generateRandomPin() }))}
                    title="Generate new random PIN"
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 text-xs font-bold hover:bg-pink-100 transition-colors whitespace-nowrap"
                  >
                    🔀 New PIN
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">PIN badal dene se purana PIN turant kaam karna band kar dega.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditStudentId(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStudentSave}
                className="flex-1 bg-[#0f2a5c] text-white py-3 rounded-2xl font-bold text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student Profile Modal ── */}
      {profileStudentId && (
        <AdminStudentProfile
          student={data.students.find(s => s.id === profileStudentId)!}
          allResults={data.results.filter(r => r.studentId === profileStudentId)}
          onClose={() => setProfileStudentId(null)}
        />
      )}
    </div>
  );
}
