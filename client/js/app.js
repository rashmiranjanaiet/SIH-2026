/* Set window.SIH_API_URL in js/config.js when this frontend is hosted separately on GitHub Pages. */
const API_BASE = window.SIH_API_URL || '';
const fallbackProblems = [
  { psId: 'SIH25001', track: 'Software', title: 'Smart Community Health Monitoring and Early Warning System for Water-Borne Diseases in Rural Northeast India', organization: 'Ministry of Development of North Eastern Region', theme: 'MedTech / HealthTech' },
  { psId: 'SIH25002', track: 'Software', title: 'Smart Tourist Safety Monitoring & Incident Response using AI, Geo-Fencing and Blockchain Digital ID', organization: 'Ministry of Development of North Eastern Region', theme: 'Travel & Tourism' },
  { psId: 'SIH25004', track: 'Software', title: 'Image-based Breed Recognition for Cattle and Buffaloes', organization: 'Ministry of Fisheries', theme: 'Agriculture' },
  { psId: 'SIH25048', track: 'Software', title: 'Gamified Learning Platform for Rural Education', organization: 'Government of Odisha', theme: 'Smart Education' },
  { psId: 'SIH25102', track: 'Software', title: 'AI-based Student Dropout Prediction & Counseling System', organization: 'Government of Rajasthan', theme: 'AI' },
  { psId: 'SIH25071', track: 'Hardware', title: 'Low-cost Smart Transportation Solution for Agricultural Produce in North East', organization: 'Ministry of DoNER', theme: 'Logistics' },
  { psId: 'SIH25072', track: 'Hardware', title: 'Solar-powered Dewatering System for Mining Operations', organization: 'Mining Sector', theme: 'Renewable Energy' },
  { psId: 'SIH25109', track: 'Hardware', title: 'Smart Agriculture Improvement System', organization: 'Agriculture Department', theme: 'Agriculture' }
];

let portalConfig = { settings: {}, problemStatements: fallbackProblems, resources: [], announcements: [] };
let problemTrack = 'All';
let showAllProblems = false;

function api(path) { return `${API_BASE}${path}`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]); }
function isAbsolute(value = '') { return /^(https?:|mailto:|#)/i.test(value); }
function publicLink(value) { return isAbsolute(value) ? value : value; }
function formatDate(date, options = { day: 'numeric', month: 'short', year: 'numeric' }) { const parsed = new Date(date); return Number.isNaN(parsed.getTime()) ? 'To be announced' : parsed.toLocaleDateString('en-IN', options); }

async function getPublicConfig() {
  try {
    const response = await fetch(api('/api/public/config'));
    if (!response.ok) throw new Error('Unable to reach the portal service.');
    portalConfig = await response.json();
  } catch (_error) {
    portalConfig = { settings: { registrationOpen: new Date(Date.now() + 48 * 3600000), registrationEnabled: false, currentStatus: 'Registration opens shortly' }, problemStatements: fallbackProblems, resources: [{ title: 'SIH 2026 Internal College Selection Booklet', category: 'Guidelines', url: 'assets/internal-selection.pdf' }], announcements: [] };
  }
}

function renderProblems() {
  const items = portalConfig.problemStatements.filter((item) => problemTrack === 'All' || item.track === problemTrack);
  const displayed = showAllProblems ? items : items.slice(0, 6);
  document.getElementById('problem-grid').innerHTML = displayed.map((item) => `
    <article class="problem-card ${item.track === 'Hardware' ? 'hardware' : ''}" data-aos="fade-up">
      <div class="problem-meta"><span>${escapeHtml(item.psId)}</span><span class="problem-track">${escapeHtml(item.track)}</span></div>
      <h3>${escapeHtml(item.title)}</h3><p><b>${escapeHtml(item.organization)}</b><br>${escapeHtml(item.theme)}</p>
    </article>`).join('') || '<p class="text-secondary">No statements match this filter.</p>';
  const button = document.getElementById('show-more-problems');
  button.style.display = items.length > 6 ? 'inline-block' : 'none';
  button.textContent = showAllProblems ? 'Show fewer statements' : `View all ${items.length} statements`;
  if (window.AOS) AOS.refreshHard();
}

function registrationMemberTemplate(index) {
  const leader = index === 0;
  const label = leader ? 'Team leader' : `Member ${index + 1}`;
  return `<section class="member-form" data-registration-member><h4>${label}${leader ? ' · login account holder' : ''}</h4><div class="row g-2">
    <div class="col-md-4"><label class="form-label">Full name *</label><input class="form-control form-control-sm" name="name" required></div>
    <div class="col-md-2"><label class="form-label">Gender *</label><select class="form-select form-select-sm" name="gender" required><option value="">Select</option><option>Male</option><option>Female</option></select></div>
    <div class="col-md-3"><label class="form-label">Email${leader ? ' *' : ' (optional)'}</label><input class="form-control form-control-sm" name="email" type="email" ${leader ? 'required' : ''}></div>
    <div class="col-md-3"><label class="form-label">Mobile (optional)</label><input class="form-control form-control-sm" name="mobile" inputmode="tel"></div>
    <div class="col-md-3"><label class="form-label">Branch (optional)</label><input class="form-control form-control-sm" name="branch" placeholder="e.g. CSE"></div>
    <div class="col-md-2"><label class="form-label">Academic year (optional)</label><select class="form-select form-select-sm" name="academicYear"><option value="">Select</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></div>
    <div class="col-md-2"><label class="form-label">Semester (optional)</label><input class="form-control form-control-sm" name="semester" placeholder="e.g. 5"></div>
    <div class="col-md-3"><label class="form-label">Registration no. (optional)</label><input class="form-control form-control-sm" name="registrationNumber"></div>
    <div class="col-md-2"><label class="form-label">Roll no. (optional)</label><input class="form-control form-control-sm" name="rollNumber"></div>
  </div></section>`;
}

function renderRegistrationForm() {
  const select = document.getElementById('registration-ps');
  select.innerHTML = portalConfig.problemStatements.map((item) => `<option value="${escapeHtml(item.psId)}">${escapeHtml(item.psId)} · ${escapeHtml(item.track)} · ${escapeHtml(item.title)}</option>`).join('');
  document.getElementById('registration-members').innerHTML = Array.from({ length: 6 }, (_value, index) => registrationMemberTemplate(index)).join('');
}

function renderResources() {
  const resources = portalConfig.resources.slice(0, 5);
  document.getElementById('resource-grid').innerHTML = resources.map((resource) => `<a class="resource-card" href="${escapeHtml(publicLink(resource.url))}" ${resource.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>
    <div><span class="file-icon">PDF</span><h3>${escapeHtml(resource.title)}</h3><small>${escapeHtml(resource.category || 'Resource')}</small></div><span class="download-arrow">Download ↗</span>
  </a>`).join('') || '<p class="text-secondary">Resources will be published by the SIH cell.</p>';
}

function renderAnnouncements() {
  const root = document.getElementById('announcement-list');
  const notices = portalConfig.announcements || [];
  root.innerHTML = notices.length ? notices.map((notice) => `<div class="notice ${escapeHtml(notice.priority)}"><h4>${escapeHtml(notice.title)}</h4><p>${escapeHtml(notice.message)}</p></div>`).join('') : '<p class="text-secondary mb-0">Updates from the SIH cell will appear here.</p>';
}

function renderTimeline(settings) {
  const events = [ ['Registration opens', settings.registrationOpen], ['Registration closes', settings.registrationClose], ['Internal evaluation', settings.evaluationDate], ['Final result', settings.finalResultDate] ];
  document.getElementById('timeline-list').innerHTML = events.map(([name, date]) => `<div class="timeline-item"><span></span><p>${name}</p><strong>${formatDate(date)}</strong></div>`).join('');
}

function startCountdown(settings) {
  const title = document.getElementById('countdown-title'); const status = document.getElementById('current-status'); const caption = document.getElementById('countdown-caption');
  status.textContent = settings.currentStatus || 'Registration opens shortly';
  const now = Date.now(); const isOpen = settings.registrationEnabled && new Date(settings.registrationClose).getTime() > now;
  const target = isOpen ? new Date(settings.registrationClose).getTime() : new Date(settings.registrationOpen).getTime();
  title.textContent = 'Timer';
  caption.textContent = isOpen ? 'Submit your profile before the registration window closes.' : 'The timetable is published and controlled by the SIH cell.';
  const update = () => {
    let distance = Math.max(0, target - Date.now());
    const values = [Math.floor(distance / 86400000), Math.floor((distance % 86400000) / 3600000), Math.floor((distance % 3600000) / 60000), Math.floor((distance % 60000) / 1000)];
    ['days', 'hours', 'minutes', 'seconds'].forEach((id, index) => { document.getElementById(id).textContent = String(values[index]).padStart(2, '0'); });
  };
  update(); window.setInterval(update, 1000);
}

function message(rootId, text, kind = 'error') { const root = document.getElementById(rootId); root.textContent = text; root.className = `form-message ${kind}`; }
function saveSession(data) { localStorage.setItem('sih_token', data.token); localStorage.setItem('sih_user', JSON.stringify(data.user)); }

async function login(event) {
  event.preventDefault(); const form = event.currentTarget; const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
  try {
    const response = await fetch(api('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Could not log in.');
    saveSession(data); message('login-message', 'Signed in. Opening your dashboard…', 'success'); window.setTimeout(() => { window.location.href = 'dashboard.html'; }, 450);
  } catch (error) { message('login-message', error.message); submit.disabled = false; }
}

async function register(event) {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const submit = form.querySelector('[type="submit"]');
  const members = [...form.querySelectorAll('[data-registration-member]')].map((element) => Object.fromEntries([...element.querySelectorAll('input,select')].map((input) => [input.name, input.value.trim ? input.value.trim() : input.value])));
  if (members.length !== 6) return message('register-message', 'Exactly six team members are required.');
  const femaleCount = members.filter((member) => member.gender === 'Female').length;
  const maleCount = members.filter((member) => member.gender === 'Male').length;
  if (femaleCount !== 1 || maleCount !== 5) return message('register-message', 'Select exactly one Female member and five Male members.');
  data.set('members', JSON.stringify(members)); submit.disabled = true;
  try {
    const response = await fetch(api('/api/auth/register'), { method: 'POST', body: data }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Registration could not be submitted.');
    saveSession(payload); message('register-message', 'Registration submitted. Opening your dashboard…', 'success'); window.setTimeout(() => { window.location.href = 'dashboard.html'; }, 550);
  } catch (error) { message('register-message', error.message); submit.disabled = false; }
}

function setupEasterEgg() {
  let clicks = 0; let reset;
  document.getElementById('sih-logo-trigger').addEventListener('click', () => {
    clicks += 1; window.clearTimeout(reset); reset = window.setTimeout(() => { clicks = 0; }, 7000);
    if (clicks === 30) {
      clicks = 0; if (window.confetti) { const duration = 1800; const until = Date.now() + duration; const fire = () => { confetti({ particleCount: 8, spread: 75, origin: { y: .58 }, colors: ['#0756a4','#0a873f','#f28b00','#ffffff'] }); if (Date.now() < until) requestAnimationFrame(fire); }; fire(); }
      const badge = document.querySelector('.status-pill'); badge.innerHTML = '<span class="status-live"></span> Innovation Never Stops 🚀'; badge.style.transform = 'scale(1.08)'; window.setTimeout(() => { badge.style.transform = ''; }, 900);
    }
  });
}

async function initialise() {
  if (window.AOS) AOS.init({ duration: 700, once: true, offset: 40 });
  await getPublicConfig();
  renderProblems(); renderRegistrationForm(); renderAnnouncements(); startCountdown(portalConfig.settings || {});
  document.querySelectorAll('.filter-btn').forEach((button) => button.addEventListener('click', () => { problemTrack = button.dataset.track; showAllProblems = false; document.querySelectorAll('.filter-btn').forEach((item) => item.classList.toggle('active', item === button)); renderProblems(); }));
  document.getElementById('show-more-problems').addEventListener('click', () => { showAllProblems = !showAllProblems; renderProblems(); });
  document.getElementById('login-form').addEventListener('submit', login); document.getElementById('register-form').addEventListener('submit', register); setupEasterEgg();
  window.addEventListener('scroll', () => document.querySelector('.nav-glass').classList.toggle('scrolled', window.scrollY > 30), { passive: true });
  document.body.classList.add('loaded');
}
document.addEventListener('DOMContentLoaded', initialise);
