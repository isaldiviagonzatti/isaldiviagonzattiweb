import citiesPdf from '../assets/publications/2022_Cities.pdf?url';
import oceanPdf from '../assets/publications/2024_npjOS.pdf?url';
import eesPdf from '../assets/publications/2026_EES.pdf?url';
import erlPdf from '../assets/publications/2026_ERL.pdf?url';

interface PublicationExtra {
  links?: Array<{
    label: string;
    href: string;
    icon?: 'osf';
  }>;
}

export const publicationExtras: Record<string, PublicationExtra> = {
  '10.1039/d5ee04922a': {
    links: [{ label: 'PDF', href: eesPdf }]
  },
  '10.1088/1748-9326/ae2a52': {
    links: [{ label: 'PDF', href: erlPdf }]
  },
  '10.1038/s44183-024-00082-6': {
    links: [
      { label: 'PDF', href: oceanPdf },
      { label: 'OSF', href: 'https://doi.org/10.17605/OSF.IO/7P3ED', icon: 'osf' }
    ]
  },
  '10.1016/j.cities.2022.104038': {
    links: [{ label: 'PDF', href: citiesPdf }]
  }
};
