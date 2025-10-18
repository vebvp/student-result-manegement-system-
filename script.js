// SRMS - Student Result Management System (Frontend only)
// Data is stored in localStorage under the key SRMS_DATA

const STORAGE_KEY = 'SRMS_DATA_V2';
const USERS_KEY = 'SRMS_USERS_V2';
const SESSION_KEY = 'SRMS_SESSION_V2';
const SETTINGS_KEY = 'SRMS_SETTINGS_V2';

// Default users with roles
const DEFAULT_USERS = {
  admin: { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
  teacher: { username: 'teacher', password: 'teacher123', role: 'teacher', name: 'John Teacher', assignedBranches: ['BCA', 'MCA'] }
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

// Initialize users if not exists
function initializeUsers() {
  try {
    const existing = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
    if (!existing) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    } else {
      // Remove any default student account if it exists
      if (existing.student) {
        delete existing.student;
        localStorage.setItem(USERS_KEY, JSON.stringify(existing));
      }
      
      // Clear old structure if needed
      const hasOldStructure = existing.teacher1 || existing.student1;
      if (hasOldStructure) {
        console.log('Migrating user data to new structure...');
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      }
    }
  } catch (error) {
    console.error('Error initializing users:', error);
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
  
  // Ensure default student record exists
  ensureDefaultStudentRecord();
}

// Ensure default student record exists for student user
function ensureDefaultStudentRecord() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data || !data.students || data.students.length === 0) {
      // Initialize with Vaibhav's record
      const newData = {
        students: [{
          id: generateId(),
          name: 'Vaibhav Sanjay Patil',
          rollNo: 'BCA23-001',
          branch: 'BCA',
          semester: '1',
          marks: [85, 90, 88, 92, 87],
          cgpa: 9.2,
          grade: 'A+',
          status: 'Pass',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        subjects: deepClone(DEFAULT_SUBJECTS),
        branches: deepClone(DEFAULT_BRANCHES)
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      store = newData; // Update current store
    }
  } catch (error) {
    console.error('Error ensuring default student record:', error);
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
    return users[session.username] || null;
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
    return user.rollNo === student.rollNo;
  }
  return false;
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
      students: Array.isArray(data.students) ? data.students : [],
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
  const m = Number(marks) || 0;
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
  guardAuth();
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
  $('#managePasswordsBtn')?.addEventListener('click', () => {
    if (!hasPermission('manage_users')) {
      showMessage('Permission denied', 'error');
      return;
    }
    renderPasswordManagementTable();
    $('#passwordManagementModal').showModal();
  });
  $('#clearAllBtn').addEventListener('click', () => {
    if (!hasPermission('manage_students')) {
      showMessage('Permission denied', 'error');
      return;
    }
    if (confirm('This will remove all students and custom subjects. Continue?')) {
      store = { students: [], subjects: deepClone(DEFAULT_SUBJECTS), branches: deepClone(DEFAULT_BRANCHES) };
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
    students = students.filter(s => s.rollNo === user.rollNo);
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

// PDF Export
function exportToPDF(student) {
  const settings = getSettings();
  const branch = student.branch;
  const sem = student.semester;
  const subjects = ensureSubjectList(branch, sem);
  const { totalObtained, cgpa, grade, status } = computeResult(student.marks);
  
  // Create a temporary div for the PDF content
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: 'Times New Roman', serif; padding: 20px; color: #000000;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #000000;">Student Result Management System</h1>
        <h2 style="margin: 10px 0; font-size: 20px; color: #000000;">Result Certificate</h2>
      </div>
      
      <div style="margin-bottom: 30px; font-size: 14px;">
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="padding: 5px 0;"><strong>Name:</strong> ${student.name}</td>
            <td style="padding: 5px 0;"><strong>Roll No:</strong> ${student.rollNo}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Branch:</strong> ${branch}</td>
            <td style="padding: 5px 0;"><strong>Semester:</strong> ${sem}</td>
          </tr>
        </table>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 10px; text-align: left; background-color: #e0e0e0; color: #000000;">Subject</th>
            <th style="border: 1px solid #000; padding: 10px; text-align: center; background-color: #e0e0e0; color: #000000;">Marks Obtained</th>
            <th style="border: 1px solid #000; padding: 10px; text-align: center; background-color: #e0e0e0; color: #000000;">Maximum Marks</th>
            <th style="border: 1px solid #000; padding: 10px; text-align: center; background-color: #e0e0e0; color: #000000;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((name, i) => {
            const obtained = student.marks[i] || 0;
            const pass = obtained >= settings.passMarksPerSubject;
            return `
              <tr>
                <td style="border: 1px solid #000; padding: 8px; color: #000000;">${name}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; color: #000000;">${obtained}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; color: #000000;">${settings.maxMarksPerSubject}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; color: #000000; font-weight: ${pass ? 'bold' : 'normal'};">
                  ${pass ? 'Pass' : 'Fail'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 30px; border-top: 1px solid #000; padding-top: 20px; font-size: 14px;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0;"><strong>Total Marks:</strong> ${totalObtained}</td>
            <td style="padding: 5px 0;"><strong>CGPA:</strong> ${cgpa.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Grade:</strong> ${grade}</td>
            <td style="padding: 5px 0;"><strong>Status:</strong> <span style="font-weight: bold; color: ${status === 'Pass' ? '#007700' : '#CC0000'}">${status}</span></td>
          </tr>
        </table>
      </div>
    </div>
  `;

  // PDF options
  const opt = {
    margin: 15,
    filename: `${student.rollNo}_result.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { 
      scale: 3,
      useCORS: true,
      letterRendering: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      compress: true
    }
  };
  
  // Generate PDF with improved quality
  html2pdf().from(element).set(opt).save();

  // Generate PDF
  html2pdf().from(element).set(opt).save();
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
  
  if (!hasPermission('manage_students')) {
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
        store.students = data.students;
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
    const currentUser = users[user.username];
    
    if (!currentUser || currentUser.password !== currentPassword) {
      showError('currentPassword', 'Current password is incorrect');
      return;
    }
    
    // Update password
    currentUser.password = newPassword;
    users[user.username] = currentUser;
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
  const marks = $$('#subjectsContainer input[data-type="mark"]').map(i => {
    const v = Number(i.value);
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), settings.maxMarksPerSubject) : 0;
  });

  let valid = true;
  
  // Enhanced validation with full name requirement
  if (!name) { 
    showError('studentName', 'Name is required'); 
    valid = false; 
  } else {
    // Split name into parts and check for first, middle, and last name
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 3) {
      showError('studentName', 'Please enter full name (First Name, Middle Name, and Last Name)');
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
    createdAt: uiState.editingId ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const idx = store.students.findIndex(s => s.id === payload.id);
  if (idx >= 0) {
    store.students[idx] = payload;
  } else {
    store.students.push(payload);
    // Create student login account
    try {
      // Get existing users first
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || DEFAULT_USERS;
      
      // Create username and password
      const username = name; // full name as username
      const password = name.toLowerCase().replace(/\s+/g, '') + '123';
      
      // Create the new user object
      const newUser = {
        username: username,
        password: password,
        role: 'student',
        name: name,
        rollNo: rollNo
      };
      
      // Add to users object
      users[username] = newUser;
      
      // Save back to localStorage
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      // Log for debugging
      console.log('Created student account:', username);
      console.log('Current users:', Object.keys(users));
      
      // Show credentials to teacher/admin
      const message = 
        'Student login credentials created:\n\n' +
        `Username: ${username}\n` +
        `Password: ${password}\n\n` +
        'Please share these with the student.\n\n' +
        'IMPORTANT: Use the EXACT username shown above to login.';
      alert(message);
    } catch (error) {
      console.error('Error creating student account:', error);
    }
  }
  save();
  $('#studentModal').close();
  renderAll();
  renderDashboard();
  
  toast(idx >= 0 ? 'Student updated' : 'Student account created');
}

function onSubjectsSubmit(e) {
  e.preventDefault();
  clearErrors();
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
      rows = rows.filter(s => s.rollNo === user.rollNo);
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
      <td>${s.branch}</td>
      <td>${s.semester}</td>
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
    students = students.filter(s => s.rollNo === user.rollNo);
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
  
  // Render recent students
  const recentStudents = students
    .sort((a, b) => new Date(b.id) - new Date(a.id))
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
            <span class="muted">${s.rollNo}</span>
          </div>
          <div class="student-result">
            <span class="badge ${s.status === 'Pass' ? 'success' : 'danger'}">${s.status}</span>
            <span class="cgpa">${s.cgpa?.toFixed(2)}</span>
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
        <div><strong>Branch:</strong> ${branch}</div>
        <div><strong>Semester:</strong> ${sem}</div>
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
  if (!confirm('Delete this record?')) return;
  store.students = store.students.filter(s => s.id !== id);
  save(); renderAll(); toast('Deleted');
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

// Password Management Functions
function renderPasswordManagementTable() {
  const searchQuery = $('#studentPasswordSearch')?.value.toLowerCase() || '';
  const tbody = $('#studentPasswordsTable tbody');
  if (!tbody) return;

  // Get all users
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || {};
  
  // Filter student users and match search query
  const studentUsers = Object.values(users).filter(user => 
    user.role === 'student' && 
    (searchQuery === '' || 
     user.name.toLowerCase().includes(searchQuery) || 
     (user.rollNo && user.rollNo.toLowerCase().includes(searchQuery)))
  );

  tbody.innerHTML = '';
  
  if (studentUsers.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="muted">No students found</td>`;
    tbody.appendChild(tr);
    return;
  }

  studentUsers.sort((a, b) => a.name.localeCompare(b.name)).forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.rollNo || '')}</td>
      <td>${escapeHtml(user.username)}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="password" value="${escapeHtml(user.password)}" 
                 id="pwd_${escapeHtml(user.username)}" readonly 
                 style="width: 120px; padding: 4px;">
          <button class="btn btn-outline btn-sm" 
                  onclick="togglePasswordVisibility('${escapeHtml(user.username)}')">
            👁️
          </button>
        </div>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" 
                onclick="resetStudentPassword('${escapeHtml(user.username)}')">
          Reset Password
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function togglePasswordVisibility(username) {
  const pwdField = document.getElementById(`pwd_${username}`);
  if (pwdField) {
    if (pwdField.type === 'password') {
      pwdField.type = 'text';
    } else {
      pwdField.type = 'password';
    }
  }
}

function resetStudentPassword(username) {
  try {
    if (!confirm('Are you sure you want to reset this student\'s password?')) {
      return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null') || {};
    const user = users[username];
    
    if (!user || user.role !== 'student') {
      showMessage('Student not found', 'error');
      return;
    }

    // Generate new password (username without spaces + 123)
    const newPassword = username.toLowerCase().replace(/\s+/g, '') + '123';
    user.password = newPassword;
    
    // Save changes
    users[username] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Refresh the table to show new password
    renderPasswordManagementTable();
    
    // Show success message with new credentials
    const message = 
      'Password reset successful!\n\n' +
      `Username: ${username}\n` +
      `New Password: ${newPassword}\n\n` +
      'Please share these credentials with the student.';
    alert(message);
    
  } catch (error) {
    console.error('Error resetting password:', error);
    showMessage('Error resetting password', 'error');
  }
}

// Bind search input for password management
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = $('#studentPasswordSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      renderPasswordManagementTable();
    }, 300));
  }
});

/** Simple Auth (localStorage) **/
function guardAuth() {
  const user = getCurrentUser();
  if (!user) {
    // If login page exists and we're not on it, redirect
    if (!location.pathname.endsWith('login.html')) {
      try { new URL('login.html', location.href); location.href = 'login.html'; } catch {}
    }
  }
}


