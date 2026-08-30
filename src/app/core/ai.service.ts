import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { SettingsService } from "./settings.service";
import type {
  AnswerEvaluation,
  AtsAnalysis,
  CoverLetter,
  CvData,
  GeneratedCv,
  JobOfferStructured,
  TechnicalTest,
  TestConfig,
  TestQuestion,
} from "./models";

@Injectable({ providedIn: "root" })
export class AiService {
  constructor(private settings: SettingsService) {}

  private ctx() {
    const s = this.settings.settings();
    return { baseUrl: s.baseUrl, apiKey: s.apiKey, model: s.model };
  }

  async listModels(baseUrl: string, apiKey: string): Promise<string[]> {
    return invoke<string[]>("list_models", { baseUrl, apiKey });
  }

  async testConnection(baseUrl: string, apiKey: string, model: string): Promise<string> {
    return invoke<string>("test_connection", { baseUrl, apiKey, model });
  }

  async parseJobOffer(text: string): Promise<JobOfferStructured> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<JobOfferStructured>("parse_job_offer", { baseUrl, apiKey, model, text });
  }

  async parseCv(path: string): Promise<CvData> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<CvData>("parse_cv", { baseUrl, apiKey, model, path });
  }

  async generateCv(
    cvData: CvData,
    offer: JobOfferStructured,
    language = "",
  ): Promise<GeneratedCv> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<GeneratedCv>("generate_cv", { baseUrl, apiKey, model, cvData, offer, language });
  }

  async generateCoverLetter(
    cvData: CvData,
    offer: JobOfferStructured,
    language = "",
  ): Promise<CoverLetter> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<CoverLetter>("generate_cover_letter", { baseUrl, apiKey, model, cvData, offer, language });
  }

  async generateTechnicalTest(
    offer: JobOfferStructured,
    config: TestConfig = {},
  ): Promise<TechnicalTest> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<TechnicalTest>("generate_technical_test", {
      baseUrl,
      apiKey,
      model,
      offer,
      questionCount: config.questionCount ?? "",
      difficulty: config.difficulty ?? "",
      estimatedTime: config.estimatedTime ?? "",
    });
  }

  async generateTestFromTopic(topic: string): Promise<TechnicalTest> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<TechnicalTest>("generate_test_from_topic", { baseUrl, apiKey, model, topic });
  }

  async analyzeAts(
    cvData: CvData,
    offer: JobOfferStructured,
  ): Promise<AtsAnalysis> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<AtsAnalysis>("analyze_ats", { baseUrl, apiKey, model, cvData, offer });
  }

  async evaluateAnswer(
    question: TestQuestion,
    userAnswer: string,
  ): Promise<AnswerEvaluation> {
    const { baseUrl, apiKey, model } = this.ctx();
    return invoke<AnswerEvaluation>("evaluate_answer", { baseUrl, apiKey, model, question, userAnswer });
  }
}
