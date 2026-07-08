# 🚀 Aspire — Job Placement & Internship Platform

A full-stack web application that helps students discover internships and jobs, apply to opportunities, and track their applications in real time.

---

## 📁 Project Structure

```
aspire/
├── backend/                  # FastAPI Python backend
│   ├── main.py               # All API routes and app setup
│   ├── models.py             # SQLAlchemy ORM database models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── database.py           # SQLite connection and session setup
│   ├── requirements.txt      # Python dependencies
│   └── start_backend.sh      # Quick start script
│
└── frontend/                 # React.js frontend
    ├── src/
    │   ├── api/
    │   │   └── index.js      # Axios API service (all HTTP calls)
    │   ├── components/
    │   │   ├── Navbar.js     # Top navigation bar
    │   │   ├── OpportunityCard.js  # Reusable job/internship card
    │   │   └── Toast.js      # Notification toast
    │   ├── pages/
    │   │   ├── Home.js       # Landing page with hero, stats, featured
    │   │   ├── Browse.js     # Browse + search + filter opportunities
    │   │   ├── OpportunityDetail.js  # Full details + apply modal
    │   │   ├── Dashboard.js  # Student application tracker
    │   │   └── Admin.js      # Admin panel (CRUD + status management)
    │   ├── styles/
    │   │   └── global.css    # All styles with design tokens
    │   └── App.js            # React Router setup
    └── start_frontend.sh     # Quick start script
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, React Router, Axios |
| Styling | Custom CSS with design tokens |
| Backend | FastAPI (Python) |
| ORM | SQLAlchemy |
| Database | SQLite |
| Validation | Pydantic v2 |

---

### to view the database
venv) PS C:\Users\nishi\OneDrive\Desktop\aspire\backend> python -c "import sqlite3; conn = sqlite3.connect('aspire.db'); cur = conn.cursor(); cur.execute('SELECT id, full_name, college_email, college_name, branch, status FROM students'); rows = cur.fetchall(); print(f'Found {len(rows)} student(s):'); [print(r) for r in rows]; conn.close()"
>> 
## 🚀 Getting Started

### start the virtual environment
.\venv\Scripts\Activate.ps1

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs (Swagger): `http://localhost:8000/docs`

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

> ⚠️ Start the backend **first**, then the frontend.

---

## ✨ Features

### Student Features
- **Home Page** — Hero section, keyword search, quick filters, live stats, featured opportunities
- **Browse** — Full listing with search by title, filter by type (job/internship), filter by company
- **Opportunity Detail** — Full description, skills, location, salary, and one-click apply modal
- **Student Dashboard** — View profile, track all applications with live status badges

### Admin Features
- **Overview Tab** — Platform stats (jobs, internships, applications) and recent applications table
- **Opportunities Tab** — Create, edit, delete job/internship listings with emoji logo picker
- **Applications Tab** — View all applications, update status per applicant via dropdown

### Application Status Flow
```
Applied → Under Review → Selected
                      ↘ Rejected
```

---

## 🗄️ Database Schema

### Opportunity
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| title | String | Job/internship title |
| company | String | Company name |
| description | Text | Full description |
| skills | String | Comma-separated skills |
| location | String | City / Remote |
| stipend | String | Salary or stipend amount |
| type | Enum | "job" or "internship" |
| logo | String | Emoji placeholder |

### Student
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| name | String | Full name |
| email | String | Unique email (used for login) |
| college | String | College name |
| branch | String | Engineering branch |
| year | String | Current year of study |
| skills | String | Comma-separated skills |

### Application
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| student_id | FK | References Student |
| opportunity_id | FK | References Opportunity |
| status | Enum | Applied / Under Review / Selected / Rejected |
| cover_note | Text | Optional message from student |
| applied_at | DateTime | Timestamp |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Platform stats |
| GET | `/opportunities` | List all (supports ?search, ?type, ?company) |
| GET | `/opportunities/featured` | Top 6 recent |
| GET | `/opportunities/{id}` | Single opportunity |
| POST | `/opportunities` | Create new |
| PUT | `/opportunities/{id}` | Update |
| DELETE | `/opportunities/{id}` | Delete |
| POST | `/students` | Register student |
| GET | `/students/{id}` | Get student |
| GET | `/students/email/{email}` | Find by email |
| POST | `/applications` | Submit application |
| GET | `/applications/student/{id}` | Student's applications |
| GET | `/applications` | All applications (admin) |
| PUT | `/applications/{id}/status` | Update status (admin) |

---

## 🎓 Demo Credentials

A demo student is pre-loaded:
- **Email:** `arjun@student.com`
- Enter this on the Dashboard to see a sample application

---

## 🎨 Design System

- **Primary:** Indigo `#4F46E5`                                                                                                                                                                                                                                                                                                                                                                                                
- **Success:** Mint `#10B981`
- **Background:** Navy `#0F1B2D` (headers), Off-white `#F8FAFC` (content)
- **Font:** Plus Jakarta Sans (headings) + Inter (body)
- **Signature Element:** Left-border pulse animation on opportunity cards on hover

---

Built with ❤️ for students everywhere.
