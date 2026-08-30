import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { AiService } from "../../core/ai.service";
import { DbService } from "../../core/db.service";
import { ConfirmService } from "../../core/confirm.service";
import { I18nService } from "../../core/i18n.service";
import { PdfService } from "../../core/pdf.service";
import { SettingsService } from "../../core/settings.service";
import { TranslatePipe } from "../../core/translate.pipe";
import type {
  Certification,
  Education,
  Language,
  Profile,
  Project,
  Skill,
  WorkExperience,
  CvData,
} from "../../core/models";

const emptyExp = (): WorkExperience => ({
  company: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  description: [],
});

const emptyEdu = (): Education => ({
  institution: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
});

const emptySkill = (): Skill => ({ name: "", level: "", category: "" });
const emptyLang = (): Language => ({ name: "", level: "" });
const emptyCert = (): Certification => ({ name: "", issuer: "", date: "" });
const emptyProject = (): Project => ({ name: "", description: "", link: "" });

@Component({
  selector: "app-cv",
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./cv.component.html",
  styleUrl: "./cv.component.css",
})
export class CvComponent implements OnInit {
  steps = [
    "cvw.step.personal",
    "cvw.step.experience",
    "cvw.step.education",
    "cvw.step.skills",
    "cvw.step.languages",
    "cvw.step.certs",
    "cvw.step.projects",
    "cvw.step.summary",
  ];
  step = 0;
  saving = false;
  exporting = false;
  importing = false;
  importReview = false;
  importError = "";
  finished = false;

  profile: Profile = {
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

  experiences: WorkExperience[] = [];
  education: Education[] = [];
  skills: Skill[] = [];
  languages: Language[] = [];
  certifications: Certification[] = [];
  projects: Project[] = [];

  expForm: WorkExperience = emptyExp();
  expEditId: number | null = null;
  newAchievement = "";

  eduForm: Education = emptyEdu();
  eduEditId: number | null = null;

  skillForm: Skill = emptySkill();
  skillEditId: number | null = null;

  langForm: Language = emptyLang();
  langEditId: number | null = null;

  certForm: Certification = emptyCert();
  certEditId: number | null = null;

  projectForm: Project = emptyProject();
  projectEditId: number | null = null;
  private importBackup: CvData | null = null;

  constructor(
    private db: DbService,
    private ai: AiService,
    private confirm: ConfirmService,
    private i18n: I18nService,
    private pdf: PdfService,
    private settings: SettingsService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  private async loadAll(): Promise<void> {
    const [p, exp, edu, skills, langs, certs, projects] = await Promise.all([
      this.db.getProfile(),
      this.db.listExperiences(),
      this.db.listEducation(),
      this.db.listSkills(),
      this.db.listLanguages(),
      this.db.listCertifications(),
      this.db.listProjects(),
    ]);
    this.profile = p;
    this.experiences = exp;
    this.education = edu;
    this.skills = skills;
    this.languages = langs;
    this.certifications = certs;
    this.projects = projects;
  }

  async next(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    await this.saveProfile();
    this.saving = false;
    if (this.step < this.steps.length - 1) this.step++;
  }

  async prev(): Promise<void> {
    if (this.step > 0) this.step--;
  }

  async finish(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    await this.saveProfile();
    this.saving = false;
    this.finished = true;
  }

  goTo(i: number): void {
    if (i >= 0 && i < this.steps.length) this.step = i;
  }

  async saveProfile(): Promise<void> {
    await this.db.saveProfile(this.profile);
  }

  async exportPdf(): Promise<void> {
    if (this.exporting) return;
    this.exporting = true;
    try {
      const path = await save({
        defaultPath: `${this.profile.fullName || "cv"}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return;

      const cv = {
        ...this.profile,
        experiences: this.experiences,
        education: this.education,
        skills: this.skills.map((skill) => skill.name).filter(Boolean),
        languages: this.languages,
        certifications: this.certifications,
        projects: this.projects,
      };
      const bytes = await this.pdf.buildCv(cv);
      await invoke<string>("save_file", { path, bytes });
    } catch (e) {
      console.error("No se pudo exportar el CV:", e);
    } finally {
      this.exporting = false;
    }
  }

  async importCv(): Promise<void> {
    if (this.importing) return;
    this.importError = "";
    if (!this.settings.isConfigured) {
      this.importError = this.i18n.t("error.configureAi");
      return;
    }
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "CV", extensions: ["pdf", "txt"] }],
    });
    const path = typeof selected === "string" ? selected : null;
    if (!path) return;

    this.importing = true;
    try {
      this.importBackup = this.cloneCvData(this.currentCvData());
      const imported = await this.ai.parseCv(path);
      this.applyCvData(imported);
      this.importReview = true;
    } catch (e) {
      this.importBackup = null;
      this.importError = String(e);
    } finally {
      this.importing = false;
    }
  }

  async confirmImport(): Promise<void> {
    if (!this.importReview || this.importing) return;
    this.importing = true;
    this.importReview = false;
    try {
      await this.db.replaceCvData(this.currentCvData());
      this.importBackup = null;
    } catch (e) {
      this.importError = String(e);
      this.importReview = true;
    } finally {
      this.importing = false;
    }
  }

  cancelImport(): void {
    if (this.importBackup) this.applyCvData(this.importBackup);
    this.importReview = false;
    this.importBackup = null;
    this.importError = "";
  }

  private currentCvData(): CvData {
    return {
      profile: this.profile,
      experiences: this.experiences,
      education: this.education,
      skills: this.skills,
      languages: this.languages,
      certifications: this.certifications,
      projects: this.projects,
    };
  }

  private applyCvData(cv: CvData): void {
    this.profile = cv.profile;
    this.experiences = cv.experiences;
    this.education = cv.education;
    this.skills = cv.skills;
    this.languages = cv.languages;
    this.certifications = cv.certifications;
    this.projects = cv.projects;
  }

  private cloneCvData(cv: CvData): CvData {
    return JSON.parse(JSON.stringify(cv)) as CvData;
  }

  // --- Experiencia ---
  async saveExperience(): Promise<void> {
    if (this.expEditId != null) {
      await this.db.updateExperience({ ...this.expForm, id: this.expEditId });
    } else {
      await this.db.addExperience(this.expForm);
    }
    this.resetExpForm();
    this.experiences = await this.db.listExperiences();
  }

  editExperience(e: WorkExperience): void {
    this.expForm = { ...e, description: [...e.description] };
    this.expEditId = e.id ?? null;
    this.newAchievement = "";
  }

  addAchievement(): void {
    const v = this.newAchievement.trim();
    if (!v) return;
    this.expForm.description = [...this.expForm.description, v];
    this.newAchievement = "";
  }

  removeAchievement(index: number): void {
    this.expForm.description = this.expForm.description.filter((_, i) => i !== index);
  }

  cancelExpEdit(): void {
    this.resetExpForm();
  }

  resetExpForm(): void {
    this.expForm = emptyExp();
    this.expEditId = null;
    this.newAchievement = "";
  }

  private confirmDelete(itemKey: string): Promise<boolean> {
    return this.confirm.confirm({
      title: this.i18n.t("confirm.deleteTitle"),
      message: this.i18n.t("confirm.deleteItem", { item: this.i18n.t(itemKey) }),
      confirmText: this.i18n.t("common.delete"),
    });
  }

  async removeExperience(id: number): Promise<void> {
    if (!(await this.confirmDelete("item.experience"))) return;
    await this.db.deleteExperience(id);
    this.experiences = await this.db.listExperiences();
  }

  // --- Educación ---
  async saveEducation(): Promise<void> {
    if (this.eduEditId != null) {
      await this.db.updateEducation({ ...this.eduForm, id: this.eduEditId });
    } else {
      await this.db.addEducation(this.eduForm);
    }
    this.eduForm = emptyEdu();
    this.eduEditId = null;
    this.education = await this.db.listEducation();
  }

  editEducation(e: Education): void {
    this.eduForm = { ...e };
    this.eduEditId = e.id ?? null;
  }

  async removeEducation(id: number): Promise<void> {
    if (!(await this.confirmDelete("item.education"))) return;
    await this.db.deleteEducation(id);
    this.education = await this.db.listEducation();
  }

  // --- Competencias ---
  async saveSkill(): Promise<void> {
    if (this.skillEditId != null) {
      await this.db.updateSkill({ ...this.skillForm, id: this.skillEditId });
    } else {
      await this.db.addSkill(this.skillForm);
    }
    this.skillForm = emptySkill();
    this.skillEditId = null;
    this.skills = await this.db.listSkills();
  }

  editSkill(s: Skill): void {
    this.skillForm = { ...s };
    this.skillEditId = s.id ?? null;
  }

  async removeSkill(id: number): Promise<void> {
    if (!(await this.confirmDelete("item.skill"))) return;
    await this.db.deleteSkill(id);
    this.skills = await this.db.listSkills();
  }

  // --- Idiomas ---
  async saveLanguage(): Promise<void> {
    if (this.langEditId != null) {
      await this.db.updateLanguage({ ...this.langForm, id: this.langEditId });
    } else {
      await this.db.addLanguage(this.langForm);
    }
    this.langForm = emptyLang();
    this.langEditId = null;
    this.languages = await this.db.listLanguages();
  }

  editLanguage(l: Language): void {
    this.langForm = { ...l };
    this.langEditId = l.id ?? null;
  }

  async removeLanguage(id: number): Promise<void> {
    if (!(await this.confirmDelete("item.language"))) return;
    await this.db.deleteLanguage(id);
    this.languages = await this.db.listLanguages();
  }

  // --- Certificaciones ---
  async saveCertification(): Promise<void> {
    if (this.certEditId != null) {
      await this.db.updateCertification({ ...this.certForm, id: this.certEditId });
    } else {
      await this.db.addCertification(this.certForm);
    }
    this.certForm = emptyCert();
    this.certEditId = null;
    this.certifications = await this.db.listCertifications();
  }

  editCertification(c: Certification): void {
    this.certForm = { ...c };
    this.certEditId = c.id ?? null;
  }

  async removeCertification(id: number): Promise<void> {
    if (!(await this.confirmDelete("item.certification"))) return;
    await this.db.deleteCertification(id);
    this.certifications = await this.db.listCertifications();
  }

  // --- Proyectos ---
  async saveProject(): Promise<void> {
    if (this.projectEditId != null) {
      await this.db.updateProject({ ...this.projectForm, id: this.projectEditId });
    } else {
      await this.db.addProject(this.projectForm);
    }
    this.projectForm = emptyProject();
    this.projectEditId = null;
    this.projects = await this.db.listProjects();
  }

  editProject(p: Project): void {
    this.projectForm = { ...p };
    this.projectEditId = p.id ?? null;
  }

  async removeProject(id: number): Promise<void> {
    if (!(await this.confirmDelete("item.project"))) return;
    await this.db.deleteProject(id);
    this.projects = await this.db.listProjects();
  }
}
