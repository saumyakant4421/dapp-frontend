export interface Company {
  company_name: string;
  official_email: string;
  website: string;
  linkedin?: string;
  proof_url?: string;
}

export interface CompanyCheckResponse {
  success: boolean;
  verified?: boolean;
  pending?: boolean;
  exists?: boolean;
  message?: string;
}

export interface CompanySubmitResponse {
  success: boolean;
  request_id?: string;
  message?: string;
}