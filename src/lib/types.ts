export type Role = "pending" | "contributor" | "admin";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type Character = {
  id: string;
  name: string;
  age: number | null;
  bio: string | null;
  background: string | null;
  photo_url: string | null;
  traits: string[];
  twitch_username: string | null;
  is_main: boolean;
  updated_at: string;
};

export type NpcStatus = "alive" | "dead" | "missing" | "unknown";
export type Npc = {
  id: string;
  slug: string | null;
  name: string;
  photo_url: string | null;
  description: string | null;
  age: number | null;
  family: string | null;
  neighborhood: string | null;
  occupation: string | null;
  status: NpcStatus;
  tags: string[];
  twitch_username: string | null;
  phone_number: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RelationType =
  | "family"
  | "friend"
  | "enemy"
  | "romance"
  | "business"
  | "contact"
  | "rival"
  | "mentor"
  | "colleague"
  | "other";

export type Relation = {
  id: string;
  source_npc_id: string | null; // null = main character (Eitan)
  target_npc_id: string;
  type: RelationType;
  intensity: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type Chapter = {
  id: string;
  number: number;
  title: string;
  subtitle: string | null;
  slug: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Day = {
  id: string;
  slug: string | null;
  date: string;
  day_number: number | null;
  title: string;
  summary: string | null;
  content: string | null;
  vod_url: string | null;
  chapter_id: string | null;
  pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvestigationStatus = "open" | "in_progress" | "closed" | "cold";
export type Investigation = {
  id: string;
  slug: string | null;
  title: string;
  status: InvestigationStatus;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Clue = {
  id: string;
  investigation_id: string;
  content: string;
  image_url: string | null;
  found_at: string | null;
  created_by: string | null;
};

export type IssueStatus = "active" | "resolved" | "paused";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type Issue = {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  severity: IssueSeverity;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const RELATION_LABELS: Record<RelationType, string> = {
  family: "Famille",
  friend: "Ami",
  enemy: "Ennemi",
  romance: "Romance",
  business: "Affaires",
  contact: "Contact",
  rival: "Rival",
  mentor: "Mentor",
  colleague: "Collègue",
  other: "Autre",
};

export const STATUS_LABELS: Record<NpcStatus, string> = {
  alive: "En vie",
  dead: "Décédé",
  missing: "Disparu",
  unknown: "Inconnu",
};

export const INVESTIGATION_STATUS_LABELS: Record<InvestigationStatus, string> = {
  open: "Ouverte",
  in_progress: "En cours",
  closed: "Résolue",
  cold: "Au point mort",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  active: "Actif",
  resolved: "Résolu",
  paused: "En pause",
};

export type MapCategory = "home" | "work" | "important" | "danger" | "other";
export type MapMarkerPerson = {
  npc_id: string | null;
  character_id: string | null;
};
export type MapMarker = {
  id: string;
  label: string;
  description: string | null;
  category: MapCategory;
  x: number;
  y: number;
  color: string | null;
  investigation_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  people: MapMarkerPerson[];
};

export const MAP_CATEGORY_LABELS: Record<MapCategory, string> = {
  home: "Domicile",
  work: "Travail",
  important: "Important",
  danger: "Danger",
  other: "Autre",
};

export const MAP_CATEGORY_COLORS: Record<MapCategory, string> = {
  home: "#3b82f6",
  work: "#10b981",
  important: "#f59e0b",
  danger: "#ef4444",
  other: "#a855f7",
};

export type QuizOption = "a" | "b" | "c" | "d";
export type QuizQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: QuizOption;
  category: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type QuizAttempt = {
  id: string;
  user_id: string;
  question_id: string;
  chosen_option: QuizOption;
  is_correct: boolean;
  answered_at: string;
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  low: "Mineur",
  medium: "Moyen",
  high: "Important",
  critical: "Critique",
};
