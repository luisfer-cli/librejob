import { Injectable } from "@angular/core";
import Database from "@tauri-apps/plugin-sql";
import type {
  AtsAnalysis,
  Certification,
  CvData,
  Education,
  JobOffer,
  Language,
  OfferStatus,
  Profile,
  Project,
  Skill,
  WorkExperience,
} from "./models";

function toBoolean(v: unknown): boolean {
  return v === 1 || v === true || v === "1";
}

@Injectable({ providedIn: "root" })
export class DbService {
  private db: Database | null = null;

  async init(): Promise<void> {
    if (!this.db) {
      this.db = await Database.load("sqlite:librejob.db");
    }
  }

  private async d(): Promise<Database> {
    await this.init();
    return this.db!;
  }

  // ----- Perfil -----
  async getProfile(): Promise<Profile> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM profile WHERE id = 1",
    );
    if (rows.length === 0) {
      return {
        id: 1,
        fullName: "",
        jobTitle: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        website: "",
        summary: "",
      };
    }
    const r = rows[0];
    return {
      id: (r["id"] as number) ?? 1,
      fullName: (r["full_name"] as string) ?? "",
      jobTitle: (r["job_title"] as string) ?? "",
      email: (r["email"] as string) ?? "",
      phone: (r["phone"] as string) ?? "",
      location: (r["location"] as string) ?? "",
      linkedin: (r["linkedin"] as string) ?? "",
      website: (r["website"] as string) ?? "",
      summary: (r["summary"] as string) ?? "",
    };
  }

  async saveProfile(p: Profile): Promise<void> {
    const db = await this.d();
    await db.execute(
      `UPDATE profile SET full_name = $1, job_title = $2, email = $3, phone = $4,
       location = $5, linkedin = $6, website = $7, summary = $8,
       updated_at = datetime('now') WHERE id = 1`,
      [p.fullName, p.jobTitle, p.email, p.phone, p.location, p.linkedin, p.website, p.summary],
    );
  }

  async replaceCvData(cv: CvData): Promise<void> {
    // tauri-plugin-sql usa un pool; las consultas separadas no garantizan
    // permanecer en la misma conexión para una transacción SQLite.
    await this.saveProfile(cv.profile);
    const db = await this.d();
    await db.execute("DELETE FROM work_experiences");
    await db.execute("DELETE FROM education");
    await db.execute("DELETE FROM skills");
    await db.execute("DELETE FROM languages");
    await db.execute("DELETE FROM certifications");
    await db.execute("DELETE FROM projects");

    for (const e of cv.experiences) await this.addExperience(e);
    for (const e of cv.education) await this.addEducation(e);
    for (const s of cv.skills) await this.addSkill(s);
    for (const l of cv.languages) await this.addLanguage(l);
    for (const c of cv.certifications) await this.addCertification(c);
    for (const p of cv.projects) await this.addProject(p);
  }

  async getCvData(): Promise<CvData> {
    const [profile, experiences, education, skills, languages, certifications, projects] =
      await Promise.all([
        this.getProfile(),
        this.listExperiences(),
        this.listEducation(),
        this.listSkills(),
        this.listLanguages(),
        this.listCertifications(),
        this.listProjects(),
      ]);
    return { profile, experiences, education, skills, languages, certifications, projects };
  }

  // ----- Experiencia -----
  private parseDescription(raw: unknown): string[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      return raw.filter((x): x is string => typeof x === "string");
    }
    const t = String(raw).trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) {
          return arr.filter((x): x is string => typeof x === "string");
        }
      } catch {
        // no es JSON válido: se trata como texto plano
      }
    }
    // Legado: texto plano -> una sola viñeta (o por líneas).
    return t
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async listExperiences(): Promise<WorkExperience[]> {
    const db = await this.d();
    const rows = await db.select<
      Array<Record<string, unknown>>
    >("SELECT * FROM work_experiences ORDER BY id DESC");
    return rows.map((r) => ({
      id: r["id"] as number,
      company: (r["company"] as string) ?? "",
      role: (r["role"] as string) ?? "",
      location: (r["location"] as string) ?? "",
      startDate: (r["start_date"] as string) ?? "",
      endDate: (r["end_date"] as string) ?? "",
      current: toBoolean(r["current"]),
      description: this.parseDescription(r["description"]),
    }));
  }

  async addExperience(e: WorkExperience): Promise<void> {
    const db = await this.d();
    await db.execute(
      `INSERT INTO work_experiences (company, role, location, start_date, end_date, current, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        e.company,
        e.role,
        e.location,
        e.startDate,
        e.endDate,
        e.current ? 1 : 0,
        JSON.stringify(e.description),
      ],
    );
  }

  async updateExperience(e: WorkExperience): Promise<void> {
    const db = await this.d();
    await db.execute(
      `UPDATE work_experiences SET company = $1, role = $2, location = $3,
       start_date = $4, end_date = $5, current = $6, description = $7 WHERE id = $8`,
      [
        e.company,
        e.role,
        e.location,
        e.startDate,
        e.endDate,
        e.current ? 1 : 0,
        JSON.stringify(e.description),
        e.id,
      ],
    );
  }

  async deleteExperience(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM work_experiences WHERE id = $1", [id]);
  }

  // ----- Educación -----
  async listEducation(): Promise<Education[]> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM education ORDER BY id DESC",
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      institution: (r["institution"] as string) ?? "",
      degree: (r["degree"] as string) ?? "",
      field: (r["field"] as string) ?? "",
      startDate: (r["start_date"] as string) ?? "",
      endDate: (r["end_date"] as string) ?? "",
    }));
  }

  async addEducation(e: Education): Promise<void> {
    const db = await this.d();
    await db.execute(
      `INSERT INTO education (institution, degree, field, start_date, end_date) VALUES ($1, $2, $3, $4, $5)`,
      [e.institution, e.degree, e.field, e.startDate, e.endDate],
    );
  }

  async updateEducation(e: Education): Promise<void> {
    const db = await this.d();
    await db.execute(
      `UPDATE education SET institution = $1, degree = $2, field = $3, start_date = $4, end_date = $5 WHERE id = $6`,
      [e.institution, e.degree, e.field, e.startDate, e.endDate, e.id],
    );
  }

  async deleteEducation(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM education WHERE id = $1", [id]);
  }

  // ----- Competencias -----
  async listSkills(): Promise<Skill[]> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM skills ORDER BY id ASC",
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      name: (r["name"] as string) ?? "",
      level: (r["level"] as string) ?? "",
      category: (r["category"] as string) ?? "",
    }));
  }

  async addSkill(s: Skill): Promise<void> {
    const db = await this.d();
    await db.execute("INSERT INTO skills (name, level, category) VALUES ($1, $2, $3)", [
      s.name,
      s.level,
      s.category,
    ]);
  }

  async updateSkill(s: Skill): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE skills SET name = $1, level = $2, category = $3 WHERE id = $4", [
      s.name,
      s.level,
      s.category,
      s.id,
    ]);
  }

  async deleteSkill(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM skills WHERE id = $1", [id]);
  }

  // ----- Idiomas -----
  async listLanguages(): Promise<Language[]> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM languages ORDER BY id ASC",
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      name: (r["name"] as string) ?? "",
      level: (r["level"] as string) ?? "",
    }));
  }

  async addLanguage(l: Language): Promise<void> {
    const db = await this.d();
    await db.execute("INSERT INTO languages (name, level) VALUES ($1, $2)", [l.name, l.level]);
  }

  async updateLanguage(l: Language): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE languages SET name = $1, level = $2 WHERE id = $3", [l.name, l.level, l.id]);
  }

  async deleteLanguage(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM languages WHERE id = $1", [id]);
  }

  // ----- Certificaciones -----
  async listCertifications(): Promise<Certification[]> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM certifications ORDER BY id DESC",
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      name: (r["name"] as string) ?? "",
      issuer: (r["issuer"] as string) ?? "",
      date: (r["date"] as string) ?? "",
    }));
  }

  async addCertification(c: Certification): Promise<void> {
    const db = await this.d();
    await db.execute("INSERT INTO certifications (name, issuer, date) VALUES ($1, $2, $3)", [
      c.name,
      c.issuer,
      c.date,
    ]);
  }

  async updateCertification(c: Certification): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE certifications SET name = $1, issuer = $2, date = $3 WHERE id = $4", [
      c.name,
      c.issuer,
      c.date,
      c.id,
    ]);
  }

  async deleteCertification(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM certifications WHERE id = $1", [id]);
  }

  // ----- Proyectos -----
  async listProjects(): Promise<Project[]> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM projects ORDER BY id DESC",
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      name: (r["name"] as string) ?? "",
      description: (r["description"] as string) ?? "",
      link: (r["link"] as string) ?? "",
    }));
  }

  async addProject(p: Project): Promise<void> {
    const db = await this.d();
    await db.execute("INSERT INTO projects (name, description, link) VALUES ($1, $2, $3)", [
      p.name,
      p.description,
      p.link,
    ]);
  }

  async updateProject(p: Project): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE projects SET name = $1, description = $2, link = $3 WHERE id = $4", [
      p.name,
      p.description,
      p.link,
      p.id,
    ]);
  }

  async deleteProject(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM projects WHERE id = $1", [id]);
  }

  // ----- Ofertas -----
  async listOffers(): Promise<JobOffer[]> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM job_offers ORDER BY updated_at DESC",
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      title: (r["title"] as string) ?? "",
      company: (r["company"] as string) ?? "",
      location: (r["location"] as string) ?? "",
      rawText: (r["raw_text"] as string) ?? "",
      structured: (r["structured"] as string) ?? "{}",
      status: (r["status"] as OfferStatus) ?? "guardada",
      salary: (r["salary"] as string) ?? "",
      url: (r["url"] as string) ?? "",
      notes: (r["notes"] as string) ?? "",
      createdAt: (r["created_at"] as string) ?? "",
      updatedAt: (r["updated_at"] as string) ?? "",
    }));
  }

  async getOffer(id: number): Promise<JobOffer | undefined> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM job_offers WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      id: r["id"] as number,
      title: (r["title"] as string) ?? "",
      company: (r["company"] as string) ?? "",
      location: (r["location"] as string) ?? "",
      rawText: (r["raw_text"] as string) ?? "",
      structured: (r["structured"] as string) ?? "{}",
      status: (r["status"] as OfferStatus) ?? "guardada",
      salary: (r["salary"] as string) ?? "",
      url: (r["url"] as string) ?? "",
      notes: (r["notes"] as string) ?? "",
      createdAt: (r["created_at"] as string) ?? "",
      updatedAt: (r["updated_at"] as string) ?? "",
    };
  }

  async createOffer(o: {
    title: string;
    company: string;
    location: string;
    rawText: string;
    structured: string;
    status: OfferStatus;
    salary: string;
    url: string;
  }): Promise<number> {
    const db = await this.d();
    const res = await db.execute(
      `INSERT INTO job_offers (title, company, location, raw_text, structured, status, salary, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [o.title, o.company, o.location, o.rawText, o.structured, o.status, o.salary, o.url],
    );
    return res.lastInsertId as number;
  }

  async updateOffer(id: number, patch: Partial<JobOffer>): Promise<void> {
    const db = await this.d();
    await db.execute(
      `UPDATE job_offers SET title = $1, company = $2, location = $3, raw_text = $4,
       structured = $5, status = $6, salary = $7, url = $8, notes = $9,
       updated_at = datetime('now') WHERE id = $10`,
      [
        patch.title ?? "",
        patch.company ?? "",
        patch.location ?? "",
        patch.rawText ?? "",
        patch.structured ?? "{}",
        patch.status ?? "guardada",
        patch.salary ?? "",
        patch.url ?? "",
        patch.notes ?? "",
        id,
      ],
    );
  }

  async updateOfferStatus(id: number, status: OfferStatus): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE job_offers SET status = $1, updated_at = datetime('now') WHERE id = $2", [
      status,
      id,
    ]);
  }

  async updateOfferNotes(id: number, notes: string): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE job_offers SET notes = $1, updated_at = datetime('now') WHERE id = $2", [
      notes,
      id,
    ]);
  }

  async getAtsAnalysis(offerId: number): Promise<AtsAnalysis | null> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT ats_analysis FROM job_offers WHERE id = $1",
      [offerId],
    );
    if (rows.length === 0) return null;
    const raw = (rows[0]["ats_analysis"] as string) ?? "";
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AtsAnalysis;
    } catch {
      return null;
    }
  }

  async saveAtsAnalysis(offerId: number, analysis: AtsAnalysis): Promise<void> {
    const db = await this.d();
    await db.execute(
      "UPDATE job_offers SET ats_analysis = $1, updated_at = datetime('now') WHERE id = $2",
      [JSON.stringify(analysis), offerId],
    );
  }

  async deleteOffer(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM generated_cvs WHERE job_offer_id = $1", [id]);
    await db.execute("DELETE FROM cover_letters WHERE job_offer_id = $1", [id]);
    await db.execute("DELETE FROM technical_tests WHERE job_offer_id = $1", [id]);
    await db.execute("DELETE FROM job_offers WHERE id = $1", [id]);
  }

  // ----- CVs generados -----
  async addGeneratedCv(jobOfferId: number, structured: string): Promise<number> {
    const db = await this.d();
    const res = await db.execute(
      "INSERT INTO generated_cvs (job_offer_id, structured) VALUES ($1, $2)",
      [jobOfferId, structured],
    );
    return res.lastInsertId as number;
  }

  async listGeneratedCvs(jobOfferId: number): Promise<Array<{ id: number; structured: string; createdAt: string }>> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM generated_cvs WHERE job_offer_id = $1 ORDER BY id DESC",
      [jobOfferId],
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      structured: (r["structured"] as string) ?? "{}",
      createdAt: (r["created_at"] as string) ?? "",
    }));
  }

  async updateGeneratedCv(id: number, structured: string): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE generated_cvs SET structured = $1 WHERE id = $2", [structured, id]);
  }

  async deleteGeneratedCv(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM generated_cvs WHERE id = $1", [id]);
  }

  // ----- Cartas -----
  async addCoverLetter(jobOfferId: number, content: string): Promise<number> {
    const db = await this.d();
    const res = await db.execute(
      "INSERT INTO cover_letters (job_offer_id, content) VALUES ($1, $2)",
      [jobOfferId, content],
    );
    return res.lastInsertId as number;
  }

  async updateCoverLetter(id: number, content: string): Promise<void> {
    const db = await this.d();
    await db.execute("UPDATE cover_letters SET content = $1 WHERE id = $2", [content, id]);
  }

  async listCoverLetters(jobOfferId: number): Promise<Array<{ id: number; content: string; createdAt: string }>> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM cover_letters WHERE job_offer_id = $1 ORDER BY id DESC",
      [jobOfferId],
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      content: (r["content"] as string) ?? "",
      createdAt: (r["created_at"] as string) ?? "",
    }));
  }

  // ----- Pruebas técnicas -----
  async addTechnicalTest(jobOfferId: number | null, title: string, content: string): Promise<number> {
    const db = await this.d();
    const res = await db.execute(
      "INSERT INTO technical_tests (job_offer_id, title, content) VALUES ($1, $2, $3)",
      [jobOfferId, title, content],
    );
    return res.lastInsertId as number;
  }

  async listTechnicalTests(jobOfferId: number): Promise<Array<{ id: number; title: string; content: string; createdAt: string }>> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM technical_tests WHERE job_offer_id = $1 ORDER BY id DESC",
      [jobOfferId],
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      title: (r["title"] as string) ?? "",
      content: (r["content"] as string) ?? "",
      createdAt: (r["created_at"] as string) ?? "",
    }));
  }

  async listAllTechnicalTests(): Promise<Array<{ id: number; jobOfferId: number | null; title: string; content: string; createdAt: string }>> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM technical_tests ORDER BY id DESC",
    );
    return rows.map((r) => ({
      id: r["id"] as number,
      jobOfferId: (r["job_offer_id"] as number) ?? null,
      title: (r["title"] as string) ?? "",
      content: (r["content"] as string) ?? "",
      createdAt: (r["created_at"] as string) ?? "",
    }));
  }

  async getTechnicalTest(id: number): Promise<{ id: number; jobOfferId: number | null; title: string; content: string } | undefined> {
    const db = await this.d();
    const rows = await db.select<Array<Record<string, unknown>>>(
      "SELECT * FROM technical_tests WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      id: r["id"] as number,
      jobOfferId: (r["job_offer_id"] as number) ?? null,
      title: (r["title"] as string) ?? "",
      content: (r["content"] as string) ?? "",
    };
  }

  async deleteTechnicalTest(id: number): Promise<void> {
    const db = await this.d();
    await db.execute("DELETE FROM technical_tests WHERE id = $1", [id]);
  }

  // ----- Settings -----
  async getSettings(): Promise<Record<string, string>> {
    const db = await this.d();
    const rows = await db.select<Array<{ key: string; value: string }>>("SELECT * FROM settings");
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const db = await this.d();
    await db.execute(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
      [key, value],
    );
  }
}
