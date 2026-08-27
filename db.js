const path=require('path');
const fs=require('fs');
const {DatabaseSync}=require('node:sqlite');
const dbDir=path.join(__dirname,'data');fs.mkdirSync(dbDir,{recursive:true});
const dbPath=process.env.DB_PATH||path.join(dbDir,'saeed-center.db');
const db=new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
function run(sql,...params){const r=db.prepare(sql).run(...params);return {...r,lastInsertRowid:Number(r.lastInsertRowid||0),changes:Number(r.changes||0)}}
function get(sql,...params){return db.prepare(sql).get(...params)}
function all(sql,...params){return db.prepare(sql).all(...params)}
function tx(fn){db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v}catch(e){try{db.exec('ROLLBACK')}catch{}throw e}}
function init(){db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','supervisor','receptionist','teacher')),teacher_id INTEGER,active INTEGER NOT NULL DEFAULT 1,must_change_password INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS admin_sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS stages(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS grades(id INTEGER PRIMARY KEY AUTOINCREMENT,stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,code TEXT NOT NULL,name TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,UNIQUE(stage_id,code));
CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,UNIQUE(grade_id,name));
CREATE TABLE IF NOT EXISTS teachers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,subject_text TEXT,bio TEXT,phone TEXT,image_url TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS teacher_stages(teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,PRIMARY KEY(teacher_id,stage_id));
CREATE TABLE IF NOT EXISTS groups(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT NOT NULL UNIQUE,stage_id INTEGER NOT NULL REFERENCES stages(id),grade_id INTEGER NOT NULL REFERENCES grades(id),subject_id INTEGER REFERENCES subjects(id),subject_text TEXT NOT NULL,teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,days TEXT,time TEXT,duration_minutes INTEGER,price REAL NOT NULL DEFAULT 0,capacity INTEGER NOT NULL DEFAULT 30,room TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS registrations(id INTEGER PRIMARY KEY AUTOINCREMENT,request_code TEXT NOT NULL UNIQUE,student_name TEXT NOT NULL,student_phone TEXT NOT NULL,parent_name TEXT NOT NULL,parent_phone TEXT NOT NULL,stage_id INTEGER NOT NULL REFERENCES stages(id),grade_id INTEGER NOT NULL REFERENCES grades(id),subject_id INTEGER REFERENCES subjects(id),subject_text TEXT NOT NULL,teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','reserved','confirmed','waiting','cancelled')),cancellation_reason TEXT,waitlist_position INTEGER,source_json TEXT,student_note TEXT,admin_note TEXT,privacy_version TEXT DEFAULT '1.0',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,session_date TEXT NOT NULL,topic TEXT,created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(group_id,session_date));
CREATE TABLE IF NOT EXISTS attendance_records(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,status TEXT NOT NULL DEFAULT 'unmarked' CHECK(status IN ('unmarked','present','absent','excused')),note TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(session_id,registration_id));
CREATE TABLE IF NOT EXISTS results(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER REFERENCES registrations(id) ON DELETE SET NULL,student_name TEXT NOT NULL,grade_text TEXT,result_text TEXT NOT NULL,year_text TEXT,note TEXT,image_url TEXT,approved INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS testimonials(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,relation TEXT,quote TEXT NOT NULL,approved INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,body TEXT NOT NULL,link TEXT,image_url TEXT,start_date TEXT,end_date TEXT,priority INTEGER NOT NULL DEFAULT 0,display_mode TEXT NOT NULL DEFAULT 'bar' CHECK(display_mode IN ('bar','popup','card')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS gallery(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,image_url TEXT NOT NULL,category TEXT DEFAULT 'center',sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS materials(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,file_url TEXT NOT NULL,stage_id INTEGER REFERENCES stages(id),grade_id INTEGER REFERENCES grades(id),subject_id INTEGER REFERENCES subjects(id),group_id INTEGER REFERENCES groups(id),visible_to_portal INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS subscriptions(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,period TEXT NOT NULL,amount REAL NOT NULL,due_date TEXT,discount REAL NOT NULL DEFAULT 0,note TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(registration_id,period));
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,amount REAL NOT NULL,method TEXT NOT NULL DEFAULT 'cash',reference TEXT,receipt_no TEXT NOT NULL UNIQUE,paid_at TEXT NOT NULL,note TEXT,created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS student_grades(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,title TEXT NOT NULL,score REAL,max_score REAL,exam_date TEXT,note TEXT,created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS student_notes(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,note TEXT NOT NULL,visible_to_portal INTEGER NOT NULL DEFAULT 1,created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER REFERENCES registrations(id) ON DELETE CASCADE,title TEXT NOT NULL,body TEXT NOT NULL,audience TEXT NOT NULL DEFAULT 'student',created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,action TEXT NOT NULL,entity TEXT NOT NULL,entity_id TEXT,details_json TEXT,ip TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS portal_otps(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,phone TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS portal_sessions(token_hash TEXT PRIMARY KEY,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS student_enrollments(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,subject_text TEXT NOT NULL,teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','waiting','ended','cancelled')),waitlist_position INTEGER,start_date TEXT NOT NULL DEFAULT (date('now')),end_date TEXT,change_reason TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS message_reads(message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(message_id,registration_id));
CREATE TABLE IF NOT EXISTS message_recipients(message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(message_id,registration_id));
CREATE TABLE IF NOT EXISTS notification_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,kind TEXT NOT NULL,channel TEXT NOT NULL DEFAULT 'whatsapp',recipient TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',provider_response TEXT,sent_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_reg_phone ON registrations(parent_phone);
CREATE INDEX IF NOT EXISTS idx_reg_group ON registrations(group_id,status);
CREATE INDEX IF NOT EXISTS idx_att_group_date ON attendance_sessions(group_id,session_date);
CREATE INDEX IF NOT EXISTS idx_pay_reg ON payments(registration_id,paid_at);
`);migrateSchema();seedCatalog();migrateExistingData()}

function tableColumns(table){return new Set(all(`PRAGMA table_info(${table})`).map(x=>x.name))}
function ensureColumn(table,name,definition){if(!tableColumns(table).has(name))db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)}
function migrateSchema(){
  ensureColumn('registrations','tracking_code','TEXT');
  ensureColumn('registrations','tracking_issued_at','TEXT');
  ensureColumn('registrations','tracking_notification_at','TEXT');
  ensureColumn('student_grades','subject_id','INTEGER REFERENCES subjects(id) ON DELETE SET NULL');
  ensureColumn('student_grades','group_id','INTEGER REFERENCES groups(id) ON DELETE SET NULL');
  ensureColumn('student_grades','teacher_id','INTEGER REFERENCES teachers(id) ON DELETE SET NULL');
  ensureColumn('student_grades','enrollment_id','INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL');
  ensureColumn('student_grades','image_url','TEXT');
  ensureColumn('messages','group_id','INTEGER REFERENCES groups(id) ON DELETE CASCADE');
  ensureColumn('messages','priority','INTEGER NOT NULL DEFAULT 0');
  ensureColumn('messages','expires_at','TEXT');
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_tracking ON registrations(tracking_code) WHERE tracking_code IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_reg_student_phone ON registrations(student_phone);
  CREATE INDEX IF NOT EXISTS idx_enroll_reg ON student_enrollments(registration_id,status);
  CREATE INDEX IF NOT EXISTS idx_enroll_group ON student_enrollments(group_id,status,waitlist_position);
  CREATE INDEX IF NOT EXISTS idx_msg_group ON messages(group_id,created_at);
  CREATE INDEX IF NOT EXISTS idx_msg_recip_reg ON message_recipients(registration_id,message_id);
  CREATE INDEX IF NOT EXISTS idx_notification_reg ON notification_logs(registration_id,created_at);`);
}
function trackingCodeFor(row){const y=String(row.created_at||new Date().toISOString()).slice(0,4)||String(new Date().getFullYear());return `SC-${y}-${String(row.id).padStart(5,'0')}`}
function migrateExistingData(){
  tx(()=>{
    const regs=all('SELECT * FROM registrations ORDER BY id');
    for(const r of regs){
      if(!get('SELECT 1 FROM student_enrollments WHERE registration_id=? LIMIT 1',r.id)){
        const st=r.status==='waiting'?'waiting':r.status==='cancelled'?'cancelled':'active';
        run('INSERT INTO student_enrollments(registration_id,group_id,subject_id,subject_text,teacher_id,status,waitlist_position,start_date,end_date,change_reason) VALUES(?,?,?,?,?,?,?,?,?,?)',r.id,r.group_id||null,r.subject_id||null,r.subject_text||'مادة غير محددة',r.teacher_id||null,st,r.waitlist_position||null,String(r.created_at||'').slice(0,10)||new Date().toISOString().slice(0,10),st==='cancelled'?(String(r.updated_at||r.created_at||'').slice(0,10)||null):null,'ترحيل تلقائي من بيانات النسخة السابقة');
      }
      if(r.status==='confirmed'&&!r.tracking_code){const code=trackingCodeFor(r);run('UPDATE registrations SET tracking_code=?,tracking_issued_at=COALESCE(tracking_issued_at,CURRENT_TIMESTAMP) WHERE id=?',code,r.id)}
    }
  })
}

function seedCatalog(){if(get('SELECT COUNT(*) c FROM stages').c)return;const catalog=[['primary','المرحلة الابتدائية',['الأول الابتدائي','الثاني الابتدائي','الثالث الابتدائي','الرابع الابتدائي','الخامس الابتدائي','السادس الابتدائي'],['اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','الدراسات الاجتماعية']],['preparatory','المرحلة الإعدادية',['الأول الإعدادي','الثاني الإعدادي','الثالث الإعدادي'],['اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','الدراسات الاجتماعية']],['secondary','المرحلة الثانوية',['الأول الثانوي','الثاني الثانوي','الثالث الثانوي'],['اللغة العربية','اللغة الإنجليزية','الرياضيات','الفيزياء','الكيمياء','الأحياء','التاريخ','الجغرافيا','الفلسفة والمنطق']]];tx(()=>catalog.forEach(([code,name,grades,subjects],si)=>{const sid=run('INSERT INTO stages(code,name,sort_order) VALUES(?,?,?)',code,name,si+1).lastInsertRowid;grades.forEach((g,gi)=>{const gid=run('INSERT INTO grades(stage_id,code,name,sort_order) VALUES(?,?,?,?)',sid,`${code}-${gi+1}`,g,gi+1).lastInsertRowid;subjects.forEach(s=>run('INSERT INTO subjects(grade_id,name) VALUES(?,?)',gid,s))})}))}
function setting(key,fallback=null){const r=get('SELECT value FROM settings WHERE key=?',key);if(!r)return fallback;try{return JSON.parse(r.value)}catch{return r.value}}
function setSetting(key,value){run(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`,key,JSON.stringify(value))}
function audit(userId,action,entity,entityId,details,ip){run('INSERT INTO audit_logs(user_id,action,entity,entity_id,details_json,ip) VALUES(?,?,?,?,?,?)',userId||null,action,entity,String(entityId??''),JSON.stringify(details||{}),ip||'')}
module.exports={db,run,get,all,tx,init,setting,setSetting,audit,dbPath};
