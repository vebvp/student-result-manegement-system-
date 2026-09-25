// SRMS - Student Result Management System (Frontend only)
// Data is stored in localStorage under the key SRMS_DATA

const STORAGE_KEY = 'SRMS_DATA_V2';
const USERS_KEY = 'SRMS_USERS_V2';
const SESSION_KEY = 'SRMS_SESSION_V2';
const SETTINGS_KEY = 'SRMS_SETTINGS_V2';

// Default users with roles
const DEFAULT_USERS = {
  admin: { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
  teacher: { username: 'teacher', password: 'teacher123', role: 'teacher', name: 'John Teacher', assignedBranches: ['BCA', 'MCA'] },
  student: { username: 'student', password: 'student123', role: 'student', name: 'Vaibhav Sanjay Patil', rollNo: 'BCA23-001' },
  vaibhav: { username: 'vaibhav', password: 'vaibhav123', role: 'student', name: 'Vaibhav Sanjay Patil', rollNo: 'BCA23-001' }
};

// Default system settings
const DEFAULT_SETTINGS = {
  maxMarksPerSubject: 100,
  passMarksPerSubject: 35,
  gradingScale: {
    'A+': { min: 90, max: 100, points: 10 },
    'A': { min: 80, max: 89, points: 9 },
    'B+': { min: 70, max: 79, points: 8 },
    'B': { min: 60, max: 69, points: 7 },
    'C': { min: 50, max: 59, points: 6 },
    'D': { min: 40, max: 49, points: 5 },
    'F': { min: 0, max: 39, points: 0 }
  }
};

const DEFAULT_BRANCHES = { BCA: 6, MCA: 4 };
const DEFAULT_SUBJECTS = {
  BCA: {
    1: ['Mathematics I', 'Programming in C', 'Computer Fundamentals', 'Digital Logic', 'Communication Skills'],
    2: ['Mathematics II', 'Data Structures', 'OOP in C++', 'Operating Systems', 'Environmental Studies'],
    3: ['DBMS', 'Discrete Mathematics', 'Computer Networks', 'Java Programming', 'Accounting Fundamentals'],
    4: ['Software Engineering', 'Web Technologies', 'Computer Graphics', 'Probability & Statistics', 'Microprocessors'],
    5: ['Python Programming', 'Information Security', 'Mobile App Dev', 'AI Fundamentals', 'Management Info Systems'],
    6: ['Cloud Computing', 'Project', 'Data Analytics', 'Elective I', 'Elective II']
  },
  MCA: {
    1: ['Mathematical Foundations', 'Programming in C', 'Computer Architecture', 'DBMS', 'Communication Skills'],
    2: ['Data Structures', 'Operating Systems', 'OOP in Java', 'Software Engineering', 'Discrete Mathematics'],
    3: ['Computer Networks', 'Web Technologies', 'Data Warehousing', 'Elective I', 'Probability & Statistics'],
    4: ['AI & ML', 'Cloud Computing', 'Project', 'Elective II', 'Professional Ethics']
  }
};

const deepClone = (obj) => (typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));

// Get current settings
function getSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return settings || deepClone(DEFAULT_SETTINGS);
  } catch {
    return deepClone(DEFAULT_SETTINGS);
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Initialize users without removing accounts created by an administrator.
function initializeUsers() {
  try {
    const existing = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
    if (!existing) {
      localStorage.setItem(USERS_KEY, JSON.stringify(deepClone(DEFAULT_USERS)));
    } else {
      // Older versions could accidentally replace all user accounts.  Only add
      // missing built-in accounts, and preserve every existing account/password.
      for (const [key, user] of Object.entries(DEFAULT_USERS)) {
        if (!existing[key]) existing[key] = deepClone(user);
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(existing));
    }
  } catch (error) {
    console.error('Error initializing users:', error);
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
  
  initializeApplicationData();
}

function createInitialStore() {
  const marks = [85, 90, 88, 92, 87];
  const result = computeResult(marks);
  return {
    students: [{
      id: generateId(),
      name: 'Vaibhav Sanjay Patil',
      rollNo: 'BCA23-001',
      branch: 'BCA',
      semester: '1',
      marks,
      cgpa: result.cgpa,
      grade: result.grade,
      status: result.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }],
    subjects: deepClone(DEFAULT_SUBJECTS),
    branches: deepClone(DEFAULT_BRANCHES)
  };
}

// Seed sample data only for a completely new installation.  In particular, an
// intentionally empty student list must stay empty after a refresh.
function initializeApplicationData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      store = createInitialStore();
      writeStore(store);
    } else {
      store = readStore();
      writeStore(store); // persist normalized legacy/imported data
    }
  } catch (error) {
    console.error('Error initializing application data:', error);
    store = createInitialStore();
    writeStore(store);
  }
}

// Get current user session
function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!session || session.exp < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || DEFAULT_USERS;
    return users[session.username] || Object.values(users).find(user => user.username === session.username) || null;
  } catch {
    return null;
  }
}

// Authentication functions
function authenticateUser(username, password) {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || DEFAULT_USERS;
    const user = users[username];
    if (user && user.password === password) {
      const session = { 
        username, 
        role: user.role, 
        name: user.name,
        exp: Date.now() + 24*3600*1000 
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.href = 'login.html';
}

// Check if user has permission
function hasPermission(permission) {
  const user = getCurrentUser();
  if (!user) return false;
  
  const permissions = {
    admin: ['manage_students', 'manage_subjects', 'manage_branches', 'view_analytics', 'export_data', 'manage_users'],
    teacher: ['manage_students', 'view_analytics', 'export_data'],
    student: ['view_own_results']
  };
  
  return permissions[user.role]?.includes(permission) || false;
}

// Check if user can access student data
function canAccessStudent(student) {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') {
    return user.assignedBranches?.includes(student.branch) || false;
  }
  if (user.role === 'student') {
    return getStudentsForUser(user).some(record => record.id === student.id);
  }
  return false;
}

function normalizeIdentityValue(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

// A roll number is the primary link.  Name matching is retained only as a
// migration fallback for accounts created before results were linked properly.
function getStudentsForUser(user, students = store?.students || []) {
  if (!user || user.role !== 'student') return students;
  const rollNo = normalizeIdentityValue(user.rollNo);
  const matchesByRollNo = rollNo
    ? students.filter(student => normalizeIdentityValue(student.rollNo) === rollNo)
    : [];
  if (matchesByRollNo.length) return matchesByRollNo;

  const name = normalizeIdentityValue(user.name);
  return name ? students.filter(student => normalizeIdentityValue(student.name) === name) : [];
}

/** Utilities **/
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function readStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data || typeof data !== 'object') throw new Error('no data');
    // Normalize
    const normalized = {
      students: Array.isArray(data.students) ? data.students.map(normalizeStudent) : [],
      subjects: data.subjects && typeof data.subjects === 'object' ? data.subjects : deepClone(DEFAULT_SUBJECTS),
      branches: normalizeBranches(data)
    };
    return normalized;
  } catch {
    // Initialize with empty students array
    return { 
      students: [], 
      subjects: deepClone(DEFAULT_SUBJECTS), 
      branches: deepClone(DEFAULT_BRANCHES) 
    };
  }
}

function normalizeStudent(student) {
  const clean = student && typeof student === 'object' ? student : {};
  const marks = Array.isArray(clean.marks) ? clean.marks.map(mark => Math.max(0, Number(mark) || 0)) : [];
  const result = computeResult(marks);
  return {
    ...clean,
    id: clean.id || generateId(),
    name: String(clean.name || 'Unnamed student'),
    rollNo: String(clean.rollNo || ''),
    branch: String(clean.branch || ''),
    semester: String(clean.semester || ''),
    marks,
    cgpa: result.cgpa,
    grade: result.grade,
    status: result.status,
    createdAt: clean.createdAt || new Date().toISOString(),
    updatedAt: clean.updatedAt || clean.createdAt || new Date().toISOString()
  };
}

function writeStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeBranches(data) {
  // If branches exist and valid, use them
  if (data && data.branches && typeof data.branches === 'object' && Object.keys(data.branches).length) {
    const result = {};
    for (const [name, count] of Object.entries(data.branches)) {
      const trimmed = String(name).trim();
      const semesters = Math.max(1, Math.min(12, Number(count) || 0));
      if (trimmed && semesters) result[trimmed] = semesters;
    }
    if (Object.keys(result).length) return result;
  }
  // Derive from subjects if possible
  if (data && data.subjects && typeof data.subjects === 'object') {
    const derived = {};
    for (const [branch, semObj] of Object.entries(data.subjects)) {
      const maxSem = Math.max(0, ...Object.keys(semObj || {}).map(n => Number(n) || 0));
      if (branch && maxSem > 0) derived[branch] = maxSem;
    }
    if (Object.keys(derived).length) return derived;
  }
  return deepClone(DEFAULT_BRANCHES);
}

function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function generateId() { return Math.random().toString(36).slice(2, 10); }

function getSemestersForBranch(branch) {
  return store.branches?.[branch] || 0;
}

function gradePointFromMarks(marks) {
  const settings = getSettings();
  // Grading bands are percentages (0-100), while an administrator may set a
  // different maximum mark for each subject.
  const m = Math.max(0, Math.min(100, ((Number(marks) || 0) / settings.maxMarksPerSubject) * 100));
  const scale = settings.gradingScale;
  
  for (const [grade, range] of Object.entries(scale)) {
    if (m >= range.min && m <= range.max) {
      return range.points;
    }
  }
  return 0;
}

function gradeFromCgpa(cgpa) {
  const settings = getSettings();
  const scale = settings.gradingScale;
  
  for (const [grade, range] of Object.entries(scale)) {
    if (cgpa >= range.points) {
      return grade;
    }
  }
  return 'F';
}

function computeResult(subjectMarks) {
  const settings = getSettings();
  const totalMax = subjectMarks.length * settings.maxMarksPerSubject;
  const totalObtained = subjectMarks.reduce((acc, m) => acc + (Number(m) || 0), 0);
  const gradePoints = subjectMarks.map(gradePointFromMarks);
  const cgpa = gradePoints.length ? +(gradePoints.reduce((a, g) => a + g, 0) / gradePoints.length).toFixed(2) : 0;
  const hasBack = subjectMarks.some(m => (Number(m) || 0) < settings.passMarksPerSubject);
  const grade = gradeFromCgpa(cgpa);
  const status = hasBack || grade === 'F' ? 'Fail' : 'Pass';
  return { totalMax, totalObtained, cgpa, grade, status };
}

/** State **/
let store = readStore();
let uiState = {
  editingId: null,
  filterBranch: '',
  filterSemester: '',
  search: ''
};

/** DOM Init **/
document.addEventListener('DOMContentLoaded', () => {
  console.log('SRMS Initializing...');
  initializeUsers();
  $('#year').textContent = new Date().getFullYear();
  setupThemeToggle();
  if (!guardAuth()) return;
  setupRoleBasedUI();
  bindFilters();
  bindHeaderActions();
  bindModals();
  // Initial population of dynamic selects
  populateBranches($('#branchFilter'), true);
  populateBranches($('#studentBranch'), false);
  populateBranches($('#subjectsBranch'), false);
  populateBranches($('#branchFilterTop'), true);
  populateBranches($('#branchFilterMobile'), true);
  renderAll();
  renderDashboard();
  console.log('SRMS Initialized successfully');
});

function setupThemeToggle() {
  const toggle = $('#themeToggle');
  const THEME_KEY = 'SRMS_THEME';
  
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update checkbox state
    toggle.checked = theme === 'dark';
  }
  
  // Apply saved theme or system preference
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    apply(saved);
  } else {
    // Set initial state based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply(prefersDark ? 'dark' : 'light');
  }
  
  toggle.addEventListener('change', () => {
    const next = toggle.checked ? 'dark' : 'light';
    apply(next);
    localStorage.setItem(THEME_KEY, next);
  });
}

function setupRoleBasedUI() {
  const user = getCurrentUser();
  if (!user) return;
  
  // Update header with user info
  const userInfo = $('#userInfo');
  if (userInfo) {
    userInfo.innerHTML = `
      <span class="user-role">${user.role.toUpperCase()}</span>
      <span class="user-name">${user.name}</span>
    `;
  }
  
  // Show/hide elements based on permissions
  const adminElements = $$('[data-role="admin"]');
  const teacherElements = $$('[data-role="teacher"]');
  const studentElements = $$('[data-role="student"]');
  
  adminElements.forEach(el => el.style.display = user.role === 'admin' ? '' : 'none');
  teacherElements.forEach(el => el.style.display = ['admin', 'teacher'].includes(user.role) ? '' : 'none');
  studentElements.forEach(el => el.style.display = user.role === 'student' ? '' : 'none');
  
  // Filter students based on role
  if (user.role === 'student') {
    // Students can only see their own results
    uiState.studentFilter = user.rollNo;
  } else if (user.role === 'teacher') {
    // Teachers can only see their assigned branches
    uiState.branchFilter = user.assignedBranches || [];
  }
}

function bindHeaderActions() {
  $('#printBtn')?.addEventListener('click', () => window.print());
  $('#logoutBtn').addEventListener('click', logout);
  $('#exportBtn')?.addEventListener('click', exportData);
  $('#importBtn')?.addEventListener('click', () => $('#importModal').showModal());
  $('#settingsBtn')?.addEventListener('click', () => $('#settingsModal').showModal());
  $('#changePasswordBtn')?.addEventListener('click', () => $('#changePasswordModal').showModal());
  $('#clearAllBtn').addEventListener('click', () => {
    if (getCurrentUser()?.role !== 'admin') {
      showMessage('Permission denied', 'error');
      return;
    }
    if (confirm('This will remove all students and custom subjects. Continue?')) {
      store = { students: [], subjects: deepClone(DEFAULT_SUBJECTS), branches: deepClone(DEFAULT_BRANCHES) };
      uiState.currentStudent = null;
      writeStore(store); renderAll(); renderDashboard(); showMessage('All data cleared', 'success');
    }
  });
  const mobileBtn = document.getElementById('mobileFiltersBtn');
  const mobileDlg = document.getElementById('mobileFilters');
  if (mobileBtn && mobileDlg) {
    mobileBtn.addEventListener('click', () => mobileDlg.showModal());
    mobileDlg.querySelector('[data-close]')?.addEventListener('click', () => mobileDlg.close());
  }
}

// Enhanced error handling
function showMessage(message, type = 'info') {
  const messageEl = $('#messageBox');
  if (messageEl) {
    messageEl.className = `message-box ${type}`;
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 4000);
  } else {
    toast(message);
  }
}

// Export functionality
function exportData() {
  if (!hasPermission('export_data')) {
    showMessage('Permission denied', 'error');
    return;
  }
  
  const user = getCurrentUser();
  let students = store.students;
  
  // Apply role-based filtering for export
  if (user.role === 'student') {
    students = getStudentsForUser(user, students);
  } else if (user.role === 'teacher') {
    students = students.filter(s => user.assignedBranches?.includes(s.branch));
  }
  
  const data = {
    students: students,
    subjects: store.subjects,
    branches: store.branches,
    exportDate: new Date().toISOString(),
    exportedBy: user.name
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `srms_export_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showMessage('Data exported successfully', 'success');
}

// PDF export runs entirely in the browser.  The previous implementation
// required a separate Python server on localhost, which made the button fail
// for normal website visitors.
function exportToPDF(student) {
  try {
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) throw new Error('The PDF library did not load. Check your internet connection and refresh.');

    const settings = getSettings();
    const subjects = ensureSubjectList(student.branch, student.semester);
    const marks = Array.isArray(student.marks) ? student.marks : [];
    const { totalObtained, cgpa, grade, status } = computeResult(marks);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('STATEMENT OF MARKS', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Student Result Management System', pageWidth / 2, 26, { align: 'center' });
    doc.line(16, 31, pageWidth - 16, 31);
    doc.setFontSize(10);
    doc.text(`Name: ${student.name}`, 16, 40);
    doc.text(`Roll No: ${student.rollNo}`, 16, 47);
    doc.text(`Branch: ${student.branch}`, 112, 40);
    doc.text(`Semester: ${student.semester}`, 112, 47);

    const tableRows = subjects.map((subject, index) => {
      const mark = Number(marks[index]) || 0;
      return [String(index + 1), subject, String(mark), String(settings.maxMarksPerSubject), mark >= settings.passMarksPerSubject ? 'Pass' : 'Fail'];
    });
    let finalY = 58;
    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: finalY,
        head: [['#', 'Subject', 'Marks', 'Max', 'Status']],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [31, 111, 235] },
        columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } }
      });
      finalY = doc.lastAutoTable.finalY + 12;
    } else {
      // A usable fallback when the optional autoTable plugin is unavailable.
      doc.setFontSize(9);
      doc.text('Subject                                      Marks / Max     Status', 16, finalY);
      tableRows.forEach((row, index) => {
        const y = finalY + 7 + (index * 7);
        doc.text(`${row[0]}. ${row[1].slice(0, 32)}`, 16, y);
        doc.text(`${row[2]} / ${row[3]}`, 130, y);
        doc.text(row[4], 168, y);
      });
      finalY += 14 + (tableRows.length * 7);
    }

    if (finalY > 260) {
      doc.addPage();
      finalY = 22;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Result Summary', 16, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total: ${totalObtained}/${subjects.length * settings.maxMarksPerSubject}`, 16, finalY + 8);
    doc.text(`CGPA: ${Number(cgpa).toFixed(2)}`, 90, finalY + 8);
    doc.text(`Grade: ${grade}`, 16, finalY + 16);
    doc.setTextColor(status === 'Pass' ? 0 : 190, status === 'Pass' ? 130 : 0, 0);
    doc.text(`Status: ${status}`, 90, finalY + 16);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 16, finalY + 29);
    doc.save(`${String(student.rollNo).replace(/[^a-z0-9_-]/gi, '_')}_result.pdf`);
    showMessage('PDF download started', 'success');
  } catch (error) {
    console.error('PDF generation error:', error);
    showMessage(error.message || 'Unable to generate the PDF.', 'error');
  }
}

// export/import removed per request

// Debounce function to limit frequent updates
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function bindFilters() {
  const branchSel = $('#branchFilter');
  const semSel = $('#semesterFilter');
  const branchTop = $('#branchFilterTop');
  const semTop = $('#semesterFilterTop');
  const branchMob = $('#branchFilterMobile');
  const semMob = $('#semesterFilterMobile');
  
  populateBranches(branchSel, true);
  
  const debouncedRender = debounce(() => {
    renderTable();
    renderStats();
  }, 150);  // 150ms delay

  branchSel.addEventListener('change', () => {
    uiState.filterBranch = branchSel.value;
    populateSemesters(semSel, branchSel.value, true);
    semSel.value = '';
    debouncedRender();
    // sync top filters
    if (branchTop) { branchTop.value = branchSel.value; populateSemesters(semTop, branchTop.value, true); semTop.value = ''; }
    if (branchMob) { branchMob.value = branchSel.value; populateSemesters(semMob, branchMob.value, true); semMob.value = ''; }
  });
  
  semSel.addEventListener('change', () => { 
    uiState.filterSemester = semSel.value; 
    debouncedRender();
  });
  
  $('#searchInput').addEventListener('input', (e) => { 
    uiState.search = e.target.value.trim().toLowerCase(); 
    debouncedRender();
  });

  // Top filters bindings (sync with sidebar)
  if (branchTop) {
    branchTop.addEventListener('change', () => {
      uiState.filterBranch = branchTop.value;
      populateSemesters(semTop, branchTop.value, true);
      semTop.value = '';
      renderTable(); renderStats();
      branchSel.value = branchTop.value; populateSemesters(semSel, branchSel.value, true); semSel.value = '';
      if (branchMob) { branchMob.value = branchTop.value; populateSemesters(semMob, branchMob.value, true); semMob.value = ''; }
    });
  }
  if (semTop) {
    semTop.addEventListener('change', () => {
      uiState.filterSemester = semTop.value;
      renderTable(); renderStats();
      semSel.value = semTop.value;
      if (semMob) semMob.value = semTop.value;
    });
  }

  // Mobile filters bindings
  if (branchMob) {
    branchMob.addEventListener('change', () => {
      uiState.filterBranch = branchMob.value;
      populateSemesters(semMob, branchMob.value, true);
      semMob.value = '';
      renderTable(); renderStats();
      branchSel.value = branchMob.value; populateSemesters(semSel, branchSel.value, true); semSel.value = '';
      if (branchTop) { branchTop.value = branchMob.value; populateSemesters(semTop, branchTop.value, true); semTop.value = ''; }
    });
  }
  if (semMob) {
    semMob.addEventListener('change', () => {
      uiState.filterSemester = semMob.value;
      renderTable(); renderStats();
      semSel.value = semMob.value;
      if (semTop) semTop.value = semMob.value;
    });
  }
}

function populateSemesters(selectEl, branch, includeAll) {
  selectEl.innerHTML = '';
  if (!branch) { selectEl.disabled = true; selectEl.append(new Option(includeAll ? 'All' : 'Select', '')); return; }
  const total = getSemestersForBranch(branch);
  selectEl.disabled = false;
  if (includeAll) selectEl.append(new Option('All', ''));
  for (let i = 1; i <= total; i++) selectEl.append(new Option(`Semester ${i}`, String(i)));
}

function populateBranches(selectEl, includeAll) {
  if (!selectEl) return;
  const currentValue = selectEl.value;
  selectEl.innerHTML = '';
  if (includeAll) selectEl.append(new Option('All', ''));
  Object.keys(store.branches || {}).sort().forEach(b => selectEl.append(new Option(b, b)));
  // try preserve previous selection
  if (currentValue && Array.from(selectEl.options).some(o => o.value === currentValue)) {
    selectEl.value = currentValue;
  }
}

function bindModals() {
  // Student Modal
  $('#addStudentBtn').addEventListener('click', () => openStudentModal());
  $('#studentForm').addEventListener('submit', onStudentSubmit);
  $$('[data-close]').forEach(btn => btn.addEventListener('click', (e) => e.target.closest('dialog').close()));
  $('#studentBranch').addEventListener('change', () => {
    populateSemesters($('#studentSemester'), $('#studentBranch').value, false);
    $('#studentSemester').value = '';
    $('#studentSemester').dispatchEvent(new Event('change'));
  });
  $('#studentSemester').addEventListener('change', setupSubjectInputsForStudent);

  // Subjects Modal
  $('#manageSubjectsBtn').addEventListener('click', () => $('#subjectsModal').showModal());
  $('#subjectsForm').addEventListener('submit', onSubjectsSubmit);
  $('#subjectsBranch').addEventListener('change', () => {
    populateSemesters($('#subjectsSemester'), $('#subjectsBranch').value, false);
    $('#subjectsSemester').value = '';
    renderSubjectsEditor();
  });
  $('#subjectsSemester').addEventListener('change', renderSubjectsEditor);
  $('#addSubjectBtn').addEventListener('click', () => {
    const branch = $('#subjectsBranch').value; const sem = $('#subjectsSemester').value;
    const name = $('#newSubjectName').value.trim();
    if (!branch || !sem) return toast('Select branch and semester');
    if (!name) return toast('Enter subject name');
    const list = ensureSubjectList(branch, sem);
    if (list.length >= 10) return toast('Max 10 subjects allowed');
    list.push(name); $('#newSubjectName').value = ''; renderSubjectsEditor(); save();
  });

  // Settings Modal
  $('#settingsBtn').addEventListener('click', () => {
    renderSettingsModal();
    $('#settingsModal').showModal();
  });
  $('#settingsForm').addEventListener('submit', onSettingsSubmit);
  
  // Import Modal
  $('#importForm').addEventListener('submit', onImportSubmit);

  // Branches Modal
  $('#manageBranchesBtn').addEventListener('click', () => { renderBranchesEditor(); $('#branchesModal').showModal(); });
  $('#branchesForm').addEventListener('submit', onBranchesSubmit);
  $('#addBranchBtn').addEventListener('click', () => {
    const name = $('#newBranchName').value.trim();
    const sems = Math.max(1, Math.min(12, Number($('#newBranchSemesters').value) || 0));
    if (!name) return toast('Enter branch name');
    if (Object.keys(store.branches).some(b => b.toLowerCase() === name.toLowerCase())) return toast('Branch already exists');
    if (!sems) return toast('Enter valid semesters (1-12)');
    appendBranchRow({ name, semesters: sems });
    $('#newBranchName').value = '';
    $('#newBranchSemesters').value = '';
  });
  
  // PDF Export
  $('#pdfBtn')?.addEventListener('click', () => {
    const student = uiState.currentStudent;
    if (student) {
      exportToPDF(student);
    }
  });

  // Change Password Modal
  $('#changePasswordForm').addEventListener('submit', onChangePasswordSubmit);
  
  // Password toggle functionality for change password modal
  $('#toggleCurrentPassword').addEventListener('click', function(e) {
    e.preventDefault();
    const input = document.getElementById('currentPassword');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    this.textContent = isHidden ? '🙈' : '👁';
  });
  
  $('#toggleNewPassword').addEventListener('click', function(e) {
    e.preventDefault();
    const input = document.getElementById('newPassword');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    this.textContent = isHidden ? '🙈' : '👁';
  });
  
  $('#toggleConfirmPassword').addEventListener('click', function(e) {
    e.preventDefault();
    const input = document.getElementById('confirmPassword');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    this.textContent = isHidden ? '🙈' : '👁';
  });
}

function onSettingsSubmit(e) {
  e.preventDefault();
  
  if (!hasPermission('manage_users')) {
    showMessage('Permission denied', 'error');
    return;
  }
  
  const settings = getSettings();
  const maxMarks = Number($('#maxMarks').value);
  const passMarks = Number($('#passMarks').value);
  
  if (maxMarks < 50 || maxMarks > 200) {
    showMessage('Maximum marks must be between 50 and 200', 'error');
    return;
  }
  
  if (passMarks < 20 || passMarks > maxMarks) {
    showMessage('Pass marks must be between 20 and maximum marks', 'error');
    return;
  }
  
  // Update grading scale
  const newGradingScale = {};
  $$('#gradingScale .grade-row').forEach(row => {
    const grade = row.querySelector('input[data-type="grade"]').value;
    const min = Number(row.querySelector('input[data-type="min"]').value);
    const max = Number(row.querySelector('input[data-type="max"]').value);
    const points = Number(row.querySelector('input[data-type="points"]').value);
    
    if (grade && !isNaN(min) && !isNaN(max) && !isNaN(points)) {
      newGradingScale[grade] = { min, max, points };
    }
  });
  
  const newSettings = {
    maxMarksPerSubject: maxMarks,
    passMarksPerSubject: passMarks,
    gradingScale: newGradingScale
  };
  
  saveSettings(newSettings);
  $('#settingsModal').close();
  showMessage('Settings saved successfully', 'success');
  
  // Recalculate all student results with new settings
  store.students.forEach(student => {
    const result = computeResult(student.marks);
    student.cgpa = result.cgpa;
    student.grade = result.grade;
    student.status = result.status;
  });
  save();
  renderAll();
  renderDashboard();
}

function onImportSubmit(e) {
  e.preventDefault();
  
  if (getCurrentUser()?.role !== 'admin') {
    showMessage('Permission denied', 'error');
    return;
  }
  
  const fileInput = $('#importFile');
  const file = fileInput.files[0];
  
  if (!file) {
    showMessage('Please select a file', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.students && Array.isArray(data.students)) {
        store.students = data.students.map(normalizeStudent);
        if (data.subjects) store.subjects = data.subjects;
        if (data.branches) store.branches = data.branches;
        
        save();
        renderAll();
        renderDashboard();
        showMessage('Data imported successfully', 'success');
        $('#importModal').close();
      } else {
        showMessage('Invalid file format', 'error');
      }
    } catch (error) {
      showMessage('Error reading file', 'error');
    }
  };
  reader.readAsText(file);
}

function onChangePasswordSubmit(e) {
  e.preventDefault();
  clearErrors();
  
  const currentPassword = $('#currentPassword').value;
  const newPassword = $('#newPassword').value;
  const confirmPassword = $('#confirmPassword').value;
  
  let valid = true;
  
  // Validation
  if (!currentPassword) {
    showError('currentPassword', 'Current password is required');
    valid = false;
  }
  
  if (!newPassword) {
    showError('newPassword', 'New password is required');
    valid = false;
  } else if (newPassword.length < 6) {
    showError('newPassword', 'New password must be at least 6 characters');
    valid = false;
  }
  
  if (!confirmPassword) {
    showError('confirmPassword', 'Please confirm your new password');
    valid = false;
  } else if (newPassword !== confirmPassword) {
    showError('confirmPassword', 'Passwords do not match');
    valid = false;
  }
  
  if (!valid) return;
  
  try {
    const user = getCurrentUser();
    if (!user) {
      showMessage('User session expired. Please login again.', 'error');
      return;
    }
    
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || DEFAULT_USERS;
    const currentUserKey = Object.keys(users).find(key => users[key].username === user.username);
    const currentUser = currentUserKey ? users[currentUserKey] : null;
    
    if (!currentUser || currentUser.password !== currentPassword) {
      showError('currentPassword', 'Current password is incorrect');
      return;
    }
    
    // Update password
    currentUser.password = newPassword;
    users[currentUserKey] = currentUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Clear form
    $('#currentPassword').value = '';
    $('#newPassword').value = '';
    $('#confirmPassword').value = '';
    
    $('#changePasswordModal').close();
    showMessage('Password changed successfully', 'success');
    
  } catch (error) {
    showMessage('Error changing password', 'error');
  }
}

function renderSettingsModal() {
  const settings = getSettings();
  $('#maxMarks').value = settings.maxMarksPerSubject;
  $('#passMarks').value = settings.passMarksPerSubject;
  
  const gradingScaleEl = $('#gradingScale');
  gradingScaleEl.innerHTML = '';
  
  Object.entries(settings.gradingScale).forEach(([grade, range]) => {
    const row = document.createElement('div');
    row.className = 'grade-row';
    row.innerHTML = `
      <input type="text" value="${grade}" data-type="grade" readonly />
      <input type="number" value="${range.min}" data-type="min" min="0" max="100" />
      <input type="number" value="${range.max}" data-type="max" min="0" max="100" />
      <input type="number" value="${range.points}" data-type="points" min="0" max="10" step="0.1" />
    `;
    gradingScaleEl.appendChild(row);
  });
}

function openStudentModal(student) {
  uiState.editingId = student ? student.id : null;
  $('#studentModalTitle').textContent = student ? 'Edit Student Result' : 'Add Student Result';
  $('#studentName').value = student?.name || '';
  $('#rollNo').value = student?.rollNo || '';
  populateBranches($('#studentBranch'), false);
  $('#studentBranch').value = student?.branch || '';
  populateSemesters($('#studentSemester'), $('#studentBranch').value, false);
  $('#studentSemester').value = student?.semester || '';
  setupSubjectInputsForStudent();
  if (student) {
    // Fill marks
    $$('#subjectsContainer .subject-row input[data-type="mark"]').forEach((input, idx) => {
      input.value = student.marks?.[idx] ?? '';
    });
    updateComputedRow();
  }
  $('#studentModal').showModal();
}

function setupSubjectInputsForStudent() {
  const settings = getSettings();
  const branch = $('#studentBranch').value; const sem = $('#studentSemester').value;
  const container = $('#subjectsContainer'); container.innerHTML = '';
  if (!branch || !sem) { updateComputedRow(); return; }
  const subjectList = ensureSubjectList(branch, sem);
  if (subjectList.length < 3) toast('Tip: Add at least 3 subjects for this semester');
  subjectList.forEach((name, index) => {
    const row = document.createElement('div'); row.className = 'subject-row';
    row.innerHTML = `
      <input type="text" value="${name}" data-type="name" disabled />
      <input type="number" min="0" max="${settings.maxMarksPerSubject}" placeholder="Marks" data-type="mark" />
      <input type="number" value="${settings.maxMarksPerSubject}" disabled />
      <button type="button" class="icon-btn remove" title="Remove" disabled>–</button>
    `;
    container.appendChild(row);
  });
  container.addEventListener('input', updateComputedRow, { once: true });
  $$('#subjectsContainer input[data-type="mark"]').forEach(inp => inp.addEventListener('input', updateComputedRow));
  updateComputedRow();
}

function updateComputedRow() {
  const marks = $$('#subjectsContainer input[data-type="mark"]').map(i => Number(i.value) || 0);
  const { totalObtained, cgpa, grade, status } = computeResult(marks);
  $('#computedTotal').textContent = String(totalObtained);
  const cgpaEl = document.getElementById('computedCgpa');
  if (cgpaEl) cgpaEl.textContent = Number(cgpa).toFixed(2);
  $('#computedGrade').textContent = grade;
  $('#computedStatus').textContent = status;
}

function onStudentSubmit(e) {
  e.preventDefault();
  clearErrors();
  
  if (!hasPermission('manage_students')) {
    toast('Permission denied');
    return;
  }
  
  const settings = getSettings();
  const name = $('#studentName').value.trim();
  const rollNo = $('#rollNo').value.trim();
  const branch = $('#studentBranch').value;
  const semester = $('#studentSemester').value;
  const marks = $$('#subjectsContainer input[data-type="mark"]').map(i => Number(i.value));

  let valid = true;
  
  // Enhanced validation with full name requirement
  if (!name) { 
    showError('studentName', 'Name is required'); 
    valid = false; 
  } else {
    // Split name into parts and check for first, middle, and last name
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      showError('studentName', 'Please enter at least first and last name');
      valid = false;
    } else if (nameParts.some(part => part.length < 2)) {
      showError('studentName', 'Each part of the name must be at least 2 characters');
      valid = false;
    }
  }
  
  if (!rollNo) { 
    showError('rollNo', 'Roll number is required'); 
    valid = false; 
  } else if (rollNo.length < 3) {
    showError('rollNo', 'Roll number must be at least 3 characters');
    valid = false;
  }
  
  if (!branch) { 
    showError('studentBranch', 'Select branch'); 
    valid = false; 
  }
  
  if (!semester) { 
    showError('studentSemester', 'Select semester'); 
    valid = false; 
  }
  
  if (marks.length === 0) { 
    showError('subjects', 'No subjects configured for this semester'); 
    valid = false; 
  }
  
  // Check for duplicate roll number (excluding current student if editing)
  const existingStudent = store.students.find(s => 
    s.rollNo.toLowerCase() === rollNo.toLowerCase() && s.id !== uiState.editingId
  );
  if (existingStudent) {
    showError('rollNo', 'Roll number already exists');
    valid = false;
  }
  
  // Validate marks
  const invalidMarks = marks.some((mark, index) => {
    if (mark < 0) {
      showError('subjects', `Marks cannot be negative for subject ${index + 1}`);
      return true;
    }
    if (mark > settings.maxMarksPerSubject) {
      showError('subjects', `Marks cannot exceed ${settings.maxMarksPerSubject} for subject ${index + 1}`);
      return true;
    }
    return false;
  });
  
  if (invalidMarks) {
    valid = false;
  }

  if (!valid) return;

  const { cgpa, grade, status } = computeResult(marks);
  const payload = { 
    id: uiState.editingId || generateId(), 
    name, 
    rollNo, 
    branch, 
    semester, 
    marks, 
    cgpa, 
    grade, 
    status,
    createdAt: uiState.editingId ? store.students.find(s => s.id === uiState.editingId)?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const idx = store.students.findIndex(s => s.id === payload.id);
  if (idx >= 0) {
    const previousRollNo = store.students[idx].rollNo;
    store.students[idx] = payload;
    // Keep an existing student account linked if the roll number was corrected.
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || {};
    const account = Object.values(users).find(user => user.role === 'student' && user.rollNo === previousRollNo);
    if (account) {
      account.rollNo = rollNo;
      account.name = name;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  } else {
    store.students.push(payload);
    // Create student login account
    try {
      // Get existing users first
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || DEFAULT_USERS;
      
      const existingAccountKeys = Object.keys(users).filter(key =>
        users[key].role === 'student' && normalizeIdentityValue(users[key].name) === normalizeIdentityValue(name)
      );
      if (existingAccountKeys.length) {
        // Link a pre-existing login (such as the included demo student) to the
        // roll number just entered by the administrator.
        existingAccountKeys.forEach(key => {
          users[key].name = name;
          users[key].rollNo = rollNo;
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        showMessage('Result saved and linked to the existing student login.', 'success');
      } else {
        const username = name;
        const password = name.toLowerCase().replace(/\s+/g, '') + '123';
        if (users[username]) throw new Error('An account already exists for this name. Use a distinct full name.');
        users[username] = { username, password, role: 'student', name, rollNo };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        alert(
          'Student login credentials created:\n\n' +
          `Username: ${username}\n` +
          `Password: ${password}\n\n` +
          'Please share these with the student.\n\n' +
          'Usernames are not case-sensitive; the password is case-sensitive.'
        );
      }
    } catch (error) {
      console.error('Error creating student account:', error);
      showMessage(error.message || 'Result saved, but the student login could not be created.', 'error');
    }
  }
  save();
  $('#studentModal').close();
  renderAll();
  renderDashboard();
  
  toast(idx >= 0 ? 'Student updated' : 'Student result saved');
}

function onSubjectsSubmit(e) {
  e.preventDefault();
  clearErrors();
  if (!hasPermission('manage_subjects')) { toast('Permission denied'); return; }
  const branch = $('#subjectsBranch').value; const sem = $('#subjectsSemester').value;
  if (!branch) { showError('subjectsBranch', 'Select branch'); return; }
  if (!sem) { showError('subjectsSemester', 'Select semester'); return; }
  const names = $$('#subjectsList .subject-pill input').map(i => i.value.trim()).filter(Boolean);
  if (names.length < 3) { alert('Please keep at least 3 subjects'); return; }
  if (names.length > 10) { alert('Limit to 10 subjects'); return; }
  ensureSubjectList(branch, sem).splice(0, Infinity, ...names);
  save();
  $('#subjectsModal').close();
  toast('Subjects saved');
}

function ensureSubjectList(branch, semester) {
  if (!store.subjects[branch]) store.subjects[branch] = {};
  if (!store.subjects[branch][semester]) {
    const defaults = DEFAULT_SUBJECTS[branch]?.[semester] || [];
    store.subjects[branch][semester] = defaults.slice();
  }
  return store.subjects[branch][semester];
}

function renderSubjectsEditor() {
  const branch = $('#subjectsBranch').value; const sem = $('#subjectsSemester').value;
  const wrap = $('#subjectsList'); wrap.innerHTML = '';
  if (!branch || !sem) return;
  const list = ensureSubjectList(branch, sem);
  list.forEach((name, idx) => {
    const pill = document.createElement('div'); pill.className = 'subject-pill';
    pill.innerHTML = `
      <input type="text" value="${name}" />
      <button type="button" class="icon-btn" title="Remove">✕</button>
    `;
    pill.querySelector('button').addEventListener('click', () => { list.splice(idx, 1); renderSubjectsEditor(); save(); });
    wrap.appendChild(pill);
  });
}

function renderBranchesEditor() {
  const wrap = $('#branchesList');
  wrap.innerHTML = '';
  Object.entries(store.branches).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, semesters]) => {
    appendBranchRow({ name, semesters, oldName: name });
  });
}

function appendBranchRow({ name, semesters, oldName }) {
  const wrap = $('#branchesList');
  const row = document.createElement('div'); row.className = 'branch-row';
  row.dataset.old = oldName || name;
  row.innerHTML = `
    <input type="text" value="${name}" data-type="name" />
    <input type="number" min="1" max="12" value="${semesters}" data-type="semesters" />
    <button type="button" class="icon-btn" title="Remove">✕</button>
  `;
  row.querySelector('button').addEventListener('click', () => row.remove());
  wrap.appendChild(row);
}

function onBranchesSubmit(e) {
  e.preventDefault();
  if (!hasPermission('manage_branches')) { toast('Permission denied'); return; }
  // Build new mapping from rows
  const rows = $$('#branchesList .branch-row');
  const newMap = {};
  const renames = [];
  for (const r of rows) {
    const name = r.querySelector('input[data-type="name"]').value.trim();
    const semesters = Math.max(1, Math.min(12, Number(r.querySelector('input[data-type="semesters"]').value) || 0));
    if (!name || !semesters) { alert('Please provide valid branch names and semesters (1-12).'); return; }
    if (newMap[name]) { alert('Duplicate branch names are not allowed.'); return; }
    newMap[name] = semesters;
    const oldName = r.dataset.old || name;
    if (oldName && oldName !== name && store.branches[oldName] != null) renames.push([oldName, name]);
  }
  const oldBranches = { ...store.branches };
  store.branches = newMap;

  // Apply renames: move subjects and update students
  for (const [oldName, newName] of renames) {
    if (!store.subjects[newName] && store.subjects[oldName]) {
      store.subjects[newName] = store.subjects[oldName];
    }
    delete store.subjects[oldName];
    store.students.forEach(s => { if (s.branch === oldName) s.branch = newName; });
  }

  // Remove subjects for deleted branches
  for (const b of Object.keys(oldBranches)) {
    if (!store.branches[b]) delete store.subjects[b];
  }

  // Trim subjects for reduced semesters
  for (const [b, count] of Object.entries(store.branches)) {
    const sems = store.subjects[b];
    if (!sems) continue;
    Object.keys(sems).forEach(sem => { if (Number(sem) > count) delete sems[sem]; });
  }

  save();
  $('#branchesModal').close();
  // Refresh dependent selects/UI
  populateBranches($('#branchFilter'), true);
  populateBranches($('#studentBranch'), false);
  populateBranches($('#subjectsBranch'), false);
  // Reset semester filters because counts could change
  populateSemesters($('#semesterFilter'), $('#branchFilter').value, true);
  renderAll();
  toast('Branches saved');
}

function renderAll() {
  renderTable();
  renderStats();
}

function renderTable() {
  const tbody = $('#studentsTable tbody');
  tbody.innerHTML = '';
  
  // Apply role-based filtering
  let rows = store.students;
  const user = getCurrentUser();
  
  if (user) {
    if (user.role === 'student') {
      // Students can only see their own results
      rows = getStudentsForUser(user, rows);
    } else if (user.role === 'teacher') {
      // Teachers can only see their assigned branches
      rows = rows.filter(s => user.assignedBranches?.includes(s.branch));
    }
  }
  
  // Apply regular filters
  rows = rows
    .filter(s => !uiState.filterBranch || s.branch === uiState.filterBranch)
    .filter(s => !uiState.filterSemester || String(s.semester) === String(uiState.filterSemester))
    .filter(s => !uiState.search || s.name.toLowerCase().includes(uiState.search) || s.rollNo.toLowerCase().includes(uiState.search))
    .sort((a, b) => a.name.localeCompare(b.name));
    
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td'); 
    td.colSpan = 8; 
    td.className = 'muted'; 
    td.textContent = user?.role === 'student' ? 'No results found for your roll number' : 'No records';
    tr.appendChild(td); 
    tbody.appendChild(tr); 
    return;
  }
  
  for (const s of rows) {
    const tr = document.createElement('tr');
    const effectiveCgpa = typeof s.cgpa === 'number' ? s.cgpa : computeResult(s.marks).cgpa;
    const canEdit = hasPermission('manage_students') && canAccessStudent(s);
    const canDelete = hasPermission('manage_students') && canAccessStudent(s);
    
    tr.innerHTML = `
      <td>${escapeHtml(s.rollNo)}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.branch)}</td>
      <td>${escapeHtml(s.semester)}</td>
      <td>${Number(effectiveCgpa).toFixed(2)}</td>
      <td>${s.grade}</td>
      <td><span class="badge ${s.status === 'Pass' ? 'success' : 'danger'}">${s.status}</span></td>
      <td class="row-actions">
        <button class="btn btn-outline" data-act="view">View</button>
        ${canEdit ? '<button class="btn btn-outline" data-act="edit">Edit</button>' : ''}
        ${canDelete ? '<button class="btn btn-danger btn-ghost" data-act="delete">Delete</button>' : ''}
      </td>
    `;
    tr.querySelector('[data-act="view"]').addEventListener('click', () => openDetail(s));
    if (canEdit) {
      tr.querySelector('[data-act="edit"]').addEventListener('click', () => openStudentModal(s));
    }
    if (canDelete) {
      tr.querySelector('[data-act="delete"]').addEventListener('click', () => onDeleteStudent(s.id));
    }
    tbody.appendChild(tr);
  }
}

function renderDashboard() {
  const user = getCurrentUser();
  if (!user) return;
  
  // Get filtered students for dashboard stats
  let students = store.students;
  if (user.role === 'student') {
    students = getStudentsForUser(user, students);
  } else if (user.role === 'teacher') {
    students = students.filter(s => user.assignedBranches?.includes(s.branch));
  }
  
  // Calculate dashboard stats
  const totalStudents = students.length;
  const passCount = students.filter(s => s.status === 'Pass').length;
  const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;
  const avgCgpa = totalStudents > 0 ? 
    students.reduce((sum, s) => sum + (s.cgpa || 0), 0) / totalStudents : 0;
  
  // Find topper
  const topper = students.length > 0 ? 
    students.reduce((max, s) => (s.cgpa || 0) > (max.cgpa || 0) ? s : max) : null;

  const dashboardEl = $('#dashboard');
  if (dashboardEl) {
    const title = user.role === 'student' ? 'My Result Overview' : 'Result Overview';
    dashboardEl.innerHTML = `
      <h2>${title}</h2>
      <div class="dashboard-grid">
        <div class="dashboard-card"><div class="card-content"><h3>${totalStudents}</h3><p>${user.role === 'student' ? 'Result Record' : 'Students'}</p></div></div>
        <div class="dashboard-card"><div class="card-content"><h3>${passRate}%</h3><p>Pass Rate</p></div></div>
        <div class="dashboard-card"><div class="card-content"><h3>${avgCgpa.toFixed(2)}</h3><p>Average CGPA</p></div></div>
      </div>
      <p class="muted small">${topper ? `Top performer: ${escapeHtml(topper.name)} (${Number(topper.cgpa || 0).toFixed(2)})` : 'No result records yet.'}</p>
    `;
  }
  
  // Render recent students
  const recentStudents = students
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 5);
  
  const recentEl = $('#recentStudents');
  if (recentEl) {
    if (recentStudents.length === 0) {
      recentEl.innerHTML = '<p class="muted">No recent students</p>';
    } else {
      recentEl.innerHTML = recentStudents.map(s => `
        <div class="recent-student">
          <div class="student-info">
            <strong>${escapeHtml(s.name)}</strong>
            <span class="muted">${escapeHtml(s.rollNo)}</span>
          </div>
          <div class="student-result">
            <span class="badge ${s.status === 'Pass' ? 'success' : 'danger'}">${s.status}</span>
            <span class="cgpa">${Number(s.cgpa || 0).toFixed(2)}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

// Chart functionality removed


function openDetail(student) {
  uiState.currentStudent = student;
  const settings = getSettings();
  const branch = student.branch; const sem = student.semester;
  const subjects = ensureSubjectList(branch, sem);
  const { totalObtained, cgpa, grade, status } = computeResult(student.marks);
  const rows = subjects.map((name, i) => {
    const obtained = student.marks?.[i] ?? 0;
    const pass = obtained >= settings.passMarksPerSubject;
    return `<tr><td>${i + 1}</td><td>${escapeHtml(name)}</td><td>${obtained}</td><td>${settings.maxMarksPerSubject}</td><td>${pass ? '✔' : '✖'}</td></tr>`;
  }).join('');
  $('#detailBody').innerHTML = `
    <div class="card" style="margin-bottom: 12px;">
      <div class="grid-two">
        <div><strong>Name:</strong> ${escapeHtml(student.name)}</div>
        <div><strong>Roll No:</strong> ${escapeHtml(student.rollNo)}</div>
      </div>
      <div class="grid-two">
        <div><strong>Branch:</strong> ${escapeHtml(branch)}</div>
        <div><strong>Semester:</strong> ${escapeHtml(sem)}</div>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>#</th><th>Subject</th><th>Marks</th><th>Max</th><th>Pass</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="computed-row" style="margin-top: 12px;">
      <div><strong>Total:</strong> ${totalObtained}</div>
      <div><strong>CGPA:</strong> ${Number(cgpa).toFixed(2)}</div>
      <div><strong>Grade:</strong> ${grade}</div>
      <div><strong>Status:</strong> ${status}</div>
    </div>
  `;
  $('#detailModal').showModal();
}

function onDeleteStudent(id) {
  if (!hasPermission('manage_students')) { toast('Permission denied'); return; }
  if (!confirm('Delete this record?')) return;
  const student = store.students.find(s => s.id === id);
  if (!student || !canAccessStudent(student)) { toast('Permission denied'); return; }
  store.students = store.students.filter(s => s.id !== id);
  if (student) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || {};
    for (const [key, user] of Object.entries(users)) {
      if (user.role === 'student' && user.rollNo === student.rollNo) delete users[key];
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  save(); renderAll(); renderDashboard(); toast('Deleted');
}

function renderStats() {
  const studentsEl = document.getElementById('statStudents');
  const avgEl = document.getElementById('statAverageCgpa');
  const passEl = document.getElementById('statPassRate');
  if (!studentsEl && !avgEl && !passEl) return; // stats removed in UI
  const subset = store.students
    .filter(s => !uiState.filterBranch || s.branch === uiState.filterBranch)
    .filter(s => !uiState.filterSemester || String(s.semester) === String(uiState.filterSemester))
    .filter(s => !uiState.search || s.name.toLowerCase().includes(uiState.search) || s.rollNo.toLowerCase().includes(uiState.search));
  const total = subset.length;
  const avg = total ? (subset.reduce((a, s) => {
    const val = typeof s.cgpa === 'number' ? s.cgpa : computeResult(s.marks).cgpa;
    return a + (Number(val) || 0);
  }, 0) / total) : 0;
  const pass = total ? subset.filter(s => s.status === 'Pass').length : 0;
  if (studentsEl) studentsEl.textContent = String(total);
  if (avgEl) avgEl.textContent = Number(avg).toFixed(2);
  if (passEl) passEl.textContent = total ? Math.round(pass * 100 / total) + '%' : '0%';
}

function save() { writeStore(store); }

function clearErrors() { $$('.error').forEach(e => e.textContent = ''); }
function showError(fieldId, message) { $(`.error[data-error-for="${fieldId}"]`).textContent = message; }

function escapeHtml(str) { return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

/** Simple Auth (localStorage) **/
function guardAuth() {
  const user = getCurrentUser();
  if (!user) {
    // If login page exists and we're not on it, redirect
    if (!location.pathname.endsWith('login.html')) {
      try { new URL('login.html', location.href); location.href = 'login.html'; } catch {}
    }
    return false;
  }
  return true;
}
