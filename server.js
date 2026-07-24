require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === 'production';
const databaseUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const clientOrigins = (process.env.CLIENT_URL || `http://localhost:${PORT}`)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (process.env.CLOUDINARY_URL) cloudinary.config({ secure: true });

const PROBLEM_STATEMENTS = [
  { psId: 'SIH25001', track: 'Software', title: 'Smart Community Health Monitoring and Early Warning System for Water-Borne Diseases in Rural Northeast India', organization: 'Ministry of Development of North Eastern Region', theme: 'MedTech / HealthTech' },
  { psId: 'SIH25002', track: 'Software', title: 'Smart Tourist Safety Monitoring & Incident Response using AI, Geo-Fencing and Blockchain Digital ID', organization: 'Ministry of Development of North Eastern Region', theme: 'Travel & Tourism' },
  { psId: 'SIH25004', track: 'Software', title: 'Image-based Breed Recognition for Cattle and Buffaloes', organization: 'Ministry of Fisheries', theme: 'Agriculture' },
  { psId: 'SIH25005', track: 'Software', title: 'Image-based Animal Type Classification for Cattle and Buffaloes', organization: 'Ministry of Fisheries', theme: 'Agriculture' },
  { psId: 'SIH25048', track: 'Software', title: 'Gamified Learning Platform for Rural Education', organization: 'Government of Odisha', theme: 'Smart Education' },
  { psId: 'SIH25049', track: 'Software', title: 'AI-driven Public Health Chatbot for Disease Awareness', organization: 'Government of Odisha', theme: 'HealthTech' },
  { psId: 'SIH25050', track: 'Software', title: 'Smart Traffic Management System for Urban Congestion', organization: 'Government of Odisha', theme: 'Transportation' },
  { psId: 'SIH25101', track: 'Software', title: 'Remote Classroom for Rural Colleges', organization: 'Government of Rajasthan', theme: 'Education' },
  { psId: 'SIH25102', track: 'Software', title: 'AI-based Student Dropout Prediction & Counseling System', organization: 'Government of Rajasthan', theme: 'AI' },
  { psId: 'SIH25103', track: 'Software', title: 'ERP-based Integrated Student Management System', organization: 'Government of Rajasthan', theme: 'Smart Automation' },
  { psId: 'SIH25071', track: 'Hardware', title: 'Low-cost Smart Transportation Solution for Agricultural Produce in North East', organization: 'Ministry of DoNER', theme: 'Logistics' },
  { psId: 'SIH25072', track: 'Hardware', title: 'Solar-powered Dewatering System for Mining Operations', organization: 'Mining Sector', theme: 'Renewable Energy' },
  { psId: 'SIH25109', track: 'Hardware', title: 'Smart Agriculture Improvement System', organization: 'Agriculture Department', theme: 'Agriculture' },
  { psId: 'SIH25115', track: 'Hardware', title: 'Water-borne Disease Management in Rural Areas', organization: 'Health', theme: 'HealthTech' },
  { psId: 'MHA-HW-01', track: 'Hardware', title: 'Extreme Weather Surveillance System', organization: 'Ministry of Home Affairs', theme: 'Disaster Management' },
  { psId: 'MHA-HW-02', track: 'Hardware', title: 'Satellite-integrated Handheld Radio', organization: 'Ministry of Home Affairs', theme: 'Communication' },
  { psId: 'MOA-HW-01', track: 'Hardware', title: 'Crop Maturity Prediction Device', organization: 'Ministry of Agriculture', theme: 'Agriculture' },
  { psId: 'MOA-HW-02', track: 'Hardware', title: 'Low-cost Cotton Picking Machine', organization: 'Ministry of Agriculture', theme: 'Agriculture' },
  { psId: 'MOA-HW-03', track: 'Hardware', title: 'Advanced Jute Retting Machine', organization: 'Ministry of Agriculture', theme: 'Agriculture' },
  { psId: 'OD-HW-01', track: 'Hardware', title: 'Renewable Energy Monitoring System for Microgrids', organization: 'Government of Odisha', theme: 'Renewable Energy' },
  { psId: 'MHA-HW-03', track: 'Hardware', title: 'Autonomous AI Drone for Border Surveillance, Disaster Response, and Search & Rescue Operations', organization: 'Ministry of Home Affairs', theme: 'Autonomous Systems / Robotics' },
  { psId: 'MEITY-HW-01', track: 'Hardware', title: 'AI-based Cyber Threat Detection and Autonomous Network Attack Blocking System for Critical Infrastructure', organization: 'MeitY', theme: 'Cyber Security' }
];

const DEFAULT_SETTINGS = {
  registrationOpen: new Date(Date.now() + 48 * 60 * 60 * 1000),
  registrationClose: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  evaluationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
  presentationDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
  finalResultDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
  registrationEnabled: false,
  currentStatus: 'Registration opens shortly'
};

const DEFAULT_RESOURCES = [
  { title: 'SIH 2026 Internal College Selection Booklet', category: 'Guidelines', url: '/assets/internal-selection.pdf', isPublic: true },
  { title: 'Problem Statements', category: 'Problem Statements', url: '#problem-statements', isPublic: true },
  { title: 'Presentation Template', category: 'Templates', url: '#contact', isPublic: true },
  { title: 'Evaluation Criteria', category: 'Evaluation', url: '#rules', isPublic: true },
  { title: 'Team Authorization Format', category: 'Templates', url: '#contact', isPublic: true }
];

const { Schema } = mongoose;
const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'], required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  branch: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, unique: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  address: { type: String, default: '', trim: true, maxlength: 300 },
  linkedIn: { type: String, default: '', trim: true },
  github: { type: String, default: '', trim: true },
  photoUrl: { type: String, default: '' },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
  registrationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  lastLoginAt: Date
}, { timestamps: true });

const teamMemberSchema = new Schema({
  name: { type: String, required: true, trim: true },
  gender: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  branch: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true, trim: true },
  semester: { type: String, default: '', trim: true },
  registrationNumber: { type: String, default: '', trim: true },
  rollNumber: { type: String, default: '', trim: true },
  roleSkill: { type: String, default: '', trim: true }
}, { _id: false });

const teamSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  leader: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  members: { type: [teamMemberSchema], required: true, validate: [(members) => members.length === 5, 'A team must have exactly 5 members.'] },
  problem: {
    psId: { type: String, required: true },
    title: { type: String, required: true },
    track: { type: String, enum: ['Software', 'Hardware'], required: true },
    theme: { type: String, default: '' }
  },
  facultyMentor: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'revision_required', 'qualified'], default: 'pending', index: true },
  adminNote: { type: String, default: '', trim: true, maxlength: 500 }
}, { timestamps: true });

const settingsSchema = new Schema({
  registrationOpen: Date,
  registrationClose: Date,
  evaluationDate: Date,
  presentationDate: Date,
  finalResultDate: Date,
  registrationEnabled: Boolean,
  currentStatus: String
}, { timestamps: true });

const resourceSchema = new Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'Guidelines' },
  url: { type: String, required: true },
  publicId: String,
  isPublic: { type: Boolean, default: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const announcementSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 130 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  isPublished: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const scoreSchema = new Schema({
  problemUnderstanding: { type: Number, min: 0, max: 15, default: 0 },
  innovation: { type: Number, min: 0, max: 20, default: 0 },
  technicalFeasibility: { type: Number, min: 0, max: 20, default: 0 },
  prototypeReadiness: { type: Number, min: 0, max: 20, default: 0 },
  impact: { type: Number, min: 0, max: 15, default: 0 },
  presentation: { type: Number, min: 0, max: 10, default: 0 }
}, { _id: false });

const evaluationSchema = new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  judge: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scores: { type: scoreSchema, required: true },
  total: { type: Number, required: true, min: 0, max: 100 },
  remarks: { type: String, default: '', maxlength: 1000 },
  decision: { type: String, enum: ['qualified', 'revision_required', 'not_qualified'], default: 'revision_required' }
}, { timestamps: true });
evaluationSchema.index({ team: 1, judge: 1 }, { unique: true });

const activitySchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  detail: { type: String, default: '' },
  ip: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Team = mongoose.model('Team', teamSchema);
const Settings = mongoose.model('Settings', settingsSchema);
const Resource = mongoose.model('Resource', resourceSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const Evaluation = mongoose.model('Evaluation', evaluationSchema);
const Activity = mongoose.model('Activity', activitySchema);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    callback(allowed.includes(file.mimetype) ? null : new Error('Only JPG, PNG, WebP, or PDF files are allowed.'), allowed.includes(file.mimetype));
  }
});

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS. Add it to CLIENT_URL.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 400, standardHeaders: 'draft-8', legacyHeaders: false }));

const sendValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: 'Please correct the highlighted information.', errors: errors.array() });
  return next();
};

const requireDatabase = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'The database is not connected. Configure MONGODB_URI and redeploy.' });
  return next();
};

function signToken(user) {
  if (!jwtSecret) throw new Error('JWT_SECRET is not configured.');
  return jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: '8h', issuer: 'aryan-sih-portal' });
}

async function authenticate(req, res, next) {
  try {
    if (!jwtSecret) return res.status(503).json({ message: 'JWT authentication is not configured.' });
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication is required.' });
    const payload = jwt.verify(token, jwtSecret, { issuer: 'aryan-sih-portal' });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'This account no longer exists.' });
    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

const allow = (...roles) => (req, res, next) => roles.includes(req.user.role)
  ? next()
  : res.status(403).json({ message: 'You do not have permission to access this resource.' });

async function logActivity(req, action, detail = '') {
  if (mongoose.connection.readyState === 1) {
    await Activity.create({ actor: req.user?._id, action, detail, ip: req.ip }).catch(() => undefined);
  }
}

async function uploadToCloudinary(file, folder, resourceType = 'auto') {
  if (!process.env.CLOUDINARY_URL) throw Object.assign(new Error('Cloudinary is not configured. Ask the administrator to add CLOUDINARY_URL.'), { statusCode: 503 });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(file.buffer);
  });
}

function publicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    gender: user.gender,
    email: user.email,
    mobile: user.mobile,
    department: user.department,
    branch: user.branch,
    academicYear: user.academicYear,
    semester: user.semester,
    registrationNumber: user.registrationNumber,
    rollNumber: user.rollNumber,
    address: user.address,
    linkedIn: user.linkedIn,
    github: user.github,
    photoUrl: user.photoUrl,
    role: user.role,
    registrationStatus: user.registrationStatus,
    createdAt: user.createdAt
  };
}

function calculateTotal(scores = {}) {
  const values = ['problemUnderstanding', 'innovation', 'technicalFeasibility', 'prototypeReadiness', 'impact', 'presentation'];
  return values.reduce((total, key) => total + Number(scores[key] || 0), 0);
}

async function getSettings() {
  return Settings.findOne().lean() || DEFAULT_SETTINGS;
}

function addedResources(databaseResources) {
  const urls = new Set(databaseResources.map((item) => item.url));
  return [...databaseResources, ...DEFAULT_RESOURCES.filter((item) => !urls.has(item.url))];
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'not_connected', timestamp: new Date().toISOString() }));

app.get('/api/public/config', async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ settings: DEFAULT_SETTINGS, problemStatements: PROBLEM_STATEMENTS, resources: DEFAULT_RESOURCES, announcements: [] });
    const [settings, resources, announcements] = await Promise.all([
      getSettings(),
      Resource.find({ isPublic: true }).sort({ createdAt: -1 }).lean(),
      Announcement.find({ isPublished: true }).sort({ createdAt: -1 }).limit(6).lean()
    ]);
    return res.json({ settings, problemStatements: PROBLEM_STATEMENTS, resources: addedResources(resources), announcements });
  } catch (error) { return next(error); }
});

const teamRegistrationValidation = [
  body('leaderPassword').isLength({ min: 8, max: 72 }),
  body('members').notEmpty()
];

app.post('/api/auth/register', requireDatabase, upload.single('photo'), teamRegistrationValidation, sendValidationErrors, async (req, res, next) => {
  let user;
  try {
    let members;
    try { members = typeof req.body.members === 'string' ? JSON.parse(req.body.members) : req.body.members; } catch (_error) { return res.status(422).json({ message: 'The team member details could not be read.' }); }
    if (!Array.isArray(members) || members.length !== 5) return res.status(422).json({ message: 'Each SIH team must contain exactly five members.' });
    const reference = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
    const text = (value, fallback = 'Not provided') => String(value || '').trim() || fallback;
    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    const completedMembers = members.map((member, index) => {
      const value = member && typeof member === 'object' ? member : {};
      const suppliedEmail = String(value.email || '').trim().toLowerCase();
      return {
        name: text(value.name, index === 0 ? 'Team Leader' : `Member ${index + 1}`),
        gender: allowedGenders.includes(value.gender) ? value.gender : 'Prefer not to say',
        email: suppliedEmail || `not-provided-${reference}-${index + 1}@pending.aryan.local`,
        mobile: text(value.mobile), branch: text(value.branch), academicYear: text(value.academicYear), semester: text(value.semester),
        registrationNumber: text(value.registrationNumber, `PENDING-${reference}-${index + 1}`), rollNumber: text(value.rollNumber)
      };
    });
    if (!completedMembers.some((member) => member.gender === 'Female')) return res.status(422).json({ message: 'Select Female for at least one of the five members.' });
    const selected = PROBLEM_STATEMENTS.find((item) => item.psId === req.body.psId) || PROBLEM_STATEMENTS[0];
    const leader = completedMembers[0];
    if (!/^\S+@\S+\.\S+$/.test(String(members[0]?.email || '').trim())) return res.status(422).json({ message: 'Enter a valid email address for the team leader so they can sign in.' });
    const existing = await User.findOne({ $or: [{ email: leader.email }, { registrationNumber: leader.registrationNumber }] });
    const teamName = text(req.body.teamName, `SIH Team ${reference}`);
    if (existing || await Team.exists({ name: teamName })) return res.status(409).json({ message: 'That team name, leader email, or leader registration number is already registered.' });
    const photo = req.file ? await uploadToCloudinary(req.file, 'sih-2026-aryan/profile-photos', 'image') : null;
    const password = await bcrypt.hash(req.body.leaderPassword, 12);
    user = await User.create({
      fullName: leader.name, gender: leader.gender, email: leader.email, mobile: leader.mobile, department: text(req.body.department),
      branch: leader.branch, academicYear: leader.academicYear, semester: leader.semester, registrationNumber: leader.registrationNumber,
      rollNumber: leader.rollNumber, password, photoUrl: photo?.secure_url || ''
    });
    const team = await Team.create({ name: teamName, leader: user._id, members: completedMembers, problem: selected, facultyMentor: text(req.body.facultyMentor) });
    await logActivity({ user, ip: req.ip }, 'Team registered', team.name);
    return res.status(201).json({ message: 'Five-member team registration received. The team leader can now sign in.', token: signToken(user), user: publicUser(user), team });
  } catch (error) {
    if (user && error?.code === 11000) await User.findByIdAndDelete(user._id).catch(() => undefined);
    return next(error);
  }
});

app.post('/api/auth/login', requireDatabase, [body('email').isEmail().normalizeEmail(), body('password').isString().isLength({ min: 1, max: 72 })], sendValidationErrors, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ message: 'Incorrect email address or password.' });
    user.lastLoginAt = new Date();
    await user.save();
    await logActivity({ user, ip: req.ip }, 'Signed in', user.email);
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.get('/api/auth/me', requireDatabase, authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/student/dashboard', requireDatabase, authenticate, allow('student'), async (req, res, next) => {
  try {
    const [team, settings, announcements, resources] = await Promise.all([
      Team.findOne({ leader: req.user._id }).lean(), getSettings(),
      Announcement.find({ isPublished: true }).sort({ createdAt: -1 }).limit(6).lean(),
      Resource.find({ isPublic: true }).sort({ createdAt: -1 }).lean()
    ]);
    return res.json({ user: publicUser(req.user), team, settings, announcements, resources: addedResources(resources) });
  } catch (error) { return next(error); }
});

app.put('/api/student/profile', requireDatabase, authenticate, allow('student'), upload.single('photo'), [
  body('mobile').optional().trim().matches(/^[0-9+\-\s]{10,16}$/)
], sendValidationErrors, async (req, res, next) => {
  try {
    const permitted = ['mobile'];
    permitted.forEach((key) => { if (req.body[key] !== undefined) req.user[key] = req.body[key]; });
    if (req.file) req.user.photoUrl = (await uploadToCloudinary(req.file, 'sih-2026-aryan/profile-photos', 'image')).secure_url;
    await req.user.save();
    await logActivity(req, 'Updated student profile', req.user.fullName);
    return res.json({ message: 'Profile updated.', user: publicUser(req.user) });
  } catch (error) { return next(error); }
});

app.post('/api/student/team', requireDatabase, authenticate, allow('student'), [
  body('name').trim().isLength({ min: 3, max: 100 }), body('psId').trim().notEmpty(), body('facultyMentor').trim().notEmpty(), body('members').notEmpty()
], sendValidationErrors, async (req, res, next) => {
  try {
    if (await Team.exists({ leader: req.user._id })) return res.status(409).json({ message: 'You already lead a registered team. Contact the SIH cell to make changes.' });
    let members;
    try { members = typeof req.body.members === 'string' ? JSON.parse(req.body.members) : req.body.members; } catch (_error) { return res.status(422).json({ message: 'Team members could not be read.' }); }
    if (!Array.isArray(members) || members.length !== 5) return res.status(422).json({ message: 'A team must contain exactly five members.' });
    const fields = ['name', 'gender', 'email', 'mobile', 'branch', 'academicYear'];
    if (members.some((member) => fields.some((field) => !String(member[field] || '').trim()))) return res.status(422).json({ message: 'Complete every required member field.' });
    if (!members.some((member) => member.gender === 'Female')) return res.status(422).json({ message: 'A team must include at least one female member.' });
    const selected = PROBLEM_STATEMENTS.find((item) => item.psId === req.body.psId);
    if (!selected) return res.status(422).json({ message: 'Select a valid SIH problem statement.' });
    const team = await Team.create({ name: req.body.name, leader: req.user._id, members, problem: selected, facultyMentor: req.body.facultyMentor });
    await logActivity(req, 'Created team', team.name);
    return res.status(201).json({ message: 'Team submitted for faculty review.', team });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'That team name is already in use.' });
    return next(error);
  }
});

app.get('/api/admin/dashboard', requireDatabase, authenticate, allow('admin'), async (_req, res, next) => {
  try {
    const [totalStudents, totalTeams, qualifiedTeams, statuses, tracks, departments, years, daily, recentTeams, recentActivity] = await Promise.all([
      User.countDocuments({ role: 'student' }), Team.countDocuments(), Team.countDocuments({ status: 'qualified' }),
      User.aggregate([{ $match: { role: 'student' } }, { $group: { _id: '$registrationStatus', count: { $sum: 1 } } }]),
      Team.aggregate([{ $group: { _id: '$problem.track', count: { $sum: 1 } } }]),
      User.aggregate([{ $match: { role: 'student' } }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      User.aggregate([{ $match: { role: 'student' } }, { $group: { _id: '$academicYear', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      User.aggregate([{ $match: { role: 'student', createdAt: { $gte: new Date(Date.now() - 6 * 86400000) } } }, { $group: { _id: { $dateToString: { format: '%d %b', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Team.find().sort({ createdAt: -1 }).limit(5).populate('leader', 'fullName email photoUrl').lean(),
      Activity.find().sort({ createdAt: -1 }).limit(8).populate('actor', 'fullName').lean()
    ]);
    const toObject = (rows) => Object.fromEntries(rows.map((row) => [row._id || 'unknown', row.count]));
    return res.json({ stats: { totalStudents, totalTeams, qualifiedTeams, statuses: toObject(statuses), tracks: toObject(tracks), departments, years, daily }, recentTeams, recentActivity });
  } catch (error) { return next(error); }
});

app.get('/api/admin/students', requireDatabase, authenticate, allow('admin'), [
  query('search').optional().trim().isLength({ max: 100 }), query('status').optional().isIn(['pending', 'approved', 'rejected']), query('page').optional().isInt({ min: 1 })
], sendValidationErrors, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1)); const limit = 50;
    const search = req.query.search ? new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const filter = { role: 'student' };
    if (req.query.status) filter.registrationStatus = req.query.status;
    if (search) filter.$or = [{ fullName: search }, { email: search }, { mobile: search }, { department: search }, { academicYear: search }, { registrationNumber: search }];
    const [students, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(filter)]);
    const teamRows = await Team.find({ leader: { $in: students.map((student) => student._id) } }).select('name leader problem.psId').lean();
    const teams = Object.fromEntries(teamRows.map((team) => [team.leader.toString(), team]));
    return res.json({ students: students.map((student) => ({ ...publicUser(student), team: teams[student._id.toString()] || null })), total, page, pages: Math.ceil(total / limit) });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/students/:id/status', requireDatabase, authenticate, allow('admin'), [param('id').isMongoId(), body('status').isIn(['pending', 'approved', 'rejected'])], sendValidationErrors, async (req, res, next) => {
  try {
    const student = await User.findOneAndUpdate({ _id: req.params.id, role: 'student' }, { registrationStatus: req.body.status }, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    await logActivity(req, `Student ${req.body.status}`, student.fullName);
    return res.json({ message: `Student ${req.body.status}.`, student: publicUser(student) });
  } catch (error) { return next(error); }
});

app.delete('/api/admin/students/:id', requireDatabase, authenticate, allow('admin'), [param('id').isMongoId()], sendValidationErrors, async (req, res, next) => {
  try {
    const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student' });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    await Team.deleteOne({ leader: student._id });
    await logActivity(req, 'Deleted student', student.fullName);
    return res.json({ message: 'Student and any leader-owned team removed.' });
  } catch (error) { return next(error); }
});

app.get('/api/admin/teams', requireDatabase, authenticate, allow('admin'), async (_req, res, next) => {
  try { return res.json({ teams: await Team.find().sort({ createdAt: -1 }).populate('leader', 'fullName email mobile department academicYear photoUrl registrationStatus').lean() }); }
  catch (error) { return next(error); }
});

app.patch('/api/admin/teams/:id', requireDatabase, authenticate, allow('admin'), [param('id').isMongoId(), body('status').optional().isIn(['pending', 'approved', 'rejected', 'revision_required', 'qualified']), body('facultyMentor').optional().trim().isLength({ min: 2, max: 100 }), body('adminNote').optional().trim().isLength({ max: 500 })], sendValidationErrors, async (req, res, next) => {
  try {
    const changes = {}; ['status', 'facultyMentor', 'adminNote'].forEach((key) => { if (req.body[key] !== undefined) changes[key] = req.body[key]; });
    const team = await Team.findByIdAndUpdate(req.params.id, changes, { new: true });
    if (!team) return res.status(404).json({ message: 'Team not found.' });
    await logActivity(req, 'Updated team', team.name);
    return res.json({ message: 'Team updated.', team });
  } catch (error) { return next(error); }
});

app.get('/api/admin/settings', requireDatabase, authenticate, allow('admin'), async (_req, res, next) => {
  try { return res.json({ settings: await getSettings() }); } catch (error) { return next(error); }
});

app.put('/api/admin/settings', requireDatabase, authenticate, allow('admin'), [
  body('registrationOpen').isISO8601(), body('registrationClose').isISO8601(), body('evaluationDate').isISO8601(), body('presentationDate').isISO8601(), body('finalResultDate').isISO8601(), body('registrationEnabled').isBoolean(), body('currentStatus').trim().isLength({ min: 2, max: 100 })
], sendValidationErrors, async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true, setDefaultsOnInsert: true });
    await logActivity(req, 'Updated countdown and timeline', req.body.currentStatus);
    return res.json({ message: 'Homepage countdown updated.', settings });
  } catch (error) { return next(error); }
});

app.get('/api/admin/resources', requireDatabase, authenticate, allow('admin'), async (_req, res, next) => {
  try { return res.json({ resources: addedResources(await Resource.find().sort({ createdAt: -1 }).lean()) }); } catch (error) { return next(error); }
});

app.post('/api/admin/resources', requireDatabase, authenticate, allow('admin'), upload.single('file'), [body('title').trim().isLength({ min: 3, max: 160 }), body('category').trim().isLength({ min: 2, max: 60 })], sendValidationErrors, async (req, res, next) => {
  try {
    if (!req.file || req.file.mimetype !== 'application/pdf') return res.status(422).json({ message: 'Upload a PDF document.' });
    const result = await uploadToCloudinary(req.file, 'sih-2026-aryan/resources', 'raw');
    const resource = await Resource.create({ title: req.body.title, category: req.body.category, url: result.secure_url, publicId: result.public_id, isPublic: req.body.isPublic !== 'false', uploadedBy: req.user._id });
    await logActivity(req, 'Uploaded resource', resource.title);
    return res.status(201).json({ message: 'PDF resource uploaded.', resource });
  } catch (error) { return next(error); }
});

app.delete('/api/admin/resources/:id', requireDatabase, authenticate, allow('admin'), [param('id').isMongoId()], sendValidationErrors, async (req, res, next) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });
    if (resource.publicId && process.env.CLOUDINARY_URL) await cloudinary.uploader.destroy(resource.publicId, { resource_type: 'raw' }).catch(() => undefined);
    await logActivity(req, 'Deleted resource', resource.title);
    return res.json({ message: 'Resource removed.' });
  } catch (error) { return next(error); }
});

app.post('/api/admin/announcements', requireDatabase, authenticate, allow('admin'), [body('title').trim().isLength({ min: 3, max: 130 }), body('message').trim().isLength({ min: 3, max: 1000 }), body('priority').optional().isIn(['normal', 'important', 'urgent'])], sendValidationErrors, async (req, res, next) => {
  try {
    const announcement = await Announcement.create({ title: req.body.title, message: req.body.message, priority: req.body.priority || 'normal', createdBy: req.user._id });
    await logActivity(req, 'Created announcement', announcement.title);
    return res.status(201).json({ message: 'Announcement published.', announcement });
  } catch (error) { return next(error); }
});

app.get('/api/admin/evaluations/ranking', requireDatabase, authenticate, allow('admin'), async (_req, res, next) => {
  try {
    const rows = await Evaluation.aggregate([
      { $group: { _id: '$team', averageScore: { $avg: '$total' }, judges: { $sum: 1 }, qualified: { $sum: { $cond: [{ $eq: ['$decision', 'qualified'] }, 1, 0] } } } },
      { $sort: { averageScore: -1, judges: -1 } }, { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } }, { $unwind: '$team' },
      { $lookup: { from: 'users', localField: 'team.leader', foreignField: '_id', as: 'leader' } }, { $unwind: { path: '$leader', preserveNullAndEmptyArrays: true } },
      { $project: { averageScore: { $round: ['$averageScore', 2] }, judges: 1, qualified: 1, team: { _id: '$team._id', name: '$team.name', problem: '$team.problem', status: '$team.status' }, leader: { fullName: '$leader.fullName', department: '$leader.department' } } }
    ]);
    return res.json({ ranking: rows.map((row, index) => ({ rank: index + 1, ...row })) });
  } catch (error) { return next(error); }
});

app.put('/api/admin/evaluations/:teamId', requireDatabase, authenticate, allow('admin'), [param('teamId').isMongoId(), body('scores').isObject(), body('remarks').optional().trim().isLength({ max: 1000 }), body('decision').isIn(['qualified', 'revision_required', 'not_qualified'])], sendValidationErrors, async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found.' });
    const limits = { problemUnderstanding: 15, innovation: 20, technicalFeasibility: 20, prototypeReadiness: 20, impact: 15, presentation: 10 };
    for (const [key, max] of Object.entries(limits)) {
      const value = Number(req.body.scores[key]);
      if (!Number.isFinite(value) || value < 0 || value > max) return res.status(422).json({ message: `${key} must be between 0 and ${max}.` });
    }
    const total = calculateTotal(req.body.scores);
    const evaluation = await Evaluation.findOneAndUpdate({ team: team._id, judge: req.user._id }, { scores: req.body.scores, total, remarks: req.body.remarks || '', decision: req.body.decision }, { new: true, upsert: true, setDefaultsOnInsert: true });
    if (req.body.decision === 'qualified') team.status = 'qualified';
    else if (req.body.decision === 'revision_required') team.status = 'revision_required';
    else team.status = 'rejected';
    await team.save();
    await logActivity(req, 'Scored team', `${team.name}: ${total}/100`);
    return res.json({ message: `Evaluation saved: ${total}/100.`, evaluation });
  } catch (error) { return next(error); }
});

app.get('/api/admin/activity', requireDatabase, authenticate, allow('admin'), async (_req, res, next) => {
  try { return res.json({ activity: await Activity.find().sort({ createdAt: -1 }).limit(100).populate('actor', 'fullName role').lean() }); } catch (error) { return next(error); }
});

function exportRows(students, teams) {
  const teamByLeader = new Map(teams.map((team) => [team.leader.toString(), team]));
  return students.map((student) => {
    const team = teamByLeader.get(student._id.toString());
    return {
      Name: student.fullName, Email: student.email, Mobile: student.mobile, Department: student.department, Branch: student.branch,
      Year: student.academicYear, Registration_No: student.registrationNumber, Status: student.registrationStatus,
      Team: team?.name || 'Not registered', PS_ID: team?.problem?.psId || '-', Track: team?.problem?.track || '-', Mentor: team?.facultyMentor || '-'
    };
  });
}

function safeFileName(value) { return value.replace(/[^a-z0-9_-]/gi, '-').toLowerCase(); }

function drawWatermark(doc, adminName) {
  doc.save();
  doc.fillColor('#aab4bf').opacity(0.16).fontSize(48).font('Helvetica-Bold');
  doc.rotate(-40, { origin: [310, 400] }).text('CONFIDENTIAL', 130, 380, { width: 360, align: 'center' });
  doc.restore();
  doc.opacity(1).fillColor('#667085').fontSize(7).font('Helvetica');
  doc.text(`ARYAN INSTITUTE OF ENGINEERING & TECHNOLOGY  |  CONFIDENTIAL  |  Generated by SIH Internal Portal  |  ${new Date().toLocaleString('en-IN')}  |  Admin: ${adminName}`, 40, 810, { width: 515, align: 'center' });
}

function renderPdfExport(res, title, rows, adminName) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(title)}.pdf"`);
  doc.pipe(res); drawWatermark(doc, adminName);
  doc.fillColor('#0d4b91').fontSize(19).font('Helvetica-Bold').text('ARYAN INSTITUTE OF ENGINEERING & TECHNOLOGY');
  doc.fillColor('#087f3e').fontSize(13).text(title);
  doc.moveDown(0.5).fillColor('#555').fontSize(9).font('Helvetica').text(`Generated by ${adminName} on ${new Date().toLocaleString('en-IN')}`);
  doc.moveDown();
  rows.forEach((row, index) => {
    if (doc.y > 730) { doc.addPage(); drawWatermark(doc, adminName); }
    doc.fillColor('#0d4b91').font('Helvetica-Bold').fontSize(10).text(`${index + 1}. ${row.Name || row.Team || 'Team'}`);
    doc.fillColor('#334155').font('Helvetica').fontSize(8).text(Object.entries(row).filter(([key]) => !['Name', 'Team'].includes(key)).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join('  |  '), { width: 510 });
    doc.moveDown(0.55).strokeColor('#d7e0ea').moveTo(40, doc.y).lineTo(555, doc.y).stroke().moveDown(0.45);
  });
  doc.end();
}

app.get('/api/admin/exports/:type', requireDatabase, authenticate, allow('admin'), [param('type').isIn(['students', 'teams', 'departments']), query('format').isIn(['csv', 'xlsx', 'pdf'])], sendValidationErrors, async (req, res, next) => {
  try {
    const [students, teams] = await Promise.all([User.find({ role: 'student' }).sort({ fullName: 1 }).lean(), Team.find().lean()]);
    let rows = exportRows(students, teams); let title = 'Student Registration Report';
    if (req.params.type === 'teams') { title = 'SIH Team List'; rows = teams.map((team) => ({ Team: team.name, Leader: students.find((student) => student._id.toString() === team.leader.toString())?.fullName || '-', Members: team.members.length, PS_ID: team.problem.psId, Problem: team.problem.title, Track: team.problem.track, Faculty_Mentor: team.facultyMentor, Status: team.status })); }
    if (req.params.type === 'departments') { title = 'Department Report'; const count = students.reduce((map, student) => map.set(student.department, (map.get(student.department) || 0) + 1), new Map()); rows = [...count].map(([Department, Students]) => ({ Department, Students })); }
    await logActivity(req, 'Exported report', `${title} (${req.query.format})`);
    const format = req.query.format;
    if (format === 'csv') {
      const columns = Object.keys(rows[0] || { Report: title });
      const csv = [columns.join(','), ...rows.map((row) => columns.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(title)}.csv"`); return res.send(csv);
    }
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet(title.slice(0, 31));
      sheet.columns = Object.keys(rows[0] || { Report: title }).map((key) => ({ header: key.replace(/_/g, ' '), key, width: Math.min(40, Math.max(14, key.length + 4)) }));
      sheet.addRows(rows); sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D4B91' } }; sheet.views = [{ state: 'frozen', ySplit: 1 }];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(title)}.xlsx"`); await workbook.xlsx.write(res); return res.end();
    }
    return renderPdfExport(res, title, rows, req.user.fullName);
  } catch (error) { return next(error); }
});

app.get('/api/admin/authorization/:teamId', requireDatabase, authenticate, allow('admin'), [param('teamId').isMongoId()], sendValidationErrors, async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('leader', 'fullName department academicYear registrationNumber');
    if (!team) return res.status(404).json({ message: 'Team not found.' });
    const rows = team.members.map((member, index) => ({ Member: `${index + 1}. ${member.name}`, Registration_No: member.registrationNumber || '-', Branch: member.branch, Year: member.academicYear, Email: member.email, Mobile: member.mobile }));
    return renderPdfExport(res, `SIH Team Authorization - ${team.name}`, [{ Team: team.name, Leader: team.leader.fullName, Department: team.leader.department, Problem: team.problem.title, Faculty_Mentor: team.facultyMentor }, ...rows], req.user.fullName);
  } catch (error) { return next(error); }
});

app.use(express.static(path.join(__dirname, 'client'), { extensions: ['html'] }));
app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(__dirname, 'client', 'index.html')));
app.use((error, _req, res, _next) => {
  const status = error.statusCode || (error.name === 'MulterError' ? 422 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.message || 'Something went wrong. Please try again.' });
});

async function start() {
  if (!databaseUri) {
    const message = 'MONGODB_URI is not configured.';
    if (isProduction) throw new Error(message);
    console.warn(`${message} Public preview is available; database actions will return 503.`);
  } else {
    await mongoose.connect(databaseUri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected.');
  }
  app.listen(PORT, () => console.log(`SIH portal listening on port ${PORT}`));
}

start().catch((error) => { console.error('Could not start the portal:', error.message); process.exit(1); });
