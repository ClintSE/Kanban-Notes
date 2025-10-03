export type Card = {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  position: number;
  created_at?: string;
};

export type Column = {
  id: string;
  title: string;
  position: number;
};
