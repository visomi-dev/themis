type Locale = 'en' | 'es';

type SiteCopy = {
  cta: string;
  description: string;
  eyebrow: string;
  hero: string;
  title: string;
};

const siteContent: Record<Locale, SiteCopy> = {
  en: {
    eyebrow: 'Developer-native task system',
    title: 'Themis keeps task definition, execution, and context in one calm workspace.',
    description:
      'A monolith-ready product architecture for structured work, agent-readable context, and low-friction execution updates.',
    hero: 'Designed for engineering teams that want rigor without PM overhead.',
    cta: 'Open the implementation docs',
  },
  es: {
    eyebrow: 'Sistema de tareas para developers',
    title: 'Themis mantiene definicion, ejecucion y contexto en un espacio de trabajo sereno.',
    description:
      'Una arquitectura de producto preparada para monolito, con contexto legible por agentes y actualizaciones de ejecucion de baja friccion.',
    hero: 'Pensado para equipos de ingenieria que quieren rigor sin sobrecarga de gestion.',
    cta: 'Abrir la documentacion de implementacion',
  },
};

const getSiteContent = (locale: Locale) => siteContent[locale];

export type { Locale, SiteCopy };
export { getSiteContent };
