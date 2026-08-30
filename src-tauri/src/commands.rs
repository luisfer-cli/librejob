use crate::ai::{AiProvider, OpenAiCompatible};
use crate::models::{
    AnswerEvaluation, AtsAnalysis, CoverLetter, CvData, GeneratedCv, JobOfferStructured,
    TechnicalTest, TestQuestion,
};

async fn ask_json(
    base_url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    user: &str,
) -> Result<serde_json::Value, String> {
    let provider = OpenAiCompatible::new();
    let mut last_err = String::new();
    let mut sys = system.to_string();

    for _ in 0..3 {
        let raw = provider
            .chat(crate::ai::ChatRequest {
                base_url: base_url.to_string(),
                api_key: api_key.to_string(),
                model: model.to_string(),
                system: sys.clone(),
                user: user.to_string(),
            })
            .await?;

        match parse_json_lenient(&raw) {
            Ok(v) => return Ok(v),
            Err(e) => {
                last_err = format!("La IA no devolvió JSON válido: {e}. Respuesta: {raw}");
                sys = format!(
                    "{system}\n\nIMPORTANTE: responde EXCLUSIVAMENTE con el objeto JSON solicitado, \
                     sin markdown, sin fences de código y sin texto adicional antes ni después."
                );
            }
        }
    }

    Err(last_err)
}

/// Intenta parsear el JSON que devuelve el modelo de forma tolerante:
/// soporta fences de markdown, texto alrededor y prefijos/duplicados corruptos.
fn parse_json_lenient(raw: &str) -> Result<serde_json::Value, String> {
    let s = raw.trim();

    if let Ok(v) = serde_json::from_str::<serde_json::Value>(s) {
        return Ok(v);
    }

    let Some(last) = s.rfind('}') else {
        return Err("la respuesta no contiene un objeto JSON".to_string());
    };

    // Prueba cada posición de '{' como posible inicio del objeto real.
    // Esto recupera casos como "{ \"full{ \"fullName\": ..." donde el modelo
    // emitió un prefijo duplicado/corrupto.
    for start in s.match_indices('{').map(|(i, _)| i) {
        if start > last {
            break;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s[start..=last]) {
            return Ok(v);
        }
    }

    Err("JSON malformado".to_string())
}

#[tauri::command]
pub async fn list_models(base_url: String, api_key: String) -> Result<Vec<String>, String> {
    OpenAiCompatible::new()
        .list_models(&base_url, &api_key)
        .await
}

#[tauri::command]
pub async fn test_connection(base_url: String, api_key: String, model: String) -> Result<String, String> {
    let v = ask_json(
        &base_url,
        &api_key,
        &model,
        "Responde SIEMPRE con JSON válido con la estructura {\"ok\": true}.",
        "Confirma que la conexión funciona.",
    )
    .await?;
    if v["ok"].as_bool().unwrap_or(false) {
        Ok("Conexión correcta".to_string())
    } else {
        Err("La conexión respondió pero de forma inesperada".to_string())
    }
}

#[tauri::command]
pub async fn parse_job_offer(
    base_url: String,
    api_key: String,
    model: String,
    text: String,
) -> Result<JobOfferStructured, String> {
    let system = r#"Eres un asistente experto en extraer información estructurada de ofertas de trabajo. Responde SIEMPRE con JSON válido con exactamente esta estructura, sin texto adicional:
{"title":"","company":"","location":"","salary":"","jobType":"","seniority":"","description":"","requirements":[],"responsibilities":[],"niceToHave":[],"skills":[],"applicationUrl":""}
Rellena cada campo con la información encontrada en la oferta. Usa arrays de strings para requirements, responsibilities, niceToHave y skills. Si un dato no aparece, deja el campo como cadena vacía o array vacío. Mantén el idioma original de la oferta."#;
    let user = format!("Analiza la siguiente oferta de trabajo y extrae los datos:\n\n{text}");
    let v = ask_json(&base_url, &api_key, &model, system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar la oferta: {e}"))
}

#[tauri::command]
pub async fn parse_cv(
    base_url: String,
    api_key: String,
    model: String,
    path: String,
) -> Result<CvData, String> {
    let extension = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let text = match extension.as_str() {
        "pdf" => pdf_extract::extract_text(&path)
            .map_err(|e| format!("No se pudo extraer texto del PDF: {e}"))?,
        "txt" => std::fs::read_to_string(&path)
            .map_err(|e| format!("No se pudo leer el archivo: {e}"))?,
        _ => return Err("Selecciona un archivo PDF o TXT".to_string()),
    };
    if text.trim().is_empty() {
        return Err("No se pudo extraer texto del archivo. Puede ser un PDF escaneado.".to_string());
    }

    let text: String = text.chars().take(120_000).collect();
    let system = r#"Eres un experto en extraer información de currículums. Recibes el texto de un CV y debes convertirlo en datos estructurados. Responde SIEMPRE con JSON válido, sin texto adicional, con exactamente esta estructura:
{"profile":{"fullName":"","jobTitle":"","email":"","phone":"","location":"","linkedin":"","website":"","summary":""},"experiences":[{"company":"","role":"","location":"","startDate":"","endDate":"","current":false,"description":[]}],"education":[{"institution":"","degree":"","field":"","startDate":"","endDate":""}],"skills":[{"name":"","level":"","category":""}],"languages":[{"name":"","level":""}],"certifications":[{"name":"","issuer":"","date":""}],"projects":[{"name":"","description":"","link":""}]}
Extrae solo información presente en el documento. Si un dato no aparece, usa una cadena o lista vacía. Normaliza las fechas de experiencia, educación y certificaciones al formato YYYY-MM cuando sea posible. Mantén el idioma original del CV."#;
    let user = format!("Texto del currículum:\n\n{text}");
    let v = ask_json(&base_url, &api_key, &model, system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar el currículum: {e}"))
}

#[tauri::command]
pub async fn generate_cv(
    base_url: String,
    api_key: String,
    model: String,
    cv_data: CvData,
    offer: JobOfferStructured,
    language: String,
) -> Result<GeneratedCv, String> {
    let lang_instruction = if language.trim().is_empty() {
        "Mantén el idioma en que esté redactado el perfil del candidato, traduciendo también los títulos de los puestos, la formación académica, las certificaciones y los proyectos."
            .to_string()
    } else {
        format!(
            "Redacta el currículum completo en {language}. Traduce TODOS los campos a {language}: el resumen, el título del puesto (jobTitle), el cargo de cada experiencia (role), las descripciones de experiencia, la formación académica (degree, field e institution), las certificaciones, los proyectos y los idiomas. Conserva los nombres propios de empresas e instituciones tal cual."
        )
    };
    let mut system = r#"Eres un redactor de currículums experto y optimizador ATS. Recibes (1) el perfil completo del candidato y (2) una oferta de trabajo. Crea un currículum especializado y enfocado en esa oferta: reescribe el resumen profesional y las descripciones de experiencia para resaltar los logros y habilidades más relevantes al puesto, reordena y prioriza las competencias. NO inventes experiencia que no exista; solo adapta y enfatiza lo que ya tiene el candidato. Responde SIEMPRE con JSON válido con exactamente esta estructura, sin texto adicional:
{"fullName":"","jobTitle":"","email":"","phone":"","location":"","linkedin":"","website":"","summary":"","experiences":[{"company":"","role":"","location":"","startDate":"","endDate":"","current":false,"description":[""]}],"education":[{"institution":"","degree":"","field":"","startDate":"","endDate":""}],"skills":[""],"languages":[{"name":"","level":""}],"certifications":[{"name":"","issuer":"","date":""}],"projects":[{"name":"","description":"","link":""}]}
En el campo "description" de cada experiencia escribe de 2 a 5 logros o responsabilidades como lista de viñetas (array de strings), sin prosa. "#.to_string();
    system.push_str(&lang_instruction);
    let user = format!(
        "Perfil del candidato:\n{}\n\nOferta de trabajo:\n{}\n\nGenera el currículum especializado.",
        serde_json::to_string_pretty(&cv_data).unwrap_or_default(),
        serde_json::to_string_pretty(&offer).unwrap_or_default()
    );
    let v = ask_json(&base_url, &api_key, &model, &system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar el currículum: {e}"))
}

#[tauri::command]
pub async fn generate_cover_letter(
    base_url: String,
    api_key: String,
    model: String,
    cv_data: CvData,
    offer: JobOfferStructured,
    language: String,
) -> Result<CoverLetter, String> {
    let lang_instruction = if language.trim().is_empty() {
        "Mantén el idioma en que esté redactado el perfil.".to_string()
    } else {
        format!("Redacta la carta completa en {language}.")
    };
    let mut system = r#"Eres un redactor de cartas de presentación. Recibes (1) el perfil del candidato y (2) una oferta de trabajo. Redacta una carta de presentación concisa y personalizada que conecte la experiencia del candidato con los requisitos del puesto. Responde SIEMPRE con JSON válido con exactamente esta estructura, sin texto adicional:
{"subject":"","greeting":"","body":"","closing":""}
El campo "body" contiene los párrafos de la carta separados por doble salto de línea. "#.to_string();
    system.push_str(&lang_instruction);
    let user = format!(
        "Perfil del candidato:\n{}\n\nOferta de trabajo:\n{}\n\nRedacta la carta de presentación.",
        serde_json::to_string_pretty(&cv_data).unwrap_or_default(),
        serde_json::to_string_pretty(&offer).unwrap_or_default()
    );
    let v = ask_json(&base_url, &api_key, &model, &system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar la carta: {e}"))
}

#[tauri::command]
pub async fn generate_technical_test(
    base_url: String,
    api_key: String,
    model: String,
    offer: JobOfferStructured,
    question_count: String,
    difficulty: String,
    estimated_time: String,
) -> Result<TechnicalTest, String> {
    let system = test_system_prompt(&question_count, &difficulty, &estimated_time);
    let user = format!(
        "Oferta de trabajo:\n{}\n\nCrea la prueba técnica de práctica.",
        serde_json::to_string_pretty(&offer).unwrap_or_default()
    );
    let v = ask_json(&base_url, &api_key, &model, &system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar la prueba técnica: {e}"))
}

#[tauri::command]
pub async fn generate_test_from_topic(
    base_url: String,
    api_key: String,
    model: String,
    topic: String,
) -> Result<TechnicalTest, String> {
    let system = test_system_prompt("", "", "");
    let user = format!(
        "Crea una prueba técnica de práctica sobre el siguiente tema/puesto:\n\n{topic}"
    );
    let v = ask_json(&base_url, &api_key, &model, &system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar la prueba técnica: {e}"))
}

fn test_system_prompt(question_count: &str, difficulty: &str, estimated_time: &str) -> String {
    let mut system = String::from(
        r#"Eres un entrevistador técnico senior. Crea una prueba técnica realista para practicar, con preguntas variadas y un nivel adecuado al puesto/tema indicado. Responde SIEMPRE con JSON válido con exactamente esta estructura, sin texto adicional:
{"title":"","estimatedTime":"","instructions":"","questions":[{"questionType":"single_choice","question":"","options":[],"correctAnswers":[],"hint":"","explanation":""}]}

Reglas para las preguntas:
- "questionType" debe ser uno de: "single_choice" (una sola respuesta correcta), "multiple_choice" (varias correctas), "true_false", "short_answer" o "coding".
- Para "single_choice" y "multiple_choice": incluye entre 3 y 5 opciones en "options" y las respuestas correctas (el texto exacto de la opción) en "correctAnswers".
- Para "true_false": "options" debe ser ["Verdadero","Falso"] y "correctAnswers" una de las dos.
- Para "short_answer": deja "options" vacío y pon la respuesta de referencia en "correctAnswers" (una entrada).
- Para "coding": describe el enunciado en "question" y pon una posible solución en "correctAnswers".
- "explanation" explica brevemente por qué la respuesta es correcta.
- "hint" es una pista opcional (puede ser "").
Incluye al menos una pregunta de tipo "coding". "#,
    );

    if question_count.trim().is_empty() {
        system.push_str("Incluye de 5 a 8 preguntas variadas (mezcla tipos). ");
    } else {
        system.push_str(&format!(
            "Incluye exactamente {question_count} preguntas variadas (mezcla tipos). "
        ));
    }

    if !difficulty.trim().is_empty() {
        system.push_str(&format!("El nivel de dificultad debe ser: {difficulty}. "));
    }

    if !estimated_time.trim().is_empty() {
        system.push_str(&format!(
            "La duración estimada total debe ser de {estimated_time} minutos y reflejarla en el campo \"estimatedTime\". "
        ));
    }

    system.push_str("Mantén el idioma en que esté redactada la oferta o el tema.");
    system
}

#[tauri::command]
pub async fn analyze_ats(
    base_url: String,
    api_key: String,
    model: String,
    cv_data: CvData,
    offer: JobOfferStructured,
) -> Result<AtsAnalysis, String> {
    let system = r#"Eres un analista de reclutamiento especializado en sistemas ATS. Compara el perfil del candidato con una oferta de trabajo y evalúa su encaje. Responde SIEMPRE con JSON válido con exactamente esta estructura, sin texto adicional:
{"score":0,"matchedKeywords":[],"missingKeywords":[],"suggestions":[]}
"score" es un entero de 0 a 100. "matchedKeywords" son palabras clave de la oferta presentes en el perfil. "missingKeywords" son palabras clave importantes de la oferta que faltan en el perfil. "suggestions" son recomendaciones concretas (3-5) para mejorar el encaje. Mantén el idioma en que esté redactada la oferta."#;
    let user = format!(
        "Perfil del candidato:\n{}\n\nOferta de trabajo:\n{}\n\nAnaliza el encaje ATS.",
        serde_json::to_string_pretty(&cv_data).unwrap_or_default(),
        serde_json::to_string_pretty(&offer).unwrap_or_default()
    );
    let v = ask_json(&base_url, &api_key, &model, system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar el análisis: {e}"))
}

#[tauri::command]
pub async fn evaluate_answer(
    base_url: String,
    api_key: String,
    model: String,
    question: TestQuestion,
    user_answer: String,
) -> Result<AnswerEvaluation, String> {
    let system = r#"Eres un evaluador experto de respuestas en pruebas técnicas. Recibes una pregunta, una respuesta de referencia y la respuesta del usuario. Evalúa si la respuesta del usuario es correcta o equivalente a la referencia: permite variaciones de redacción equivalentes y sinónimos, y para código comprueba que sea correcto y resuelva lo pedido. Responde SIEMPRE con JSON válido con exactamente esta estructura, sin texto adicional:
{"correct":true,"feedback":""}
"correct" es un booleano. "feedback" es una explicación breve (1-3 frases) de por qué la respuesta es correcta o incorrecta, en el idioma de la pregunta."#;
    let reference = if question.correct_answers.is_empty() {
        "(sin respuesta de referencia)".to_string()
    } else {
        question.correct_answers.join("\n")
    };
    let user = format!(
        "Pregunta:\n{}\n\nRespuesta de referencia:\n{}\n\nRespuesta del usuario:\n{}\n\nEvalúa si la respuesta del usuario es correcta.",
        question.question, reference, user_answer
    );
    let v = ask_json(&base_url, &api_key, &model, system, &user).await?;
    serde_json::from_value(v).map_err(|e| format!("No se pudo interpretar la evaluación: {e}"))
}

#[tauri::command]
pub fn save_file(path: String, bytes: Vec<u8>) -> Result<String, String> {
    std::fs::write(&path, bytes).map_err(|e| format!("No se pudo escribir el archivo: {e}"))?;
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::parse_json_lenient;

    #[test]
    fn parses_clean_json() {
        let v = parse_json_lenient(r#"{"a": 1, "b": "x"}"#).unwrap();
        assert_eq!(v["a"], 1);
    }

    #[test]
    fn parses_markdown_fences() {
        let v = parse_json_lenient("```json\n{\"a\": 1}\n```").unwrap();
        assert_eq!(v["a"], 1);
    }

    #[test]
    fn recovers_duplicated_prefix() {
        // Caso real: el modelo emitió un prefijo corrupto/duplicado.
        let v = parse_json_lenient(
            r#"{ "full{ "fullName": "Luis", "skills": ["Python"], "projects": [] }"#,
        )
        .unwrap();
        assert_eq!(v["fullName"], "Luis");
        assert_eq!(v["skills"][0], "Python");
    }

    #[test]
    fn parses_with_surrounding_text() {
        let v = parse_json_lenient("Aquí está el resultado: {\"ok\": true} ¡listo!").unwrap();
        assert_eq!(v["ok"], true);
    }
}
