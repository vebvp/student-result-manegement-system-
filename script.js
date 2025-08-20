// SRMS - Student Result Management System (Frontend only)
// Data is stored in localStorage under the key SRMS_DATA

const STORAGE_KEY = 'SRMS_DATA_V1';
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

const MAX_MARKS_PER_SUBJECT = 100;
const PASS_MARKS_PER_SUBJECT = 35;

/** Utilities **/
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function readStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data || typeof data !== 'object') throw new Error('no data');
    // Normalize
    return {
      students: Array.isArray(data.students) ? data.students : [],
      subjects: data.subjects && typeof data.subjects === 'object' ? data.subjects : deepClone(DEFAULT_SUBJECTS)
    };
  } catch {
    return { students: [], subjects: deepClone(DEFAULT_SUBJECTS) };
  }
}

function writeStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function generateId() { return Math.random().toString(36).slice(2, 10); }

function getSemestersForBranch(branch) {
  return branch === 'BCA' ? 6 : branch === 'MCA' ? 4 : 0;
}

function gradePointFromMarks(marks) {
  const m = Number(marks) || 0;
  if (m >= 90) return 10;
  if (m >= 80) return 9;
  if (m >= 70) return 8;
  if (m >= 60) return 7;
  if (m >= 50) return 6;
  if (m >= 40) return 5;
  return 0;
}

function gradeFromCgpa(cgpa) {
  if (cgpa >= 9) return 'A+';
  if (cgpa >= 8) return 'A';
  if (cgpa >= 7) return 'B+';
  if (cgpa >= 6) return 'B';
  if (cgpa >= 5) return 'C';
  if (cgpa > 0) return 'D';
  return 'F';
}

function computeResult(subjectMarks) {
  const totalMax = subjectMarks.length * MAX_MARKS_PER_SUBJECT;
  const totalObtained = subjectMarks.reduce((acc, m) => acc + (Number(m) || 0), 0);
  const gradePoints = subjectMarks.map(gradePointFromMarks);
  const cgpa = gradePoints.length ? +(gradePoints.reduce((a, g) => a + g, 0) / gradePoints.length).toFixed(2) : 0;
  const hasBack = subjectMarks.some(m => (Number(m) || 0) < PASS_MARKS_PER_SUBJECT);
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
  $('#year').textContent = new Date().getFullYear();
  setupThemeToggle();
  guardAuth();
  bindFilters();
  bindHeaderActions();
  bindModals();
  renderAll();
});

function setupThemeToggle() {
  const btn = $('#themeToggle');
  const THEME_KEY = 'SRMS_THEME';
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) apply(saved);
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'auto';
    const next = current === 'dark' ? 'light' : current === 'light' ? 'auto' : 'dark';
    apply(next); localStorage.setItem(THEME_KEY, next);
  });
}

function bindHeaderActions() {
  $('#printBtn')?.addEventListener('click', () => window.print());
  $('#logoutBtn').addEventListener('click', () => { localStorage.removeItem('SRMS_SESSION'); location.href = 'login.html'; });
  $('#clearAllBtn').addEventListener('click', () => {
    if (confirm('This will remove all students and custom subjects. Continue?')) {
      store = { students: [], subjects: deepClone(DEFAULT_SUBJECTS) };
      writeStore(store); renderAll(); toast('All data cleared');
    }
  });
}

// export/import removed per request

function bindFilters() {
  const branchSel = $('#branchFilter');
  const semSel = $('#semesterFilter');
  branchSel.addEventListener('change', () => {
    uiState.filterBranch = branchSel.value;
    populateSemesters(semSel, branchSel.value, true);
    semSel.value = '';
    renderTable(); renderStats();
  });
  semSel.addEventListener('change', () => { uiState.filterSemester = semSel.value; renderTable(); renderStats(); });
  $('#searchInput').addEventListener('input', (e) => { uiState.search = e.target.value.trim().toLowerCase(); renderTable(); });
}

function populateSemesters(selectEl, branch, includeAll) {
  selectEl.innerHTML = '';
  if (!branch) { selectEl.disabled = true; selectEl.append(new Option(includeAll ? 'All' : 'Select', '')); return; }
  const total = getSemestersForBranch(branch);
  selectEl.disabled = false;
  if (includeAll) selectEl.append(new Option('All', ''));
  for (let i = 1; i <= total; i++) selectEl.append(new Option(`Semester ${i}`, String(i)));
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

  // Import Modal
  // removed
}

function openStudentModal(student) {
  uiState.editingId = student ? student.id : null;
  $('#studentModalTitle').textContent = student ? 'Edit Student Result' : 'Add Student Result';
  $('#studentName').value = student?.name || '';
  $('#rollNo').value = student?.rollNo || '';
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
  const branch = $('#studentBranch').value; const sem = $('#studentSemester').value;
  const container = $('#subjectsContainer'); container.innerHTML = '';
  if (!branch || !sem) { updateComputedRow(); return; }
  const subjectList = ensureSubjectList(branch, sem);
  if (subjectList.length < 3) toast('Tip: Add at least 3 subjects for this semester');
  subjectList.forEach((name, index) => {
    const row = document.createElement('div'); row.className = 'subject-row';
    row.innerHTML = `
      <input type="text" value="${name}" data-type="name" disabled />
      <input type="number" min="0" max="${MAX_MARKS_PER_SUBJECT}" placeholder="Marks" data-type="mark" />
      <input type="number" value="${MAX_MARKS_PER_SUBJECT}" disabled />
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
  const name = $('#studentName').value.trim();
  const rollNo = $('#rollNo').value.trim();
  const branch = $('#studentBranch').value;
  const semester = $('#studentSemester').value;
  const marks = $$('#subjectsContainer input[data-type="mark"]').map(i => {
    const v = Number(i.value);
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), MAX_MARKS_PER_SUBJECT) : 0;
  });

  let valid = true;
  if (!name) { showError('studentName', 'Name is required'); valid = false; }
  if (!rollNo) { showError('rollNo', 'Roll number is required'); valid = false; }
  if (!branch) { showError('studentBranch', 'Select branch'); valid = false; }
  if (!semester) { showError('studentSemester', 'Select semester'); valid = false; }
  if (marks.length === 0) { showError('subjects', 'No subjects configured for this semester'); valid = false; }

  if (!valid) return;

  const { cgpa, grade, status } = computeResult(marks);
  const payload = { id: uiState.editingId || generateId(), name, rollNo, branch, semester, marks, cgpa, grade, status };
  const idx = store.students.findIndex(s => s.id === payload.id);
  if (idx >= 0) store.students[idx] = payload; else store.students.push(payload);
  save();
  $('#studentModal').close();
  renderAll();
  toast(idx >= 0 ? 'Student updated' : 'Student added');
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

function renderAll() {
  renderTable();
  renderStats();
}

function renderTable() {
  const tbody = $('#studentsTable tbody');
  tbody.innerHTML = '';
  const rows = store.students
    .filter(s => !uiState.filterBranch || s.branch === uiState.filterBranch)
    .filter(s => !uiState.filterSemester || String(s.semester) === String(uiState.filterSemester))
    .filter(s => !uiState.search || s.name.toLowerCase().includes(uiState.search) || s.rollNo.toLowerCase().includes(uiState.search))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.colSpan = 8; td.className = 'muted'; td.textContent = 'No records';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  for (const s of rows) {
    const tr = document.createElement('tr');
    const effectiveCgpa = typeof s.cgpa === 'number' ? s.cgpa : computeResult(s.marks).cgpa;
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
        <button class="btn btn-outline" data-act="edit">Edit</button>
        <button class="btn btn-danger btn-ghost" data-act="delete">Delete</button>
      </td>
    `;
    tr.querySelector('[data-act="view"]').addEventListener('click', () => openDetail(s));
    tr.querySelector('[data-act="edit"]').addEventListener('click', () => openStudentModal(s));
    tr.querySelector('[data-act="delete"]').addEventListener('click', () => onDeleteStudent(s.id));
    tbody.appendChild(tr);
  }
}

function openDetail(student) {
  const branch = student.branch; const sem = student.semester;
  const subjects = ensureSubjectList(branch, sem);
  const { totalObtained, cgpa, grade, status } = computeResult(student.marks);
  const rows = subjects.map((name, i) => {
    const obtained = student.marks?.[i] ?? 0;
    const pass = obtained >= PASS_MARKS_PER_SUBJECT;
    return `<tr><td>${i + 1}</td><td>${escapeHtml(name)}</td><td>${obtained}</td><td>${MAX_MARKS_PER_SUBJECT}</td><td>${pass ? '✔' : '✖'}</td></tr>`;
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
  $('#statStudents').textContent = String(total);
  const avgEl = document.getElementById('statAverageCgpa');
  if (avgEl) avgEl.textContent = Number(avg).toFixed(2);
  $('#statPassRate').textContent = total ? Math.round(pass * 100 / total) + '%' : '0%';
}

function save() { writeStore(store); }

function clearErrors() { $$('.error').forEach(e => e.textContent = ''); }
function showError(fieldId, message) { $(`.error[data-error-for="${fieldId}"]`).textContent = message; }

function escapeHtml(str) { return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

/** Simple Auth (localStorage) **/
function guardAuth() {
  const session = localStorage.getItem('SRMS_SESSION');
  if (!session) {
    // If login page exists and we're not on it, redirect
    if (!location.pathname.endsWith('login.html')) {
      try { new URL('login.html', location.href); location.href = 'login.html'; } catch {}
    }
  }
}


