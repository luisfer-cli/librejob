import { Injectable, signal } from "@angular/core";
import { DbService } from "./db.service";

export type Lang = "es" | "en";

const MESSAGES: Record<string, Record<Lang, string>> = {
  // ---- Navegación ----
  "nav.principal": { es: "Principal", en: "Main" },
  "nav.manage": { es: "Gestión", en: "Manage" },
  "nav.system": { es: "Sistema", en: "System" },
  "nav.dashboard": { es: "Resumen", en: "Dashboard" },
  "nav.cv": { es: "Mi Currículum", en: "My Resume" },
  "nav.offers": { es: "Ofertas", en: "Offers" },
  "nav.tests": { es: "Pruebas técnicas", en: "Tests" },
  "nav.settings": { es: "Ajustes", en: "Settings" },
  "theme.light": { es: "Modo claro", en: "Light mode" },
  "theme.dark": { es: "Modo oscuro", en: "Dark mode" },
  "theme.toggle": { es: "Cambiar tema", en: "Change theme" },
  "nav.showMenu": { es: "Mostrar menú (Ctrl+Shift+B)", en: "Show menu (Ctrl+Shift+B)" },
  "nav.collapse": { es: "Colapsar (Ctrl+B)", en: "Collapse (Ctrl+B)" },
  "nav.expand": { es: "Expandir (Ctrl+B)", en: "Expand (Ctrl+B)" },

  // ---- Común ----
  "common.cancel": { es: "Cancelar", en: "Cancel" },
  "common.save": { es: "Guardar", en: "Save" },
  "common.saving": { es: "Guardando...", en: "Saving..." },
  "common.delete": { es: "Eliminar", en: "Delete" },
  "common.edit": { es: "Editar", en: "Edit" },
  "common.export": { es: "Exportar", en: "Export" },
  "common.view": { es: "Ver", en: "View" },
  "common.back": { es: "Atrás", en: "Back" },
  "common.next": { es: "Siguiente", en: "Next" },
  "common.generating": { es: "Generando...", en: "Generating..." },
  "common.loading": { es: "Cargando...", en: "Loading..." },
  "common.processing": { es: "Procesando...", en: "Processing..." },
  "common.testing": { es: "Probando...", en: "Testing..." },
  "common.close": { es: "Cerrar", en: "Close" },
  "common.confirm": { es: "Confirmar", en: "Confirm" },

  // ---- Estados de oferta ----
  "status.guardada": { es: "Guardada", en: "Saved" },
  "status.aplicada": { es: "Aplicada", en: "Applied" },
  "status.entrevista": { es: "Entrevista", en: "Interview" },
  "status.oferta": { es: "Oferta", en: "Offer" },
  "status.rechazada": { es: "Rechazada", en: "Rejected" },

  // ---- Tipos de pregunta ----
  "qtype.single_choice": { es: "Opción única", en: "Single choice" },
  "qtype.multiple_choice": { es: "Selección múltiple", en: "Multiple choice" },
  "qtype.true_false": { es: "Verdadero / Falso", en: "True / False" },
  "qtype.short_answer": { es: "Respuesta corta", en: "Short answer" },
  "qtype.coding": { es: "Programación", en: "Coding" },

  // ---- Dashboard ----
  "dashboard.title": { es: "Resumen", en: "Dashboard" },
  "dashboard.newOffer": { es: "Nueva oferta", en: "New offer" },
  "dashboard.total": { es: "Ofertas totales", en: "Total offers" },
  "dashboard.interviews": { es: "En entrevista", en: "In interview" },
  "dashboard.received": { es: "Ofertas recibidas", en: "Offers received" },
  "dashboard.applied": { es: "Aplicadas", en: "Applied" },
  "dashboard.dragHint": {
    es: "Arrastra las tarjetas entre columnas para actualizar el estado.",
    en: "Drag cards between columns to update their status.",
  },
  "dashboard.empty": { es: "Sin ofertas", en: "No offers" },
  "dashboard.context.next": { es: "Enviar a la siguiente fase", en: "Move to next phase" },
  "dashboard.context.rejected": { es: "Enviar a rechazada", en: "Move to rejected" },
  "dashboard.context.delete": { es: "Eliminar oferta", en: "Delete offer" },

  // ---- Ofertas ----
  "offers.title": { es: "Ofertas de trabajo", en: "Job offers" },
  "offers.new": { es: "Nueva oferta", en: "New offer" },
  "offers.pasteDesc": {
    es: "Pega el texto de la oferta copiado desde tu navegador. La IA extraerá los datos.",
    en: "Paste the job offer text copied from your browser. The AI will extract the data.",
  },
  "offers.pastePlaceholder": {
    es: "Pega aquí el contenido completo de la oferta de trabajo...",
    en: "Paste the full job offer content here...",
  },
  "offers.process": { es: "Procesar con IA", en: "Process with AI" },
  "offers.save": { es: "Guardar oferta", en: "Save offer" },
  "offers.extracted": { es: "Datos extraídos", en: "Extracted data" },
  "offers.field.title": { es: "Título", en: "Title" },
  "offers.field.company": { es: "Empresa", en: "Company" },
  "offers.field.location": { es: "Ubicación", en: "Location" },
  "offers.field.salary": { es: "Salario", en: "Salary" },
  "offers.field.jobType": { es: "Tipo de contrato", en: "Contract type" },
  "offers.field.seniority": { es: "Seniority", en: "Seniority" },
  "offers.field.url": { es: "URL de aplicación", en: "Application URL" },
  "offers.field.requirements": { es: "Requisitos", en: "Requirements" },
  "offers.field.responsibilities": { es: "Responsabilidades", en: "Responsibilities" },
  "offers.empty": {
    es: "Aún no hay ofertas. Pega tu primera oferta para empezar.",
    en: "No offers yet. Paste your first offer to get started.",
  },
  "offers.noTitle": { es: "Sin título", en: "Untitled" },

  // ---- Errores ----
  "error.configureAi": {
    es: "Configura tu proveedor de IA y API key en Ajustes primero.",
    en: "Configure your AI provider and API key in Settings first.",
  },
  "error.pasteFirst": { es: "Pega el texto de la oferta primero.", en: "Paste the offer text first." },
  "error.titleOrCompany": {
    es: "Introduce al menos el título o la empresa.",
    en: "Enter at least the title or the company.",
  },

  // ---- Confirmaciones ----
  "confirm.deleteOffer": {
    es: "¿Eliminar esta oferta y todo lo generado para ella (CVs, cartas y pruebas)?",
    en: "Delete this offer and everything generated for it (CVs, letters and tests)?",
  },
  "confirm.deleteOfferTitle": { es: "Eliminar oferta", en: "Delete offer" },
  "confirm.deleteCv": { es: "¿Eliminar este CV generado?", en: "Delete this generated CV?" },
  "confirm.deleteCvTitle": { es: "Eliminar CV", en: "Delete CV" },
  "confirm.deleteTest": { es: "¿Eliminar esta prueba técnica?", en: "Delete this technical test?" },
  "confirm.deleteTestTitle": { es: "Eliminar prueba", en: "Delete test" },
  "confirm.deleteTitle": { es: "Eliminar", en: "Delete" },
  "confirm.deleteItem": { es: "¿Eliminar {item}?", en: "Delete {item}?" },
  "item.experience": { es: "esta experiencia", en: "this experience" },
  "item.education": { es: "esta formación", en: "this education" },
  "item.skill": { es: "esta competencia", en: "this skill" },
  "item.language": { es: "este idioma", en: "this language" },
  "item.certification": { es: "esta certificación", en: "this certification" },
  "item.project": { es: "este proyecto", en: "this project" },

  // ---- Detalle de oferta ----
  "offer.notFound": { es: "Oferta no encontrada.", en: "Offer not found." },
  "offer.backToOffers": { es: "Volver a ofertas", en: "Back to offers" },
  "offer.status": { es: "Estado", en: "Status" },
  "offer.aiTools": { es: "Herramientas IA", en: "AI tools" },
  "offer.aiToolsDesc": {
    es: "Genera contenido adaptado a esta oferta.",
    en: "Generate content tailored to this offer.",
  },
  "offer.cvTile": { es: "Generar CV especializado", en: "Generate tailored CV" },
  "offer.cvTileDesc": { es: "Adapta tu currículum a esta oferta", en: "Tailor your resume to this offer" },
  "offer.letterTile": { es: "Carta de presentación", en: "Cover letter" },
  "offer.letterTileDesc": { es: "Redacta una carta personalizada", en: "Write a personalized letter" },
  "offer.testTile": { es: "Prueba técnica", en: "Technical test" },
  "offer.testTileDesc": { es: "Genera una prueba de práctica", en: "Generate a practice test" },
  "offer.atsTile": { es: "Análisis ATS", en: "ATS analysis" },
  "offer.atsTileDesc": { es: "Evalúa tu encaje con la oferta", en: "Assess your fit for the offer" },
  "offer.details": { es: "Detalles de la oferta", en: "Offer details" },
  "offer.type": { es: "Tipo:", en: "Type:" },
  "offer.url": { es: "URL:", en: "URL:" },
  "offer.requirements": { es: "Requisitos", en: "Requirements" },
  "offer.responsibilities": { es: "Responsabilidades", en: "Responsibilities" },
  "offer.notes": { es: "Notas", en: "Notes" },
  "offer.notesDesc": {
    es: "Detalles y recordatorios sobre esta oferta",
    en: "Details and reminders about this offer",
  },
  "offer.notesPlaceholder": {
    es: "Escribe aquí cualquier detalle importante: salario negociado, contactos, fechas, etc.",
    en: "Write any important details here: negotiated salary, contacts, dates, etc.",
  },
  "offer.saveNotes": { es: "Guardar notas", en: "Save notes" },
  "offer.notesSaved": { es: "Notas guardadas.", en: "Notes saved." },
  "offer.atsFit": { es: "Encaje con la oferta", en: "Fit for the offer" },
  "offer.atsScore": {
    es: "Puntuación estimada de 0 a 100.",
    en: "Estimated score from 0 to 100.",
  },
  "offer.atsMatched": { es: "Keywords presentes", en: "Matched keywords" },
  "offer.atsMissing": { es: "Keywords que faltan", en: "Missing keywords" },
  "offer.atsSuggestions": { es: "Sugerencias", en: "Suggestions" },
  "offer.cvsTitle": { es: "CVs generados", en: "Generated CVs" },
  "offer.cvCount": { es: "CV(s)", en: "CV(s)" },
  "offer.exportPdf": { es: "Exportar PDF", en: "Export PDF" },
  "offer.letter.subject": { es: "Asunto:", en: "Subject:" },
  "offer.takeTest": { es: "Hacer prueba interactiva", en: "Take interactive test" },
  "offer.estTime": { es: "Tiempo estimado:", en: "Estimated time:" },
  "offer.questions": { es: "pregunta(s)", en: "question(s)" },
  "offer.cvExported": { es: "CV exportado correctamente en {path}", en: "CV exported successfully to {path}" },
  "offer.letterExported": { es: "Carta exportada correctamente en {path}", en: "Letter exported successfully to {path}" },
  "offer.cvSaved": { es: "CV guardado.", en: "CV saved." },

  // ---- Busy ----
  "busy.cv": { es: "Generando CV...", en: "Generating CV..." },
  "busy.letter": { es: "Generando carta...", en: "Generating letter..." },
  "busy.test": { es: "Generando prueba técnica...", en: "Generating technical test..." },
  "busy.ats": { es: "Analizando encaje ATS...", en: "Analyzing ATS fit..." },
  "busy.pdf": { es: "Generando PDF...", en: "Generating PDF..." },

  // ---- Modal CV (generar) ----
  "cvmodal.title": { es: "Generar CV especializado", en: "Generate tailored CV" },
  "cvmodal.desc": {
    es: "Adapta tu currículum a esta oferta eligiendo el idioma de salida.",
    en: "Tailor your resume to this offer by choosing the output language.",
  },
  "cvmodal.offer": { es: "Oferta", en: "Offer" },
  "cvmodal.language": { es: "Idioma del CV", en: "CV language" },
  "cvmodal.generate": { es: "Generar", en: "Generate" },

  // ---- Modal carta ----
  "lettermodal.title": { es: "Carta de presentación", en: "Cover letter" },
  "lettermodal.desc": {
    es: "Redacta una carta personalizada eligiendo el idioma de salida.",
    en: "Write a personalized letter by choosing the output language.",
  },
  "lettermodal.language": { es: "Idioma de la carta", en: "Letter language" },

  // ---- Modal prueba ----
  "testmodal.title": { es: "Prueba técnica", en: "Technical test" },
  "testmodal.desc": {
    es: "Configura el tamaño y el nivel de la prueba de práctica.",
    en: "Configure the size and level of the practice test.",
  },
  "testmodal.count": { es: "Número de preguntas", en: "Number of questions" },
  "testmodal.level": { es: "Nivel", en: "Level" },
  "testmodal.duration": { es: "Duración estimada", en: "Estimated duration" },

  // ---- Opciones de prueba ----
  "test.auto58": { es: "Auto (5–8)", en: "Auto (5–8)" },
  "test.5q": { es: "5 preguntas", en: "5 questions" },
  "test.8q": { es: "8 preguntas", en: "8 questions" },
  "test.10q": { es: "10 preguntas", en: "10 questions" },
  "test.auto": { es: "Auto", en: "Auto" },
  "test.junior": { es: "Junior", en: "Junior" },
  "test.mid": { es: "Medio", en: "Mid" },
  "test.senior": { es: "Senior", en: "Senior" },
  "test.15m": { es: "15 minutos", en: "15 minutes" },
  "test.30m": { es: "30 minutos", en: "30 minutes" },
  "test.60m": { es: "60 minutos", en: "60 minutes" },

  // ---- Idiomas (selector de idioma del CV) ----
  "lang.auto": { es: "Auto (idioma del perfil)", en: "Auto (profile language)" },
  "lang.es": { es: "Español", en: "Spanish" },
  "lang.en": { es: "Inglés", en: "English" },
  "lang.fr": { es: "Francés", en: "French" },
  "lang.de": { es: "Alemán", en: "German" },
  "lang.it": { es: "Italiano", en: "Italian" },
  "lang.pt": { es: "Portugués", en: "Portuguese" },

  // ---- Editar CV ----
  "cvedit.title": { es: "Editar CV", en: "Edit CV" },
  "cvedit.fullName": { es: "Nombre completo", en: "Full name" },
  "cvedit.jobTitle": { es: "Título / Puesto", en: "Title / Role" },
  "cvedit.email": { es: "Email", en: "Email" },
  "cvedit.phone": { es: "Teléfono", en: "Phone" },
  "cvedit.location": { es: "Ubicación", en: "Location" },
  "cvedit.linkedin": { es: "LinkedIn", en: "LinkedIn" },
  "cvedit.website": { es: "Sitio web", en: "Website" },
  "cvedit.summary": { es: "Resumen", en: "Summary" },
  "cvedit.skills": { es: "Competencias (separadas por comas)", en: "Skills (comma-separated)" },
  "cvedit.experience": { es: "Experiencia", en: "Experience" },
  "cvedit.role": { es: "Cargo", en: "Role" },
  "cvedit.company": { es: "Empresa", en: "Company" },
  "cvedit.achievements": { es: "Logros (uno por línea)", en: "Achievements (one per line)" },
  "cvedit.education": { es: "Educación", en: "Education" },
  "cvedit.degree": { es: "Título", en: "Degree" },
  "cvedit.institution": { es: "Institución", en: "Institution" },
  "cvedit.field": { es: "Área", en: "Field" },
  "cvpreview.title": { es: "Vista previa del CV", en: "CV preview" },

  // ---- Carta (editar) ----
  "letter.subject": { es: "Asunto", en: "Subject" },
  "letter.greeting": { es: "Saludo", en: "Greeting" },
  "letter.body": {
    es: "Cuerpo (separa párrafos con una línea en blanco)",
    en: "Body (separate paragraphs with a blank line)",
  },
  "letter.closing": { es: "Despedida", en: "Closing" },

  // ---- Mi Currículum (wizard) ----
  "cvw.step.personal": { es: "Datos personales", en: "Personal details" },
  "cvw.step.experience": { es: "Experiencia", en: "Experience" },
  "cvw.step.education": { es: "Educación", en: "Education" },
  "cvw.step.skills": { es: "Competencias", en: "Skills" },
  "cvw.step.languages": { es: "Idiomas", en: "Languages" },
  "cvw.step.certs": { es: "Certificaciones", en: "Certifications" },
  "cvw.step.projects": { es: "Proyectos", en: "Projects" },
  "cvw.step.summary": { es: "Resumen", en: "Summary" },
  "cvw.title": { es: "Mi Currículum", en: "My Resume" },
  "cvw.subtitle": {
    es: "Completa los datos por pasos. Se usan para generar CVs especializados.",
    en: "Fill in the data step by step. Used to generate tailored CVs.",
  },
  "cvw.exportPdf": { es: "Guardar CV en PDF", en: "Save resume as PDF" },
  "cvw.fullName": { es: "Nombre completo", en: "Full name" },
  "cvw.jobTitle": { es: "Título / Puesto actual", en: "Current title / role" },
  "cvw.email": { es: "Email", en: "Email" },
  "cvw.phone": { es: "Teléfono", en: "Phone" },
  "cvw.location": { es: "Ubicación", en: "Location" },
  "cvw.linkedin": { es: "LinkedIn", en: "LinkedIn" },
  "cvw.website": { es: "Sitio web / Portfolio", en: "Website / Portfolio" },
  "cvw.professionalSummary": { es: "Resumen profesional", en: "Professional summary" },
  "cvw.experienceTitle": { es: "Experiencia laboral", en: "Work experience" },
  "cvw.noRole": { es: "Sin cargo", en: "No role" },
  "cvw.noCompany": { es: "Sin empresa", en: "No company" },
  "cvw.in": { es: "en", en: "at" },
  "cvw.current": { es: "Actualidad", en: "Present" },
  "cvw.noExperiences": { es: "Aún no has añadido experiencia.", en: "You haven't added any experience yet." },
  "cvw.editingExperience": { es: "Editando experiencia", en: "Editing experience" },
  "cvw.addExperience": { es: "Añadir experiencia", en: "Add experience" },
  "cvw.company": { es: "Empresa", en: "Company" },
  "cvw.role": { es: "Cargo", en: "Role" },
  "cvw.period": { es: "Periodo", en: "Period" },
  "cvw.start": { es: "Inicio (2020-01)", en: "Start (2020-01)" },
  "cvw.end": { es: "Fin (2024-06)", en: "End (2024-06)" },
  "cvw.currentRole": { es: "Puesto actual", en: "Current position" },
  "cvw.description": { es: "Descripción / logros", en: "Description / achievements" },
  "cvw.add": { es: "Añadir", en: "Add" },
  "cvw.saveChanges": { es: "Guardar cambios", en: "Save changes" },
  "cvw.noEducation": { es: "Aún no has añadido formación.", en: "You haven't added any education yet." },
  "cvw.editingEducation": { es: "Editando formación", en: "Editing education" },
  "cvw.addEducation": { es: "Añadir formación", en: "Add education" },
  "cvw.institution": { es: "Institución", en: "Institution" },
  "cvw.degree": { es: "Título", en: "Degree" },
  "cvw.field": { es: "Área de estudio", en: "Field of study" },
  "cvw.noSkills": { es: "Aún no has añadido competencias.", en: "You haven't added any skills yet." },
  "cvw.addSkill": { es: "Añadir competencia", en: "Add skill" },
  "cvw.skill": { es: "Competencia", en: "Skill" },
  "cvw.level": { es: "Nivel", en: "Level" },
  "cvw.category": { es: "Categoría", en: "Category" },
  "cvw.noLanguages": { es: "Aún no has añadido idiomas.", en: "You haven't added any languages yet." },
  "cvw.addLanguage": { es: "Añadir idioma", en: "Add language" },
  "cvw.language": { es: "Idioma", en: "Language" },
  "cvw.noCerts": { es: "Aún no has añadido certificaciones.", en: "You haven't added any certifications yet." },
  "cvw.addCert": { es: "Añadir certificación", en: "Add certification" },
  "cvw.name": { es: "Nombre", en: "Name" },
  "cvw.issuer": { es: "Emisor", en: "Issuer" },
  "cvw.date": { es: "Fecha", en: "Date" },
  "cvw.noProjects": { es: "Aún no has añadido proyectos.", en: "You haven't added any projects yet." },
  "cvw.addProject": { es: "Añadir proyecto", en: "Add project" },
  "cvw.link": { es: "Enlace", en: "Link" },
  "cvw.descriptionField": { es: "Descripción", en: "Description" },
  "cvw.done": { es: "¡Currículum guardado!", en: "Resume saved!" },
  "cvw.doneMsg": {
    es: "Tus datos están completos y guardados correctamente.",
    en: "Your data is complete and saved correctly.",
  },
  "cvw.goDashboard": { es: "Ir al resumen", en: "Go to dashboard" },
  "cvw.reviewHint": {
    es: "Revisa tu currículum. Estos datos se usarán para generar CVs especializados.",
    en: "Review your resume. This data will be used to generate tailored CVs.",
  },
  "cvw.summary.name": { es: "Nombre", en: "Name" },
  "cvw.summary.role": { es: "Puesto", en: "Role" },
  "cvw.summary.email": { es: "Email", en: "Email" },
  "cvw.summary.experience": { es: "Experiencia", en: "Experience" },
  "cvw.summary.positions": { es: "puesto(s)", en: "position(s)" },
  "cvw.summary.education": { es: "Educación", en: "Education" },
  "cvw.summary.records": { es: "registro(s)", en: "record(s)" },
  "cvw.summary.skills": { es: "Competencias", en: "Skills" },
  "cvw.summary.languages": { es: "Idiomas", en: "Languages" },
  "cvw.summary.certs": { es: "Certificaciones", en: "Certifications" },
  "cvw.summary.projects": { es: "Proyectos", en: "Projects" },
  "cvw.previous": { es: "Anterior", en: "Previous" },
  "cvw.next": { es: "Siguiente", en: "Next" },
  "cvw.finish": { es: "Guardar y finalizar", en: "Save and finish" },

  // ---- Pruebas ----
  "tests.title": { es: "Pruebas técnicas", en: "Technical tests" },
  "tests.new": { es: "Nueva prueba", en: "New test" },
  "tests.newTitle": { es: "Nueva prueba de práctica", en: "New practice test" },
  "tests.desc": {
    es: 'Escribe un puesto o tema (p. ej. "Backend Node.js mid-level") y la IA generará una prueba interactiva con distintos tipos de preguntas.',
    en: 'Write a role or topic (e.g. "Mid-level Node.js backend") and the AI will generate an interactive test with different question types.',
  },
  "tests.topic": { es: "Tema / puesto", en: "Topic / role" },
  "tests.topicPlaceholder": { es: "Ej. Frontend React senior", en: "E.g. Senior React frontend" },
  "tests.generate": { es: "Generar con IA", en: "Generate with AI" },
  "tests.errTopic": { es: "Escribe el tema o puesto de la prueba.", en: "Write the topic or role of the test." },
  "tests.standalone": { es: "Independiente", en: "Standalone" },
  "tests.fromOffer": { es: "De oferta", en: "From offer" },
  "tests.do": { es: "Hacer", en: "Take" },
  "tests.empty": {
    es: 'Aún no hay pruebas. Crea una desde aquí o usa el botón "Prueba técnica mágica" dentro de una oferta.',
    en: 'No tests yet. Create one here or use the "Magic technical test" button inside an offer.',
  },

  // ---- Tomar prueba ----
  "taketest.notFound": { es: "Prueba no encontrada.", en: "Test not found." },
  "taketest.back": { es: "Volver a pruebas", en: "Back to tests" },
  "taketest.title": { es: "Prueba técnica", en: "Technical test" },
  "taketest.estTime": { es: "Tiempo estimado:", en: "Estimated time:" },
  "taketest.instructions": { es: "Instrucciones", en: "Instructions" },
  "taketest.answered": { es: "{a} de {t} respondidas", en: "{a} of {t} answered" },
  "taketest.correct": { es: "Aciertos: {c}/{a} ({s}%)", en: "Correct: {c}/{a} ({s}%)" },
  "taketest.review": { es: "Revisar respuesta", en: "Check answer" },
  "taketest.deepReview": { es: "Revisar en profundidad", en: "Deep review" },
  "taketest.reviewing": { es: "Revisando...", en: "Reviewing..." },
  "taketest.showHint": { es: "Mostrar pista", en: "Show hint" },
  "taketest.correctLabel": { es: "Correcto", en: "Correct" },
  "taketest.incorrectLabel": { es: "Incorrecto", en: "Incorrect" },
  "taketest.hint": { es: "Pista:", en: "Hint:" },
  "taketest.answer": { es: "Respuesta:", en: "Answer:" },
  "taketest.shortPlaceholder": { es: "Escribe tu respuesta...", en: "Write your answer..." },
  "taketest.codePlaceholder": { es: "Escribe tu solución...", en: "Write your solution..." },
  "taketest.finish": { es: "Terminar y ver resultados", en: "Finish and see results" },
  "taketest.retry": { es: "Reintentar", en: "Retry" },
  "taketest.score": {
    es: "de aciertos en preguntas automáticas ({c}/{a})",
    en: "of correct answers in auto-graded questions ({c}/{a})",
  },

  // ---- Ajustes ----
  "settings.title": { es: "Ajustes", en: "Settings" },
  "settings.aiProvider": { es: "Proveedor de IA", en: "AI provider" },
  "settings.configured": { es: "Configurado", en: "Configured" },
  "settings.unconfigured": { es: "Sin configurar", en: "Not configured" },
  "settings.needsKey": {
    es: "Necesitas una API key para usar las herramientas de IA (generar CVs, cartas, pruebas y análisis ATS).",
    en: "You need an API key to use the AI tools (generate CVs, letters, tests and ATS analysis).",
  },
  "settings.configureAi": { es: "Configurar IA", en: "Configure AI" },
  "settings.changeConfig": { es: "Cambiar configuración", en: "Change configuration" },
  "settings.saved": { es: "Configuración guardada correctamente.", en: "Configuration saved successfully." },
  "settings.appearance": { es: "Apariencia", en: "Appearance" },
  "settings.language": { es: "Idioma", en: "Language" },
  "settings.wizard.title": { es: "Configurar proveedor de IA", en: "Configure AI provider" },
  "settings.wizard.provider": { es: "Proveedor", en: "Provider" },
  "settings.wizard.credentials": { es: "Credenciales", en: "Credentials" },
  "settings.wizard.model": { es: "Modelo", en: "Model" },
  "settings.wizard.verify": { es: "Verificar", en: "Verify" },
  "settings.wizard.chooseProvider": {
    es: "Elige el proveedor de IA que quieres usar.",
    en: "Choose the AI provider you want to use.",
  },
  "settings.wizard.enterCreds": {
    es: "Introduce la URL base y tu API key.",
    en: "Enter the base URL and your API key.",
  },
  "settings.wizard.baseUrl": { es: "URL base de la API", en: "API base URL" },
  "settings.wizard.apiKey": { es: "API key", en: "API key" },
  "settings.wizard.loadModels": {
    es: "Carga los modelos disponibles o escribe uno manualmente.",
    en: "Load the available models or type one manually.",
  },
  "settings.wizard.modelLabel": { es: "Modelo", en: "Model" },
  "settings.wizard.modelPlaceholder": {
    es: "Selecciona o escribe un modelo...",
    en: "Select or type a model...",
  },
  "settings.wizard.loadModelsBtn": { es: "Cargar modelos", en: "Load models" },
  "settings.wizard.modelsLoaded": { es: "Se cargaron {n} modelos.", en: "{n} models loaded." },
  "settings.wizard.verifyDesc": {
    es: "Comprueba que todo funciona antes de guardar.",
    en: "Check that everything works before saving.",
  },
  "settings.wizard.test": { es: "Probar conexión", en: "Test connection" },
  "settings.wizard.save": { es: "Guardar configuración", en: "Save configuration" },
  "settings.wizard.errBaseUrl": {
    es: "Introduce la URL base de la API.",
    en: "Enter the API base URL.",
  },
  "settings.wizard.errApiKey": { es: "Introduce la API key.", en: "Enter the API key." },
  "settings.wizard.errModel": {
    es: "Selecciona o escribe un modelo.",
    en: "Select or type a model.",
  },
  "settings.wizard.errModelFirst": {
    es: "Elige un modelo antes de probar la conexión.",
    en: "Choose a model before testing the connection.",
  },
  "settings.wizard.errModelsUrl": {
    es: "Introduce la URL base del proveedor.",
    en: "Enter the provider base URL.",
  },
  "settings.wizard.errModelsKey": { es: "Introduce la API key.", en: "Enter the API key." },
  "settings.wizard.localNoKey": {
    es: "Los proveedores locales no necesitan API key. Déjala vacía.",
    en: "Local providers don't need an API key. Leave it empty.",
  },

  // ---- Actualizaciones ----
  "updates.title": { es: "Actualizaciones", en: "Updates" },
  "updates.check": { es: "Buscar actualizaciones", en: "Check for updates" },
  "updates.checking": { es: "Comprobando actualizaciones...", en: "Checking for updates..." },
  "updates.upToDate": { es: "Estás al día.", en: "You're up to date." },
  "updates.available": { es: "Nueva versión disponible: {version}", en: "New version available: {version}" },
  "updates.install": { es: "Actualizar ahora", en: "Update now" },
  "updates.downloading": { es: "Descargando... {p}%", en: "Downloading... {p}%" },
  "updates.installed": { es: "Actualización instalada. Reiniciando...", en: "Update installed. Restarting..." },
  "updates.error": {
    es: "No se pudo comprobar las actualizaciones.",
    en: "Could not check for updates.",
  },
};

@Injectable({ providedIn: "root" })
export class I18nService {
  readonly lang = signal<Lang>("es");

  constructor(private db: DbService) {}

  async load(): Promise<void> {
    try {
      const raw = await this.db.getSettings();
      const l = raw["language"];
      if (l === "en" || l === "es") this.lang.set(l);
    } catch {
      // best-effort
    }
  }

  async setLanguage(lang: Lang): Promise<void> {
    this.lang.set(lang);
    try {
      await this.db.setSetting("language", lang);
    } catch {
      // best-effort
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const entry = MESSAGES[key];
    let s = entry ? (entry[this.lang()] ?? entry.es ?? key) : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replace(`{${k}}`, String(v));
      }
    }
    return s;
  }
}
