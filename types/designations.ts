export interface Designation {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  order: number;
  created_at: string;
  updated_at: string;
  parent?: {
    id: string;
    name: string;
  };
  children?: Designation[];
}

export interface DesignationFormData {
  name: string;
  parent_id: string | null;
  order: number;
}

export interface DesignationErrors {
  name?: string;
  parent_id?: string;
  order?: string;
  general?: string;
}

export interface DesignationTreeNode extends Designation {
  children: DesignationTreeNode[];
  isExpanded?: boolean;
} 