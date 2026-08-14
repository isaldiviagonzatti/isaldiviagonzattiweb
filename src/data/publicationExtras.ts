import citiesPdf from '../assets/publications/2022_Cities.pdf?url';
import oceanPdf from '../assets/publications/2024_npjOS.pdf?url';

interface PublicationExtra {
  note?: string;
  links?: Array<{
    label: string;
    href: string;
  }>;
}

export const publicationExtras: Record<string, PublicationExtra> = {
  '10.1038/s44183-024-00082-6': {
    links: [
      { label: 'PDF', href: oceanPdf },
      { label: 'OSF', href: 'https://doi.org/10.17605/OSF.IO/7P3ED' }
    ]
  },
  '10.1016/j.cities.2022.104038': {
    note: 'This publication originated from my BSc thesis',
    links: [{ label: 'PDF', href: citiesPdf }]
  }
};
