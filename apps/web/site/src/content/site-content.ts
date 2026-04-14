type Locale = 'en' | 'es';

type SiteCopy = {
  cta: string;
  description: string;
  eyebrow: string;
  hero: string;
  methodologyCta: string;
  title: string;
};

const siteContent: Record<Locale, SiteCopy> = {
  en: {
    eyebrow: 'Integrated AI execution system',
    title: 'Themis gives developers and AI agents the same operational surface.',
    description:
      'A developer-native task system that keeps structured context, agent communication, and execution visibility in one calm workspace.',
    hero: 'Designed for teams that want code agents to work with clear structure, shared context, and visual accountability instead of opaque automation.',
    methodologyCta: 'Read the workflow model',
    cta: 'Open /app',
  },
  es: {
    eyebrow: 'Sistema de ejecución con IA integrada',
    title: 'Themis reúne a developers y agentes de IA en la misma superficie operativa.',
    description:
      'Un sistema de trabajo para developers que reúne contexto estructurado, comunicación con agentes y visibilidad de ejecución en una sola superficie clara.',
    hero: 'Pensado para equipos que quieren que los agentes de código trabajen con estructura clara, contexto compartido y visibilidad real, no con automatización opaca.',
    methodologyCta: 'Leer el modelo operativo',
    cta: 'Abrir /app',
  },
};

const getSiteContent = (locale: Locale) => siteContent[locale];

export type { Locale, SiteCopy };
export { getSiteContent };
