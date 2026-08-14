import records from './publications.json';

export interface PublicationAuthor {
  given: string;
  family: string;
  isOwner: boolean;
}

export interface Publication {
  doi: string;
  title: string;
  year: number;
  authors: PublicationAuthor[];
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  type: string;
}

export const publications = records satisfies Publication[];
