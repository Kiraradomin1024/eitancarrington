export type Role = "pending" | "contributor" | "admin";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
};

export type Character = {
  id: string;
  name: string;
  age: number | null;
  bio: string | null;
  background: string | null;
  photo_url: string | null;
  traits: string[];
  is_main: boolean;
  updated_at: string;
};

export type NpcStatus = "alive" | "dead" | "missing" | "unknown";
export type Npc = {
  id: string;
  name: string;
  photo_url: string | null;
  description: string | null;
  age: number | null;
  family: string | null;
  neighborhood: string | null;
  occupation: string | null;
  status: NpcStatus;
  tags: string[];
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

export type Day = {
  id: string;
  date: string;
  day_number: number | null;
  title: string;
  summary: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvestigationStatus = "open" | "in_progress" | "closed" | "cold";
export type Investigation = {
  id: string;
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

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  low: "Mineur",
  medium: "Moyen",
  high: "Important",
  critical: "Critique",
};
